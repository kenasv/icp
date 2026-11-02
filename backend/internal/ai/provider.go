// Package ai — архитектурный интерфейс ИИ-провайдера ИСУП (требование 4.1.4:
// «Архитектурно выделяется интерфейс провайдера, к которому позже подключается
// реальная модель»). DemoProvider — детерминированная демо-реализация на правилах
// поверх данных расчётного движка; ответы собираются из данных, не хардкодятся.
package ai

import (
	"fmt"
	"regexp"
	"sort"
	"strings"

	"isup/internal/engine"
	"isup/internal/model"
	"isup/internal/store"
)

// Insight — проактивное наблюдение ИИ (Ф39).
type Insight struct {
	Severity string `json:"severity"` // info | warning | critical
	Text     string `json:"text"`
}

// Provider — контракт ИИ-провайдера. Для пилота подключается LLM-реализация.
type Provider interface {
	// Chat — ответ на вопрос по проекту/портфелю из данных движка (Ф38).
	Chat(question string) string
	// StatusReport — черновик статус-отчёта по проекту (Ф40).
	StatusReport(projectID string) (string, error)
	// Recommendations — проактивные отклонения/риски и рекомендации (Ф39).
	Recommendations(projectID string) []Insight
}

// NewDemoProvider — демо-провайдер на правилах.
func NewDemoProvider(s *store.Store) Provider {
	return &DemoProvider{st: s}
}

type DemoProvider struct {
	st *store.Store
}

// FallbackAnswer — ответ на нераспознанный вопрос (Ф38).
const FallbackAnswer = "Я демо-ассистент ИСУП; в пилоте будет подключена полная модель."

// Chat — разбор вопроса по ключевым словам и сборка ответа из данных.
func (a *DemoProvider) Chat(q string) string {
	s := a.st
	s.RLockStore()
	defer s.RUnlockStore()

	text := strings.ToLower(q)

	// Определяем проект, если он упомянут (номер или часть названия).
	p := a.findProject(text)

	// Вопросы по портфелю/воронке.
	if p == nil && containsAny(text, "портфел", "дашборд", "итог", "всего", "сводка") {
		return a.portfolioAnswer()
	}
	if containsAny(text, "воронк", "пресейл", "пресейл", "ткп", "лид") && p == nil {
		return a.funnelAnswer()
	}
	if p == nil {
		// Попытка понять общий вопрос.
		if containsAny(text, "воронк", "прогноз выручк") {
			return a.funnelAnswer()
		}
		return FallbackAnswer
	}

	pc := engine.Compose(p, s.Dirs())
	client := s.Clients[p.ClientID].Name

	switch {
	case containsAny(text, "статус", "здоровь", "как дела", "состояние"):
		return fmt.Sprintf("Проект %s «%s» (клиент: %s): статус «%s», здоровье %s. %s. Сумма контракта %.1f млн ₽, GM: план %.1f%% / прогноз %.1f%%.",
			p.ID, p.Name, client, p.Status, zoneEmoji(pc.Health.Overall), pc.Health.OverallReason,
			p.ContractAmount, pc.Finance.GM.Plan*100, pc.Finance.GM.Forecast*100)
	case containsAny(text, "сумм", "стоимост", "контракт", "бюджет", "деньг"):
		return fmt.Sprintf("Проект %s: сумма контракта %.1f млн ₽. Выручка: план %.1f / прогноз %.1f / факт %.1f млн ₽. Затраты: план %.1f / прогноз %.1f млн ₽.",
			p.ID, p.ContractAmount, pc.Finance.Revenue.Total.Plan, pc.Finance.Revenue.Total.Forecast, pc.Finance.Revenue.Total.Actual,
			pc.Finance.Cost.Total.Plan, pc.Finance.Cost.Total.Forecast)
	case containsAny(text, "gm", "марж", "маржа"):
		return fmt.Sprintf("Проект %s: GM план %.1f%%, прогноз %.1f%%, факт %.1f%% (%s).",
			p.ID, pc.Finance.GM.Plan*100, pc.Finance.GM.Forecast*100, pc.Finance.GM.Actual*100, pc.Health.GM.Reason)
	case containsAny(text, "срок", "дат", "заверш", "график", "гант", "вех"):
		var lines []string
		for _, r := range pc.Schedule {
			if r.Type == model.WBSMilestone {
				line := fmt.Sprintf("• %s — прогноз %s", r.Name, r.Start.Format("02.01.2006"))
				if r.HasBase && r.DevDays != 0 {
					line += fmt.Sprintf(" (сдвиг %+d дн. от плана %s)", r.DevDays, r.BaseStart.Format("02.01.2006"))
				}
				lines = append(lines, line)
			}
		}
		return fmt.Sprintf("Вехи проекта %s:\n%s", p.ID, strings.Join(lines, "\n"))
	case containsAny(text, "риск"):
		if len(p.Risks) == 0 {
			return fmt.Sprintf("По проекту %s риски не зарегистрированы.", p.ID)
		}
		var lines []string
		for _, r := range p.Risks {
			if r.Status != "открыт" {
				continue
			}
			lines = append(lines, fmt.Sprintf("• «%s» — вероятность %s, влияние %s, уровень %s, ответственный %s, срок %s",
				r.Name, r.Probability, r.Impact, riskLevelEmoji(r), s.Employees[r.Owner].Name, r.DueDate.Format("02.01.2006")))
		}
		return fmt.Sprintf("Открытые риски проекта %s:\n%s", p.ID, strings.Join(lines, "\n"))
	case containsAny(text, "закуп", "постав"):
		if len(p.Purchases) == 0 {
			return fmt.Sprintf("По проекту %s закупок нет.", p.ID)
		}
		var lines []string
		for _, pu := range p.Purchases {
			lines = append(lines, fmt.Sprintf("• %s «%s» — %s, %.1f млн ₽, план %s, прогноз %s",
				pu.Number, pu.Name, pu.Status, pu.Amount,
				pu.PlanDate.Format("02.01.2006"), pu.ForecastDate.Format("02.01.2006")))
		}
		return fmt.Sprintf("Закупки проекта %s:\n%s", p.ID, strings.Join(lines, "\n"))
	case containsAny(text, "dds", "ддс", "касс", "разрыв", "платеж", "денеж"):
		var lines []string
		for _, m := range pc.Finance.DDS.Monthly {
			lines = append(lines, fmt.Sprintf("• %s: входящие %.1f / исходящие %.1f, разрыв %+.1f млн ₽",
				monthName(m.Month), m.In.Forecast, m.Out.Forecast, m.Gap.Forecast))
		}
		return fmt.Sprintf("ДДС проекта %s (прогноз):\n%s", p.ID, strings.Join(lines, "\n"))
	case containsAny(text, "отчет", "отчёт", "статус-отч"):
		return a.statusReportLocked(p.ID)
	default:
		return fmt.Sprintf("Проект %s «%s», клиент %s, статус «%s», сумма %.1f млн ₽, здоровье %s. Спросите про статус, сроки, риски, закупки, GM или ДДС.",
			p.ID, p.Name, client, p.Status, p.ContractAmount, zoneEmoji(pc.Health.Overall))
	}
}

// findProject — поиск упомянутого проекта по номеру или названию.
func (a *DemoProvider) findProject(text string) *model.Project {
	for _, p := range a.st.Projects {
		if strings.Contains(text, strings.ToLower(p.ID)) {
			return p
		}
	}
	// «проект 2», «проекта №2», «проекту 002» — с учётом словоизменения.
	if m := reProjectNum.FindStringSubmatch(text); m != nil {
		for _, p := range a.st.Projects {
			num := strings.TrimPrefix(p.ID, "PRJ-2024-")
			trimmed := strings.TrimLeft(num, "0")
			if m[1] == num || m[1] == trimmed {
				return p
			}
		}
	}
	for _, p := range a.st.Projects {
		if strings.Contains(text, strings.ToLower(p.Name)) {
			return p
		}
	}
	for _, p := range a.st.Projects {
		for _, word := range strings.Fields(strings.ToLower(p.Name)) {
			if len(word) > 4 && strings.Contains(text, word) {
				return p
			}
		}
	}
	return nil
}

var reProjectNum = regexp.MustCompile(`проект[а-яё]*\s*№?\s*0*(\d+)`)

func (a *DemoProvider) portfolioAnswer() string {
	s := a.st
	var revPlan, revFc, revAct, gmPlanW, gmFcW, wsum float64
	active := 0
	for _, p := range s.Projects {
		if p.Status == model.StatusDone || p.Status == model.StatusArchived {
			continue
		}
		active++
		pc := engine.Compose(p, s.Dirs())
		revPlan += pc.Finance.Revenue.Total.Plan
		revFc += pc.Finance.Revenue.Total.Forecast
		revAct += pc.Finance.Revenue.Total.Actual
		if pc.Finance.Revenue.Total.Plan > 0 {
			w := pc.Finance.Revenue.Total.Plan
			gmPlanW += pc.Finance.GM.Plan * w
			gmFcW += pc.Finance.GM.Forecast * w
			wsum += w
		}
	}
	if wsum > 0 {
		gmPlanW, gmFcW = gmPlanW/wsum, gmFcW/wsum
	}
	var ps []*model.Presale
	for _, x := range s.Presales {
		ps = append(ps, x)
	}
	fc := engine.ComputeFunnel(ps, s.Stages)
	return fmt.Sprintf("Портфель «Цифровизация B2B»: активных проектов %d. Выручка: план %.1f / прогноз %.1f / факт %.1f млн ₽. GM портфеля (взвешенно по выручке): план %.1f%% / прогноз %.1f%%. Взвешенная воронка пресейлов: %.1f млн ₽ (%d активных).",
		active, revPlan, revFc, revAct, gmPlanW*100, gmFcW*100, fc.TotalWeighted, fc.TotalCount)
}

func (a *DemoProvider) funnelAnswer() string {
	s := a.st
	var ps []*model.Presale
	for _, x := range s.Presales {
		ps = append(ps, x)
	}
	fc := engine.ComputeFunnel(ps, s.Stages)
	var lines []string
	for _, st := range fc.Stages {
		lines = append(lines, fmt.Sprintf("• %s (%.0f%%): %d шт., сумма %.1f, взвешенная %.1f млн ₽",
			st.Name, st.Probability*100, st.Count, st.Sum, st.Weighted))
	}
	return fmt.Sprintf("Воронка пресейлов:\n%s\nИтого взвешенная выручка: %.1f млн ₽.", strings.Join(lines, "\n"), fc.TotalWeighted)
}

// Recommendations — проактивное выявление отклонений (Ф39): задержки закупок,
// сдвиги вех, кассовые разрывы, падение GM, критические риски.
func (a *DemoProvider) Recommendations(projectID string) []Insight {
	a.st.RLockStore()
	defer a.st.RUnlockStore()
	return a.recommendationsLocked(projectID)
}

func (a *DemoProvider) recommendationsLocked(projectID string) []Insight {
	s := a.st
	p, ok := s.Projects[projectID]
	if !ok {
		return nil
	}
	pc := engine.Compose(p, s.Dirs())
	var out []Insight

	for i := range pc.Schedule {
		r := &pc.Schedule[i]
		if r.Purchase != nil && r.Purchase.DevDays > 0 {
			out = append(out, Insight{Severity: "warning",
				Text: fmt.Sprintf("Закупка %s «%s»: прогноз поставки позже плана на %d дн. (%s → %s). Веха «%s» сдвигается, связанные работы и выручка переносятся.",
					r.Purchase.Number, r.Purchase.Name, r.Purchase.DevDays,
					r.Purchase.PlanDate.Format("02.01.2006"), r.Purchase.ForecastDate.Format("02.01.2006"), r.Name)})
		}
	}
	for i := range pc.Schedule {
		r := &pc.Schedule[i]
		if r.Type == model.WBSMilestone && r.HasBase && r.DevDays > 7 {
			out = append(out, Insight{Severity: "critical",
				Text: fmt.Sprintf("Веха «%s» сдвинута на %+d дн. (план %s → прогноз %s). Проверьте цепочку зависимостей и запрос на изменение.",
					r.Name, r.DevDays, r.BaseStart.Format("02.01.2006"), r.Start.Format("02.01.2006"))})
		}
	}
	for _, m := range pc.Finance.DDS.Monthly {
		if m.Gap.Forecast > 0.5 {
			out = append(out, Insight{Severity: "critical",
				Text: fmt.Sprintf("Прогнозный кассовый разрыв в %s: исходящие превышают входящие на %.1f млн ₽. Рекомендуется авансирование или перенос платежей.", monthName(m.Month), m.Gap.Forecast)})
		}
	}
	if pc.Finance.GM.Plan > 0 {
		d := (pc.Finance.GM.Forecast - pc.Finance.GM.Plan) * 100
		if d < -2 {
			out = append(out, Insight{Severity: "warning",
				Text: fmt.Sprintf("GM прогноз ниже плана на %.1f п.п. (%.1f%% → %.1f%%). Проверьте статьи затрат.", d, pc.Finance.GM.Plan*100, pc.Finance.GM.Forecast*100)})
		}
	}
	for _, r := range p.Risks {
		if r.Status == "открыт" && model.RiskLevel(r.Probability, r.Impact) >= 6 {
			out = append(out, Insight{Severity: "warning",
				Text: fmt.Sprintf("Критический риск «%s» (уровень 🔴, ответственный %s, срок %s).",
					r.Name, s.Employees[r.Owner].Name, r.DueDate.Format("02.01.2006"))})
		}
	}
	if len(out) == 0 {
		out = append(out, Insight{Severity: "info", Text: "Отклонений не выявлено: проект идёт по плану."})
	}
	return out
}

// StatusReport — черновик статус-отчёта из ленты событий и данных движка (Ф40).
func (a *DemoProvider) StatusReport(projectID string) (string, error) {
	a.st.RLockStore()
	defer a.st.RUnlockStore()
	if _, ok := a.st.Projects[projectID]; !ok {
		return "", fmt.Errorf("проект %s не найден", projectID)
	}
	return a.statusReportLocked(projectID), nil
}

func (a *DemoProvider) statusReportLocked(projectID string) string {
	s := a.st
	p := s.Projects[projectID]
	pc := engine.Compose(p, s.Dirs())
	client := s.Clients[p.ClientID].Name

	var b strings.Builder
	fmt.Fprintf(&b, "СТАТУС-ОТЧЁТ ПО ПРОЕКТУ %s «%s»\n", p.ID, p.Name)
	fmt.Fprintf(&b, "Клиент: %s | Статус: %s | Здоровье: %s\n\n", client, p.Status, zoneEmoji(pc.Health.Overall)+" "+string(pc.Health.Overall))

	fmt.Fprintf(&b, "КЛЮЧЕВЫЕ ПОКАЗАТЕЛИ\n")
	fmt.Fprintf(&b, "- Сумма контракта: %.1f млн ₽\n", p.ContractAmount)
	fmt.Fprintf(&b, "- GM: план %.1f%%, прогноз %.1f%%\n", pc.Finance.GM.Plan*100, pc.Finance.GM.Forecast*100)
	endPlan, endFc := "", ""
	var lastMile *engine.WBSRow
	for i := range pc.Schedule {
		r := &pc.Schedule[i]
		if r.Type != model.WBSMilestone {
			continue
		}
		if lastMile == nil || r.Start.After(lastMile.Start) {
			lastMile = r
		}
	}
	if lastMile != nil {
		endFc = lastMile.Start.Format("02.01.2006")
		if lastMile.HasBase {
			endPlan = lastMile.BaseStart.Format("02.01.2006")
		}
	}
	fmt.Fprintf(&b, "- Завершение (веха «%s»): план %s, прогноз %s", lastMile.Name, endPlan, endFc)
	if lastMile.DevDays != 0 {
		fmt.Fprintf(&b, ", отклонение %+d дн.", lastMile.DevDays)
	}
	fmt.Fprintf(&b, "\n")

	fmt.Fprintf(&b, "\nКЛЮЧЕВОЕ СОБЫТИЕ\n")
	events := append([]model.Event(nil), p.Events...)
	sort.SliceStable(events, func(i, j int) bool { return events[i].At.After(events[j].At) })
	if len(events) > 0 {
		fmt.Fprintf(&b, "- %s: %s\n", events[0].At.Format("02.01.2006"), events[0].Text)
	}

	fmt.Fprintf(&b, "\nВЛИЯНИЕ И ПРИНЯТЫЕ МЕРЫ\n")
	for _, ins := range a.recommendationsLocked(projectID) {
		if ins.Severity != "info" {
			fmt.Fprintf(&b, "- %s\n", ins.Text)
		}
	}
	for _, cr := range s.ChangeRequests {
		if cr.ProjectID == p.ID {
			fmt.Fprintf(&b, "- ЗИ %s (%s): %s — %s (влияние: GM %+.1f п.п., ДДС %+.1f млн ₽)\n",
				cr.ID, cr.Type, cr.Reason, cr.Status, cr.ImpactGMpp, cr.ImpactDDS)
		}
	}

	fmt.Fprintf(&b, "\nСЛЕДУЮЩИЕ ШАГИ\n")
	var next []string
	for _, r := range pc.Schedule {
		if r.Type == model.WBSMilestone && r.Start.After(model.DemoNow) {
			next = append(next, fmt.Sprintf("- %s — %s (прогноз)", r.Name, r.Start.Format("02.01.2006")))
		}
	}
	sort.Strings(next)
	for _, n := range next {
		fmt.Fprintln(&b, n)
	}
	return b.String()
}

// ============ Вспомогательные ============

func containsAny(text string, keys ...string) bool {
	for _, k := range keys {
		if strings.Contains(text, k) {
			return true
		}
	}
	return false
}

func zoneEmoji(z engine.Zone) string {
	switch z {
	case engine.ZoneGreen:
		return "🟢"
	case engine.ZoneYellow:
		return "🟡"
	case engine.ZoneRed:
		return "🔴"
	}
	return "⚪"
}

func riskLevelEmoji(r model.Risk) string {
	lvl := model.RiskLevel(r.Probability, r.Impact)
	switch {
	case lvl >= 6:
		return "🔴"
	case lvl >= 3:
		return "🟡"
	default:
		return "🟢"
	}
}

var ruMonths = map[string]string{
	"01": "январь", "02": "февраль", "03": "март", "04": "апрель",
	"05": "май", "06": "июнь", "07": "июль", "08": "август",
	"09": "сентябрь", "10": "октябрь", "11": "ноябрь", "12": "декабрь",
}

func monthName(monthKey string) string {
	parts := strings.Split(monthKey, "-")
	if len(parts) != 2 {
		return monthKey
	}
	year := parts[0]
	if m, ok := ruMonths[parts[1]]; ok {
		return m + " " + year
	}
	return monthKey
}
