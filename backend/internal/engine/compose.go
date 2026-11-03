package engine

import (
	"isup/internal/model"
	"sort"
	"time"
)

// ProjectComputed — полный расчётный срез по проекту (для карточки).
type ProjectComputed struct {
	Schedule []WBSRow       `json:"schedule"`
	Finance  FinanceComputed `json:"finance"`
	Health   HealthComputed `json:"health"`
	Cascade  CascadeComputed `json:"cascade"`
}

// ProjectSummary — строка реестра проектов / портфельного дашборда (Ф10, Ф36).
type ProjectSummary struct {
	ID           string             `json:"id"`
	Name         string             `json:"name"`
	ClientName   string             `json:"clientName"`
	Status       model.ProjectStatus `json:"status"`
	Amount       float64            `json:"amount"`       // плановая выручка от проекта, млн ₽
	PlannedCost  float64            `json:"plannedCost"`  // плановые затраты (состав работ/бюджет), млн ₽
	GMPlan       float64            `json:"gmPlan"`       // (выручка − затраты) / выручка
	GMForecast   float64            `json:"gmForecast"`
	EndPlan      time.Time          `json:"endPlan"`
	EndForecast  time.Time          `json:"endForecast"`
	DevDays      int                `json:"devDays"`
	Health       Zone               `json:"health"`
	HealthReason string             `json:"healthReason"`
	Note         string             `json:"note"`
}

// CascadeComputed — экран «Каскад последствий»: сравнение базового плана
// и текущего прогноза по срокам и финансам (Ф18, Ф26, Ф29).
type CascadeComputed struct {
	Rows []CascadeRow `json:"rows"`
	FinanceShifts []FinanceShift `json:"financeShifts"`
	Purchases []PurchaseCascade `json:"purchases"`
	BaselineVersion int `json:"baselineVersion"`
}

// CascadeRow — элемент СДР: базовый план против прогноза.
type CascadeRow struct {
	ItemID       string        `json:"itemId"`
	Name         string        `json:"name"`
	Type         model.WBSType `json:"type"`
	BaseDate     time.Time     `json:"baseDate"`
	ForecastDate time.Time     `json:"forecastDate"`
	DevDays      int           `json:"devDays"`
	Shifted      bool          `json:"shifted"`
}

// FinanceShift — перенос финансовой привязки между месяцами.
type FinanceShift struct {
	ItemID        string  `json:"itemId"`
	Article       string  `json:"article"`
	IsRevenue     bool    `json:"isRevenue"`
	Amount        float64 `json:"amount"`
	PlanMonth     string  `json:"planMonth"`
	ForecastMonth string  `json:"forecastMonth"`
	ShiftMonths   int     `json:"shiftMonths"`
}

// PurchaseCascade — закупка и её влияние на график.
type PurchaseCascade struct {
	Number       string    `json:"number"`
	Name         string    `json:"name"`
	Amount       float64   `json:"amount"`
	Status       string    `json:"status"`
	PlanDate     time.Time `json:"planDate"`
	ForecastDate time.Time `json:"forecastDate"`
	DevDays      int       `json:"devDays"`
	Milestone    string    `json:"milestone"`
	Affected     []string `json:"affected"` // затронутые вехи/работы
}

// Compose — полный пересчёт и сборка среза по проекту.
func Compose(p *model.Project, dir *Directories) ProjectComputed {
	rows := RecalcSchedule(p, dir)
	fc := ComputeFinance(p)
	h := ComputeHealth(p, rows, fc)
	return ProjectComputed{
		Schedule: rows,
		Finance:  fc,
		Health:   h,
		Cascade:  BuildCascade(p, rows, fc),
	}
}

// Summarize — краткая сводка проекта для реестра.
func Summarize(p *model.Project, dir *Directories) ProjectSummary {
	pc := Compose(p, dir)
	s := ProjectSummary{
		ID: p.ID, Name: p.Name, Status: p.Status,
		Amount: p.ContractAmount, Note: p.Note,
		// Плановые затраты = сумма помесячных планов затрат (для проектов из пресейла
		// это суммы строк состава работ); GM план = (выручка − затраты) / выручка.
		PlannedCost: pc.Finance.Cost.Total.Plan,
		GMPlan:      pc.Finance.GM.Plan, GMForecast: pc.Finance.GM.Forecast,
		Health: pc.Health.Overall, HealthReason: pc.Health.OverallReason,
	}
	if dir != nil {
		if c, ok := dir.Clients[p.ClientID]; ok {
			s.ClientName = c.Name
		}
	} else {
		s.ClientName = p.ClientID
	}
	// Дата завершения (прогноз): у проекта с составом работ — самая большая
	// плановая дата строк состава (перенесён из пресейла); без состава —
	// дата последней вехи графика (план — из базового плана).
	var lastMile *WBSRow
	for i := range pc.Schedule {
		r := &pc.Schedule[i]
		if r.Type != model.WBSMilestone {
			continue
		}
		if lastMile == nil || r.End.After(lastMile.End) {
			lastMile = r
		}
	}
	if len(p.Scope) > 0 {
		maxDate := p.Scope[0].Date
		for _, it := range p.Scope {
			if it.Date.After(maxDate) {
				maxDate = it.Date
			}
		}
		s.EndForecast = maxDate
		if lastMile != nil {
			s.DevDays = lastMile.DevDays
			if lastMile.HasBase {
				s.EndPlan = lastMile.BaseEnd
			} else {
				s.EndPlan = lastMile.End
			}
		} else {
			s.EndPlan = maxDate
		}
	} else if lastMile != nil {
		s.EndForecast = lastMile.End
		s.DevDays = lastMile.DevDays
		if lastMile.HasBase {
			s.EndPlan = lastMile.BaseEnd
		} else {
			s.EndPlan = lastMile.End
		}
	}
	return s
}

// BuildCascade — сборка «каскада последствий».
func BuildCascade(p *model.Project, rows []WBSRow, fc FinanceComputed) CascadeComputed {
	// Срезы инициализируются пустыми: у проекта без базового плана/закупок
	// API должен отдавать [], а не null.
	cc := CascadeComputed{
		Rows:          []CascadeRow{},
		FinanceShifts: []FinanceShift{},
		Purchases:     []PurchaseCascade{},
	}
	if b := LatestBaseline(p); b != nil {
		cc.BaselineVersion = b.Version
	}
	for _, r := range rows {
		if r.Type == model.WBSPhase || !r.HasBase {
			continue
		}
		base := r.BaseStart
		if r.Type != model.WBSMilestone {
			base = r.BaseEnd
		}
		cc.Rows = append(cc.Rows, CascadeRow{
			ItemID: r.ID, Name: r.Name, Type: r.Type,
			BaseDate: base, ForecastDate: r.End, DevDays: r.DevDays, Shifted: r.DevDays != 0,
		})
	}
	sort.SliceStable(cc.Rows, func(i, j int) bool { return cc.Rows[i].ForecastDate.Before(cc.Rows[j].ForecastDate) })

	for i := range p.Budget {
		b := &p.Budget[i]
		months := sortedMonths(b.Plan)
		if len(months) == 0 {
			continue
		}
		total := 0.0
		for _, m := range months {
			total += b.Plan[m]
		}
		fMonth, _ := ForecastSpread(p, b, months)
		shift := 0
		if fMonth != "" && len(months) > 0 {
			t1, _ := time.Parse(model.MonthLayout, months[0])
			t2, _ := time.Parse(model.MonthLayout, fMonth)
			shift = MonthsBetween(t1, t2)
		}
		cc.FinanceShifts = append(cc.FinanceShifts, FinanceShift{
			ItemID: b.ID, Article: string(b.Article), IsRevenue: b.IsRevenue, Amount: total,
			PlanMonth: months[0], ForecastMonth: fMonth, ShiftMonths: shift,
		})
	}

	items := itemByID(p)
	for _, pu := range p.Purchases {
		pc := PurchaseCascade{
			Number: pu.Number, Name: pu.Name, Amount: pu.Amount,
			Status: string(pu.Status), PlanDate: pu.PlanDate, ForecastDate: pu.ForecastDate,
			DevDays: daysBetween(pu.PlanDate, pu.ForecastDate),
		}
		if it, ok := items[pu.MilestoneID]; ok {
			pc.Milestone = it.Name
		}
		pc.Affected = AffectedAfter(p, pu.ID, pu.ForecastDate)
		cc.Purchases = append(cc.Purchases, pc)
	}
	return cc
}

// AffectedAfter — список элементов СДР, даты которых изменятся при прогнозе поставки.
func AffectedAfter(p *model.Project, purchaseID string, newForecast time.Time) []string {
	old := captureDates(p)
	q := Clone(p)
	for i := range q.Purchases {
		if q.Purchases[i].ID == purchaseID {
			q.Purchases[i].ForecastDate = newForecast
		}
	}
	RecalcSchedule(q, nil)
	var affected []string
	for _, it := range q.WBS {
		if it.Type == model.WBSPhase {
			continue
		}
		if !it.Start.Equal(old[it.ID]) {
			affected = append(affected, it.Name)
		}
	}
	return affected
}

func captureDates(p *model.Project) map[string]time.Time {
	m := map[string]time.Time{}
	for _, it := range p.WBS {
		m[it.ID] = it.Start
	}
	return m
}
