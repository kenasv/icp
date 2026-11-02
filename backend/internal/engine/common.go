// Package engine — расчётный движок ИСУП.
// Все числа на экранах — выход этого движка (хардкод в интерфейсе запрещён требованием 4.1.4).
package engine

import (
	"time"

	"isup/internal/model"
)

// Clone — глубокая копия проекта (для сценариев и превью влияния).
func Clone(p *model.Project) *model.Project {
	q := *p
	q.Team = append([]model.TeamMember(nil), p.Team...)
	q.WBS = make([]model.WBSItem, len(p.WBS))
	for i, it := range p.WBS {
		q.WBS[i] = it
		q.WBS[i].Dependencies = append([]model.Dependency(nil), it.Dependencies...)
		q.WBS[i].BudgetItemIDs = append([]string(nil), it.BudgetItemIDs...)
	}
	q.Budget = make([]model.BudgetItem, len(p.Budget))
	for i, b := range p.Budget {
		q.Budget[i] = b
		q.Budget[i].Plan = copyMap(b.Plan)
		q.Budget[i].Actual = copyMap(b.Actual)
	}
	q.Purchases = append([]model.Purchase(nil), p.Purchases...)
	q.Risks = append([]model.Risk(nil), p.Risks...)
	q.Baselines = append([]model.Baseline(nil), p.Baselines...)
	q.Events = append([]model.Event(nil), p.Events...)
	q.Scenarios = append([]model.Scenario(nil), p.Scenarios...)
	return &q
}

func copyMap(m map[string]float64) map[string]float64 {
	if m == nil {
		return nil
	}
	r := make(map[string]float64, len(m))
	for k, v := range m {
		r[k] = v
	}
	return r
}

// MonthsBetween — разница в месяцах между датами (для сдвига финансовых привязок).
func MonthsBetween(a, b time.Time) int {
	y1, m1, _ := a.Date()
	y2, m2, _ := b.Date()
	return (int(y2)-int(y1))*12 + int(m2) - int(m1)
}

// ShiftMonths — ключ месяца, сдвинутый на n месяцев.
func ShiftMonths(monthKey string, n int) string {
	t, err := time.Parse(model.MonthLayout, monthKey)
	if err != nil {
		return monthKey
	}
	t = t.AddDate(0, n, 0)
	return t.Format(model.MonthLayout)
}

// itemByID — индекс элементов СДР.
func itemByID(p *model.Project) map[string]*model.WBSItem {
	m := make(map[string]*model.WBSItem, len(p.WBS))
	for i := range p.WBS {
		m[p.WBS[i].ID] = &p.WBS[i]
	}
	return m
}

// LatestBaseline — последний утверждённый базовый план (nil, если нет).
func LatestBaseline(p *model.Project) *model.Baseline {
	if len(p.Baselines) == 0 {
		return nil
	}
	return &p.Baselines[len(p.Baselines)-1]
}
