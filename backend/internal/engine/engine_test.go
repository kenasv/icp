// Внешний тестовый пакет: позволяет использовать хранилище с демо-данными
// (store -> engine) без цикла импортов.
package engine_test

import (
	"testing"
	"time"

	"isup/internal/engine"
	"isup/internal/model"
	"isup/internal/store"
)

// loadTestStore — хранилище с демо-данными (ключевой кейс: проект №2 с задержкой поставки).
func loadTestStore(t *testing.T) *store.Store {
	t.Helper()
	return store.New()
}

func d(y int, m time.Month, day int) time.Time { return model.NewDate(y, m, day) }

func findItem(t *testing.T, p *model.Project, id string) *model.WBSItem {
	t.Helper()
	for i := range p.WBS {
		if p.WBS[i].ID == id {
			return &p.WBS[i]
		}
	}
	t.Fatalf("элемент %s не найден", id)
	return nil
}

// Ф19/Ф29: задержка закупки каскадно сдвигает вехи и работы по FS-зависимостям.
func TestCascadeFromPurchaseDelay(t *testing.T) {
	s := loadTestStore(t)
	p := s.Projects["PRJ-2024-002"]

	// Прогноз поставки уже сдвинут на +21 день (15.03 → 05.04).
	pu := p.Purchases[0]
	if got := int(pu.ForecastDate.Sub(pu.PlanDate).Hours() / 24); got != 21 {
		t.Fatalf("сдвиг закупки = %d, ожидалось 21", got)
	}
	// Веха поставки следует прогнозу закупки.
	if got := findItem(t, p, "p2-m2").Start; !got.Equal(d(2024, 4, 5)) {
		t.Fatalf("веха поставки = %s, ожидалось 2024-04-05", got)
	}
	// Монтаж = поставка + лаг 3 (FS): 05.04 + 3 = 08.04 (+21 к плану 18.03).
	if got := findItem(t, p, "p2-m3").Start; !got.Equal(d(2024, 4, 8)) {
		t.Fatalf("веха монтажа = %s, ожидалось 2024-04-08", got)
	}
	// Пусконаладка (старт 19.03, финиш 28.04) сдвигается на +21: 09.04–19.05.
	w2 := findItem(t, p, "p2-w2")
	if !w2.Start.Equal(d(2024, 4, 9)) || !w2.End.Equal(d(2024, 5, 19)) {
		t.Fatalf("ПНР = %s..%s, ожидалось 2024-04-09..2024-05-19", w2.Start, w2.End)
	}
	// Приёмка: 19.05 + 2 = 21.05 (+21 к плану 30.04).
	if got := findItem(t, p, "p2-m4").Start; !got.Equal(d(2024, 5, 21)) {
		t.Fatalf("веха приёмки = %s, ожидалось 2024-05-21", got)
	}
}

// Контрольная проверка из требований 4.1.4: при сдвиге поставки на 4 недели
// вместо 3 все числа должны измениться (запрет хардкода результатов в UI).
func TestShiftFourWeeksChangesNumbers(t *testing.T) {
	s := loadTestStore(t)
	p := s.Projects["PRJ-2024-002"]
	dir := s.Dirs()

	before := engine.Compose(p, dir)

	// Сдвигаем прогноз поставки ещё на +7 дней (итого 05.04 → 12.04).
	q := engine.Clone(p)
	for i := range q.Purchases {
		q.Purchases[i].ForecastDate = q.Purchases[i].ForecastDate.AddDate(0, 0, 7)
	}
	after := engine.Compose(q, dir)

	// Веха монтажа: 08.04 → 15.04.
	if m := findRow(after.Schedule, "p2-m3"); m == nil || !m.Start.Equal(d(2024, 4, 15)) {
		t.Fatalf("веха монтажа после +28 дн.: %v, ожидалось 2024-04-15", findRow(after.Schedule, "p2-m3"))
	}
	// Веха приёмки: 21.05 → 28.05.
	if m := findRow(after.Schedule, "p2-m4"); m == nil || !m.Start.Equal(d(2024, 5, 28)) {
		t.Fatalf("веха приёмки после +28 дн.: %v, ожидалось 2024-05-28", findRow(after.Schedule, "p2-m4"))
	}
	// Отклонение от базового плана выросло: 21 → 28 дней.
	if after.Health.Schedule.DevDays != 28 {
		t.Fatalf("отклонение сроков после +28 дн. = %d, ожидалось 28", after.Health.Schedule.DevDays)
	}
	if before.Health.Schedule.DevDays != 21 {
		t.Fatalf("отклонение сроков до = %d, ожидался 21", before.Health.Schedule.DevDays)
	}
}

func findRow(rows []engine.WBSRow, id string) *engine.WBSRow {
	for i := range rows {
		if rows[i].ID == id {
			return &rows[i]
		}
	}
	return nil
}

// Ф22: GM по плану проекта №2 = 15% (12 млн выручки, 10,2 млн затрат).
func TestGMPlan(t *testing.T) {
	s := loadTestStore(t)
	pc := engine.Compose(s.Projects["PRJ-2024-002"], s.Dirs())
	if pc.Finance.GM.Plan < 0.1499 || pc.Finance.GM.Plan > 0.1501 {
		t.Fatalf("GM план = %.4f, ожидалось 0.15", pc.Finance.GM.Plan)
	}
	// Итоговый GM прогноз не меняется (сдвигаются только месяцы).
	if pc.Finance.GM.Forecast < 0.1499 || pc.Finance.GM.Forecast > 0.1501 {
		t.Fatalf("GM прогноз = %.4f, ожидалось 0.15", pc.Finance.GM.Forecast)
	}
	// Но помесячно — меняется: в плане апрель 6 млн выручки, в прогнозе 0.
	if pc.Finance.Revenue.Plan["2024-04"] != 6 {
		t.Fatalf("план выручки апреля = %v, ожидалось 6", pc.Finance.Revenue.Plan["2024-04"])
	}
	if pc.Finance.Revenue.Forecast["2024-04"] != 0 {
		t.Fatalf("прогноз выручки апреля = %v, ожидалось 0", pc.Finance.Revenue.Forecast["2024-04"])
	}
}

// Ф24: кассовый разрыв апреля в прогнозе проекта №2 (исходящие 5,5 без входящих).
func TestDDSCashGap(t *testing.T) {
	s := loadTestStore(t)
	pc := engine.Compose(s.Projects["PRJ-2024-002"], s.Dirs())
	found := false
	for _, m := range pc.Finance.DDS.Monthly {
		if m.Month == "2024-04" {
			found = true
			if m.Gap.Forecast < 5.49 || m.Gap.Forecast > 5.51 {
				t.Fatalf("разрыв апреля (прогноз) = %.2f, ожидалось 5.5", m.Gap.Forecast)
			}
			if m.Gap.Plan < -2.71 || m.Gap.Plan > -2.69 {
				t.Fatalf("разрыв апреля (план) = %.2f, ожидалось -2.7", m.Gap.Plan)
			}
		}
	}
	if !found {
		t.Fatal("апрель не найден в ДДС")
	}
}

// Ф32: здоровье проекта №2 — жёлтое из-за сдвига сроков на 21 день.
func TestHealthYellow(t *testing.T) {
	s := loadTestStore(t)
	pc := engine.Compose(s.Projects["PRJ-2024-002"], s.Dirs())
	if pc.Health.Overall != engine.ZoneYellow {
		t.Fatalf("здоровье = %s, ожидалось yellow (сдвиг 21 дн.)", pc.Health.Overall)
	}
	if pc.Health.Schedule.DevDays != 21 {
		t.Fatalf("сдвиг сроков = %d, ожидался 21", pc.Health.Schedule.DevDays)
	}
	// Проект №1 без отклонений — зелёный.
	pc1 := engine.Compose(s.Projects["PRJ-2024-001"], s.Dirs())
	if pc1.Health.Overall != engine.ZoneGreen {
		t.Fatalf("здоровье проекта №1 = %s, ожидалось green", pc1.Health.Overall)
	}
}

// Ф5: взвешенная воронка.
func TestFunnelWeighted(t *testing.T) {
	s := loadTestStore(t)
	var list []*model.Presale
	for _, ps := range s.Presales {
		list = append(list, ps)
	}
	fc := engine.ComputeFunnel(list, s.Stages)
	// ЦОД: 120 × 40% = 48; НЛМК: 65 × 60% = 39; 5G: 200 × 25% = 50.
	if fc.TotalCount != 8 {
		t.Fatalf("активных пресейлов = %d, ожидалось 8", fc.TotalCount)
	}
	want := 48.0 + 39.0 + 4.5 + 50.0 + 7.2 + 10.0 + 2.25 + 8.1
	if fc.TotalWeighted < want-0.01 || fc.TotalWeighted > want+0.01 {
		t.Fatalf("взвешенная воронка = %.2f, ожидалось %.2f", fc.TotalWeighted, want)
	}
}

// Ф20: превью влияния закупки считает затронутые задачи и вехи по графу.
func TestPreviewImpact(t *testing.T) {
	s := loadTestStore(t)
	p := s.Projects["PRJ-2024-002"]
	// Сдвиг поставки с 05.04 на 12.04 (ещё +7 дней): затронуты веха поставки,
	// веха монтажа, работа ПНР и веха приёмки.
	pr := engine.PreviewPurchaseImpact(p, "p2-pu1", d(2024, 4, 12))
	if pr.AffectedMilestones != 3 {
		t.Fatalf("затронутых вех = %d, ожидалось 3", pr.AffectedMilestones)
	}
	if pr.AffectedWorks != 1 {
		t.Fatalf("затронутых работ = %d, ожидалась 1", pr.AffectedWorks)
	}
}

// What-if песочница: сравнение трёх колонок (базовый план / прогноз / сценарий).
func TestScenarioEvaluation(t *testing.T) {
	s := loadTestStore(t)
	p := s.Projects["PRJ-2024-002"]
	comp := engine.EvaluateScenario(p, []model.ScenarioOp{
		{Kind: "shiftDuration", TargetID: "p2-w2", DurationDelta: -7},
		{Kind: "addCost", Article: "Работы", Amount: 0.5, Month: "2024-04"},
	})
	// Колонка «базовый план»: приёмка 30.04.
	if m := findMile(comp.Base, "p2-m4"); !m.Date.Equal(d(2024, 4, 30)) {
		t.Fatalf("базовый план: приёмка = %s, ожидалось 2024-04-30", m.Date)
	}
	// Колонка «текущий прогноз»: приёмка 21.05.
	if m := findMile(comp.Current, "p2-m4"); !m.Date.Equal(d(2024, 5, 21)) {
		t.Fatalf("прогноз: приёмка = %s, ожидалось 2024-05-21", m.Date)
	}
	// Сценарий: ПНР короче на 7 дней → приёмка 14.05; GM падает (доп. затраты 0,5).
	if m := findMile(comp.Scenario, "p2-m4"); !m.Date.Equal(d(2024, 5, 14)) {
		t.Fatalf("сценарий: приёмка = %s, ожидалось 2024-05-14", m.Date)
	}
	wantGM := (12.0 - 10.7) / 12.0
	if comp.Scenario.GM < wantGM-0.001 || comp.Scenario.GM > wantGM+0.001 {
		t.Fatalf("сценарий: GM = %.4f, ожидалось %.4f", comp.Scenario.GM, wantGM)
	}
}

func findMile(col engine.ScenarioColumn, id string) *engine.MilestoneCompare {
	for i := range col.KeyMilestones {
		if col.KeyMilestones[i].MilestoneID == id {
			return &col.KeyMilestones[i]
		}
	}
	return nil
}

// Ф34: автоматический расчёт влияния ЗИ (GM п.п., ДДС млн ₽).
func TestCRImpact(t *testing.T) {
	s := loadTestStore(t)
	gmPP, dds := engine.ComputeCRImpact(s.Projects["PRJ-2024-002"])
	if gmPP != 0 {
		t.Fatalf("влияние GM = %.2f п.п., ожидалось 0 (сдвиг только сроков)", gmPP)
	}
	// Худшее ухудшение кассового разрыва: апрель план −2,7 → прогноз +5,5 = +8,2.
	if dds < 8.19 || dds > 8.21 {
		t.Fatalf("влияние ДДС = %.2f, ожидалось 8.2", dds)
	}
}

// Ф3/Ф4: метрики этапов воронки.
func TestFunnelStages(t *testing.T) {
	s := loadTestStore(t)
	var list []*model.Presale
	for _, ps := range s.Presales {
		list = append(list, ps)
	}
	fc := engine.ComputeFunnel(list, s.Stages)
	if len(fc.Stages) != 5 {
		t.Fatalf("этапов воронки = %d, ожидалось 5", len(fc.Stages))
	}
	tkp := fc.Stages[2]
	if tkp.Name != "ТКП" || tkp.Count != 2 || tkp.Weighted != 48+10 {
		t.Fatalf("ТКП: count=%d weighted=%.1f, ожидалось 2 и 58", tkp.Count, tkp.Weighted)
	}
}
