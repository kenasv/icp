package engine

import (
	"time"

	"isup/internal/model"
)

// ImpactPreview — предупреждение перед изменением закупки (Ф20):
// сколько задач и вех затронет пересчёт графика.
type ImpactPreview struct {
	AffectedWorks      int              `json:"affectedWorks"`
	AffectedMilestones int              `json:"affectedMilestones"`
	Items              []ImpactItemDiff `json:"items"`
}

// ImpactItemDiff — изменение конкретного элемента СДР.
type ImpactItemDiff struct {
	ItemID   string        `json:"itemId"`
	Name     string        `json:"name"`
	Type     model.WBSType `json:"type"`
	OldDate  time.Time     `json:"oldDate"`
	NewDate  time.Time     `json:"newDate"`
	DeltaDays int          `json:"deltaDays"`
}

// PreviewPurchaseImpact — считаем по графу зависимостей, ничего не меняя в проекте.
func PreviewPurchaseImpact(p *model.Project, purchaseID string, newForecast time.Time) ImpactPreview {
	oldStart := map[string]time.Time{}
	for _, it := range p.WBS {
		oldStart[it.ID] = it.Start
	}
	q := Clone(p)
	for i := range q.Purchases {
		if q.Purchases[i].ID == purchaseID {
			q.Purchases[i].ForecastDate = newForecast
		}
	}
	RecalcSchedule(q, nil)
	pr := ImpactPreview{Items: []ImpactItemDiff{}}
	// Порядок вывода — как в СДР.
	for _, it := range q.WBS {
		if it.Type == model.WBSPhase {
			continue
		}
		if !it.Start.Equal(oldStart[it.ID]) {
			pr.Items = append(pr.Items, ImpactItemDiff{
				ItemID: it.ID, Name: it.Name, Type: it.Type,
				OldDate: oldStart[it.ID], NewDate: it.Start,
				DeltaDays: daysBetween(oldStart[it.ID], it.Start),
			})
			if it.Type == model.WBSMilestone {
				pr.AffectedMilestones++
			} else {
				pr.AffectedWorks++
			}
		}
	}
	return pr
}

// ============ What-if песочница (пояснение к требованиям) ============

// ScenarioColumn — значения колонки сравнения.
type ScenarioColumn struct {
	KeyMilestones []MilestoneCompare `json:"keyMilestones"`
	GM            float64            `json:"gm"`
	CashGaps      []CashGapMonth     `json:"cashGaps"`
	Health        HealthComputed     `json:"health"`
}

// MilestoneCompare — дата вехи в разрезе колонки.
type MilestoneCompare struct {
	MilestoneID string    `json:"milestoneId"`
	Name        string    `json:"name"`
	Date        time.Time `json:"date"`
}

// CashGapMonth — кассовый разрыв месяца (прогноз), млн ₽.
type CashGapMonth struct {
	Month string  `json:"month"`
	Gap   float64 `json:"gap"`
}

// ScenarioComparison — три колонки: базовый план / текущий прогноз / сценарий.
type ScenarioComparison struct {
	Base     ScenarioColumn `json:"base"`
	Current  ScenarioColumn `json:"current"`
	Scenario ScenarioColumn `json:"scenario"`
}

// EvaluateScenario — применяет операции сценария к копии проекта и сравнивает
// с базовым планом и текущим прогнозом. Базовый план не изменяется.
func EvaluateScenario(p *model.Project, ops []model.ScenarioOp) ScenarioComparison {
	// Колонка «текущий прогноз».
	cur := Compose(p, nil)

	// Колонка «базовый план»: восстанавливаем план из последнего baseline.
	baseProj := Clone(p)
	if b := LatestBaseline(baseProj); b != nil {
		applyBaseline(baseProj, b)
	}
	base := Compose(baseProj, nil)

	// Колонка «сценарий».
	sc := Clone(p)
	ApplyScenarioOps(sc, ops)
	scen := Compose(sc, nil)

	return ScenarioComparison{
		Base:     columnOf(baseProj, base),
		Current:  columnOf(p, cur),
		Scenario: columnOf(sc, scen),
	}
}

// applyBaseline — откат текущих дат к утверждённому базов плану.
func applyBaseline(p *model.Project, b *model.Baseline) {
	items := itemByID(p)
	for _, s := range b.Items {
		if it, ok := items[s.ItemID]; ok {
			it.Start, it.End = s.Start, s.End
		}
	}
	// Закупки возвращаем к плановым датам.
	for i := range p.Purchases {
		p.Purchases[i].ForecastDate = p.Purchases[i].PlanDate
	}
}

// ApplyScenarioOps — применяет операции сценария к копии проекта, затем пересчёт.
func ApplyScenarioOps(p *model.Project, ops []model.ScenarioOp) {
	items := itemByID(p)
	purchByID := map[string]*model.Purchase{}
	for i := range p.Purchases {
		purchByID[p.Purchases[i].ID] = &p.Purchases[i]
	}
	for _, op := range ops {
		switch op.Kind {
		case "shiftMilestone":
			if it, ok := items[op.TargetID]; ok {
				if it.PurchaseID != "" {
					// Веха управляется закупкой — сдвигаем прогноз поставки.
					if pu := findPurchase(p, it.PurchaseID); pu != nil {
						pu.ForecastDate = pu.ForecastDate.AddDate(0, 0, op.ShiftDays)
					}
				} else {
					it.Start = it.Start.AddDate(0, 0, op.ShiftDays)
					it.End = it.End.AddDate(0, 0, op.ShiftDays)
				}
			}
		case "shiftWork":
			if it, ok := items[op.TargetID]; ok {
				it.Start = it.Start.AddDate(0, 0, op.ShiftDays)
				it.End = it.End.AddDate(0, 0, op.ShiftDays)
			}
		case "shiftDuration":
			if it, ok := items[op.TargetID]; ok && it.Type == model.WBSWork {
				it.End = it.End.AddDate(0, 0, op.DurationDelta)
			}
		case "addCost":
			p.Budget = append(p.Budget, model.BudgetItem{
				ID: "SC-" + op.Article + "-" + op.Month, ProjectID: p.ID, IsRevenue: false,
				Article: model.BudgetArticle(op.Article),
				Plan:    map[string]float64{op.Month: op.Amount},
			})
		}
	}
	// Сценарий — это перепланирование: последователи «плотно» следуют
	// зависимостям (сокращение работ тянет вехи назад, в отличие от
	// текущего прогноза, где сдвиги копятся только вперёд).
	tightRecalc(p)
}

// tightRecalc — плотный пересчёт: каждый зависимый элемент встаёт ровно
// в финиш предшественника + лаг; вехи закупок следуют прогнозу поставки.
func tightRecalc(p *model.Project) {
	items := itemByID(p)
	for _, pu := range p.Purchases {
		if it, ok := items[pu.MilestoneID]; ok && it.Type == model.WBSMilestone {
			it.Start, it.End = pu.ForecastDate, pu.ForecastDate
		}
	}
	for _, id := range topoOrder(p) {
		it := items[id]
		if len(it.Dependencies) == 0 {
			continue
		}
		var earliest time.Time
		for _, dep := range it.Dependencies {
			pred := items[dep.FromID]
			e := pred.End.AddDate(0, 0, dep.LagDays)
			if earliest.IsZero() || e.After(earliest) {
				earliest = e
			}
		}
		if it.Type == model.WBSMilestone {
			it.Start, it.End = earliest, earliest
		} else {
			dur := int(it.End.Sub(it.Start).Hours() / 24)
			it.Start = earliest
			it.End = earliest.AddDate(0, 0, dur)
		}
	}
	recomputePhases(p, items)
}

func findPurchase(p *model.Project, id string) *model.Purchase {
	for i := range p.Purchases {
		if p.Purchases[i].ID == id {
			return &p.Purchases[i]
		}
	}
	return nil
}

func columnOf(p *model.Project, pc ProjectComputed) ScenarioColumn {
	col := ScenarioColumn{GM: pc.Finance.GM.Forecast, Health: pc.Health}
	for _, r := range pc.Schedule {
		if r.Type != model.WBSMilestone {
			continue
		}
		col.KeyMilestones = append(col.KeyMilestones, MilestoneCompare{MilestoneID: r.ID, Name: r.Name, Date: r.Start})
	}
	for _, m := range pc.Finance.DDS.Monthly {
		col.CashGaps = append(col.CashGaps, CashGapMonth{Month: m.Month, Gap: m.Gap.Forecast})
	}
	return col
}

// ComputeCRImpact — автоматическое влияние запроса на изменение (Ф34):
// GM в п.п. и худшее ухудшение кассового разрыва по месяцам (млн ₽).
func ComputeCRImpact(p *model.Project) (gmPP float64, ddsDelta float64) {
	pc := Compose(p, nil)
	gmPP = (pc.Finance.GM.Forecast - pc.Finance.GM.Plan) * 100
	worst := 0.0
	for _, m := range pc.Finance.DDS.Monthly {
		if d := m.Gap.Forecast - m.Gap.Plan; d > worst {
			worst = d
		}
	}
	return round2(gmPP), round2(worst)
}
