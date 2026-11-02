package engine

import (
	"sort"
	"time"

	"isup/internal/model"
)

// Directories — справочники, доступные движку для разрешения имён.
type Directories struct {
	Clients   map[string]model.Client
	Suppliers map[string]model.Supplier
	Employees map[string]model.Employee
}

// RecalcSchedule — пересчёт текущего графика (прогноза) проекта (Ф19):
//  1. веха, привязанная к закупке, следует прогнозной дате поставки;
//  2. зависимости «финиш-старт + лаг» продвигают последователей вперёд (floor-семантика);
//  3. даты этапов пересчитываются как min/max дат дочерних элементов.
//
// Функция мутирует p.WBS (текущий прогноз) и возвращает строки для отображения.
func RecalcSchedule(p *model.Project, dir *Directories) []WBSRow {
	items := itemByID(p)

	// 1. Вехи, управляемые закупками (Ф29): задержка поставки двигает веху.
	for _, pu := range p.Purchases {
		if it, ok := items[pu.MilestoneID]; ok && it.Type == model.WBSMilestone {
			it.Start = pu.ForecastDate
			it.End = pu.ForecastDate
		}
	}

	// 2. Каскад по топологическому порядку: старт >= финиш предшественника + лаг.
	for _, id := range topoOrder(p) {
		it := items[id]
		var shift time.Duration
		for _, dep := range it.Dependencies {
			pred, ok := items[dep.FromID]
			if !ok {
				continue
			}
			earliest := pred.End.AddDate(0, 0, dep.LagDays)
			if d := earliest.Sub(it.Start); d > shift {
				shift = d
			}
		}
		if shift > 0 {
			it.Start = it.Start.Add(shift)
			it.End = it.End.Add(shift)
		}
	}

	// 3. Этапы принимают даты дочерних элементов.
	recomputePhases(p, items)

	return buildRows(p, dir)
}

// recomputePhases — этап = min(старт детей) … max(финиш детей).
func recomputePhases(p *model.Project, items map[string]*model.WBSItem) {
	children := map[string][]*model.WBSItem{}
	for i := range p.WBS {
		it := &p.WBS[i]
		if it.ParentID != "" {
			children[it.ParentID] = append(children[it.ParentID], it)
		}
	}
	for i := range p.WBS {
		ph := &p.WBS[i]
		if ph.Type != model.WBSPhase {
			continue
		}
		kids := children[ph.ID]
		if len(kids) == 0 {
			continue
		}
		minS, maxE := kids[0].Start, kids[0].End
		for _, k := range kids {
			if k.Start.Before(minS) {
				minS = k.Start
			}
			if k.End.After(maxE) {
				maxE = k.End
			}
		}
		ph.Start, ph.End = minS, maxE
	}
}

// topoOrder — порядок, в котором предшественники идут раньше последователей (Кан).
func topoOrder(p *model.Project) []string {
	deps := map[string][]string{}
	dependents := map[string][]string{}
	for _, it := range p.WBS {
		for _, d := range it.Dependencies {
			deps[it.ID] = append(deps[it.ID], d.FromID)
			dependents[d.FromID] = append(dependents[d.FromID], it.ID)
		}
	}
	var queue, order []string
	indeg := make(map[string]int, len(p.WBS))
	for _, it := range p.WBS {
		indeg[it.ID] = len(deps[it.ID])
		if indeg[it.ID] == 0 {
			queue = append(queue, it.ID)
		}
	}
	for len(queue) > 0 {
		id := queue[0]
		queue = queue[1:]
		order = append(order, id)
		for _, next := range dependents[id] {
			indeg[next]--
			if indeg[next] == 0 {
				queue = append(queue, next)
			}
		}
	}
	if len(order) < len(p.WBS) { // защита от циклов в данных
		seen := map[string]bool{}
		for _, id := range order {
			seen[id] = true
		}
		for _, it := range p.WBS {
			if !seen[it.ID] {
				order = append(order, it.ID)
			}
		}
	}
	return order
}

// WBSRow — строка СДР/Ганта со сравнением прогноза и базового плана (Ф18).
type WBSRow struct {
	ID           string             `json:"id"`
	ParentID     string             `json:"parentId,omitempty"`
	Type         model.WBSType      `json:"type"`
	Name         string             `json:"name"`
	Start        time.Time          `json:"start"`
	End          time.Time          `json:"end"`
	BaseStart    time.Time          `json:"baseStart"`
	BaseEnd      time.Time          `json:"baseEnd"`
	HasBase      bool               `json:"hasBase"`
	DevDays      int                `json:"devDays"` // отклонение от базового плана, дней
	Dependencies []model.Dependency `json:"dependencies,omitempty"`
	Purchase     *PurchaseLink      `json:"purchase,omitempty"`     // карточка привязок (Ф16)
	BudgetLinks  []BudgetLink       `json:"budgetLinks,omitempty"`  // карточка привязок (Ф16)
}

// PurchaseLink — привязка закупки к вехе.
type PurchaseLink struct {
	ID           string    `json:"id"`
	Number       string    `json:"number"`
	Name         string    `json:"name"`
	Supplier     string    `json:"supplier"`
	Amount       float64   `json:"amount"`
	Status       string    `json:"status"`
	PlanDate     time.Time `json:"planDate"`
	ForecastDate time.Time `json:"forecastDate"`
	DevDays      int       `json:"devDays"`
}

// BudgetLink — привязка статьи бюджета к вехе: сумма и месяцы план/прогноз.
type BudgetLink struct {
	ID            string  `json:"id"`
	Article       string  `json:"article"`
	IsRevenue     bool    `json:"isRevenue"`
	PlanSum       float64 `json:"planSum"`
	PlanMonth     string  `json:"planMonth"`
	ForecastSum   float64 `json:"forecastSum"`
	ForecastMonth string  `json:"forecastMonth"`
}

func buildRows(p *model.Project, dir *Directories) []WBSRow {
	base := LatestBaseline(p)
	baseByID := map[string]model.ItemSnapshot{}
	if base != nil {
		for _, s := range base.Items {
			baseByID[s.ItemID] = s
		}
	}
	purchByMile := map[string]model.Purchase{}
	for _, pu := range p.Purchases {
		purchByMile[pu.MilestoneID] = pu
	}
	supplierName := func(id string) string {
		if dir != nil {
			if s, ok := dir.Suppliers[id]; ok {
				return s.Name
			}
		}
		return id
	}

	rows := make([]WBSRow, 0, len(p.WBS))
	for i := range p.WBS {
		it := &p.WBS[i]
		row := WBSRow{
			ID:           it.ID,
			ParentID:     it.ParentID,
			Type:         it.Type,
			Name:         it.Name,
			Start:        it.Start,
			End:          it.End,
			Dependencies: it.Dependencies,
		}
		if s, ok := baseByID[it.ID]; ok {
			row.HasBase = true
			row.BaseStart, row.BaseEnd = s.Start, s.End
			if it.Type == model.WBSMilestone {
				row.DevDays = daysBetween(s.Start, it.Start)
			} else {
				row.DevDays = daysBetween(s.End, it.End)
			}
		}
		if pu, ok := purchByMile[it.ID]; ok {
			row.Purchase = &PurchaseLink{
				ID: pu.ID, Number: pu.Number, Name: pu.Name,
				Supplier: supplierName(pu.SupplierID), Amount: pu.Amount,
				Status: string(pu.Status), PlanDate: pu.PlanDate, ForecastDate: pu.ForecastDate,
				DevDays: daysBetween(pu.PlanDate, pu.ForecastDate),
			}
		}
		for _, bid := range it.BudgetItemIDs {
			for bi := range p.Budget {
				b := &p.Budget[bi]
				if b.ID != bid {
					continue
				}
				link := BudgetLink{ID: b.ID, Article: string(b.Article), IsRevenue: b.IsRevenue}
				months := sortedMonths(b.Plan)
				for _, m := range months {
					link.PlanSum += b.Plan[m]
				}
				if len(months) > 0 {
					link.PlanMonth = months[0]
				}
				fMonth, fSum := ForecastSpread(p, b, months)
				link.ForecastMonth, link.ForecastSum = fMonth, fSum
				row.BudgetLinks = append(row.BudgetLinks, link)
			}
		}
		rows = append(rows, row)
	}
	return rows
}

func daysBetween(a, b time.Time) int {
	return int(b.Sub(a).Hours() / 24)
}

func sortedMonths(m map[string]float64) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

// ForecastSpread — прогноз статьи: месяцы плана сдвигаются вместе с вехой-якорём
// на разницу (прогноз − базовый план) в месяцах (Ф26). Сумма не меняется — сдвигается график.
func ForecastSpread(p *model.Project, b *model.BudgetItem, planMonths []string) (firstMonth string, sum float64) {
	sum = 0
	for _, m := range planMonths {
		sum += b.Plan[m]
	}
	if len(planMonths) == 0 {
		return "", 0
	}
	delta := AnchorShiftMonths(p, b.MilestoneID)
	return ShiftMonths(planMonths[0], delta), sum
}

// AnchorShiftMonths — сдвиг вехи-якоря (прогноз против базового плана) в месяцах.
func AnchorShiftMonths(p *model.Project, milestoneID string) int {
	if milestoneID == "" {
		return 0
	}
	items := itemByID(p)
	anchor, ok := items[milestoneID]
	if !ok {
		return 0
	}
	base := LatestBaseline(p)
	if base == nil {
		return 0
	}
	for _, s := range base.Items {
		if s.ItemID != milestoneID {
			continue
		}
		planDate := s.Start
		if anchor.Type != model.WBSMilestone {
			planDate = s.End
		}
		cur := anchor.Start
		if anchor.Type != model.WBSMilestone {
			cur = anchor.End
		}
		return MonthsBetween(planDate, cur)
	}
	return 0
}

// BudgetForecast — помесячный прогноз статьи бюджета.
func BudgetForecast(p *model.Project, b *model.BudgetItem) map[string]float64 {
	delta := AnchorShiftMonths(p, b.MilestoneID)
	out := make(map[string]float64, len(b.Plan))
	for m, v := range b.Plan {
		out[ShiftMonths(m, delta)] += v
	}
	return out
}
