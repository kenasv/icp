package engine

import (
	"isup/internal/model"
	"sort"
)

// FinanceComputed — финансы проекта: план/прогноз/факт по статьям и месяцам,
// GM и ДДС (Ф21–Ф26). Всё считается движком, интерфейс только отображает.
type FinanceComputed struct {
	Months   []string       `json:"months"`   // диапазон месяцев с данными
	Articles []ArticleRow   `json:"articles"` // по статьям бюджета
	Revenue  TotalsMonthly  `json:"revenue"`
	Cost     TotalsMonthly  `json:"cost"`
	GM       GMComputed     `json:"gm"`
	DDS      DDSComputed    `json:"dds"`
	// Синхронизация с OEBS-заглушкой (Ф23).
	OebsSyncAt string `json:"oebsSyncAt"`
}

// ArticleRow — статья бюджета: помесячные план/прогноз/факт.
type ArticleRow struct {
	ID       string             `json:"id"`
	Article  string             `json:"article"`
	IsRevenue bool              `json:"isRevenue"`
	MilestoneID string          `json:"milestoneId"`
	Plan     map[string]float64 `json:"plan"`
	Forecast map[string]float64 `json:"forecast"`
	Actual   map[string]float64 `json:"actual"`
	Total struct {
		Plan     float64 `json:"plan"`
		Forecast float64 `json:"forecast"`
		Actual   float64 `json:"actual"`
	} `json:"total"`
}

type TotalsMonthly struct {
	Plan     map[string]float64 `json:"plan"`
	Forecast map[string]float64 `json:"forecast"`
	Actual   map[string]float64 `json:"actual"`
	Total    struct {
		Plan     float64 `json:"plan"`
		Forecast float64 `json:"forecast"`
		Actual   float64 `json:"actual"`
	} `json:"total"`
}

// GMComputed — маржинальность: итог и помесячно.
type GMComputed struct {
	Plan     float64 `json:"plan"`
	Forecast float64 `json:"forecast"`
	Actual   float64 `json:"actual"`
	Monthly  []GMMonth `json:"monthly"`
}

type GMMonth struct {
	Month    string  `json:"month"`
	Plan     float64 `json:"plan"`
	Forecast float64 `json:"forecast"`
	Actual   float64 `json:"actual"`
}

// DDSComputed — движение денежных средств (Ф24): входящие/исходящие по месяцам,
// кассовый разрыв месяца = исходящие − входящие.
type DDSComputed struct {
	Monthly []DDSMonth `json:"monthly"`
}

type DDSMonth struct {
	Month string  `json:"month"`
	In    DDSside `json:"in"`
	Out   DDSside `json:"out"`
	Gap   DDSside `json:"gap"` // >0 — исходящие превышают входящие (разрыв)
}

type DDSside struct {
	Plan     float64 `json:"plan"`
	Forecast float64 `json:"forecast"`
	Actual   float64 `json:"actual"`
}

// ComputeFinance — расчёт финансов проекта (вызывается после RecalcSchedule).
func ComputeFinance(p *model.Project) FinanceComputed {
	fc := FinanceComputed{OebsSyncAt: "01.04.2024 06:00"}

	monthSet := map[string]bool{}
	for i := range p.Budget {
		b := &p.Budget[i]
		forecast := BudgetForecast(p, b)
		row := ArticleRow{
			ID: b.ID, Article: string(b.Article), IsRevenue: b.IsRevenue,
			MilestoneID: b.MilestoneID, Plan: b.Plan, Forecast: forecast, Actual: b.Actual,
		}
		for _, m := range []map[string]float64{b.Plan, forecast, b.Actual} {
			for k := range m {
				monthSet[k] = true
			}
		}
		fc.Articles = append(fc.Articles, row)
	}
	fc.Months = sortedSet(monthSet)
	sort.Strings(fc.Months)

	get := func(m map[string]float64, k string) float64 { return m[k] }

	fc.Revenue.Plan, fc.Revenue.Forecast, fc.Revenue.Actual = map[string]float64{}, map[string]float64{}, map[string]float64{}
	fc.Cost.Plan, fc.Cost.Forecast, fc.Cost.Actual = map[string]float64{}, map[string]float64{}, map[string]float64{}
	for _, row := range fc.Articles {
		var tgt *TotalsMonthly
		if row.IsRevenue {
			tgt = &fc.Revenue
		} else {
			tgt = &fc.Cost
		}
		for _, m := range fc.Months {
			tgt.Plan[m] += get(row.Plan, m)
			tgt.Forecast[m] += get(row.Forecast, m)
			tgt.Actual[m] += get(row.Actual, m)
		}
		tgt.Total.Plan += sumMap(row.Plan)
		tgt.Total.Forecast += sumMap(row.Forecast)
		tgt.Total.Actual += sumMap(row.Actual)
	}

	// Итоги по статьям.
	for i := range fc.Articles {
		fc.Articles[i].Total.Plan = sumMap(fc.Articles[i].Plan)
		fc.Articles[i].Total.Forecast = sumMap(fc.Articles[i].Forecast)
		fc.Articles[i].Total.Actual = sumMap(fc.Articles[i].Actual)
	}

	fc.GM = GMComputed{
		Plan:     gmOf(fc.Revenue.Total.Plan, fc.Cost.Total.Plan),
		Forecast: gmOf(fc.Revenue.Total.Forecast, fc.Cost.Total.Forecast),
		Actual:   gmOf(fc.Revenue.Total.Actual, fc.Cost.Total.Actual),
	}
	for _, m := range fc.Months {
		fc.GM.Monthly = append(fc.GM.Monthly, GMMonth{
			Month:    m,
			Plan:     gmOf(fc.Revenue.Plan[m], fc.Cost.Plan[m]),
			Forecast: gmOf(fc.Revenue.Forecast[m], fc.Cost.Forecast[m]),
			Actual:   gmOf(fc.Revenue.Actual[m], fc.Cost.Actual[m]),
		})
	}

	// ДДС: входящие = выручка, исходящие = затраты (Ф24).
	for _, m := range fc.Months {
		dm := DDSMonth{Month: m}
		dm.In = DDSside{Plan: fc.Revenue.Plan[m], Forecast: fc.Revenue.Forecast[m], Actual: fc.Revenue.Actual[m]}
		dm.Out = DDSside{Plan: fc.Cost.Plan[m], Forecast: fc.Cost.Forecast[m], Actual: fc.Cost.Actual[m]}
		dm.Gap = DDSside{
			Plan:     dm.Out.Plan - dm.In.Plan,
			Forecast: dm.Out.Forecast - dm.In.Forecast,
			Actual:   dm.Out.Actual - dm.In.Actual,
		}
		fc.DDS.Monthly = append(fc.DDS.Monthly, dm)
	}
	return fc
}

func gmOf(revenue, cost float64) float64 {
	if revenue == 0 {
		return 0
	}
	return (revenue - cost) / revenue
}

func sumMap(m map[string]float64) float64 {
	s := 0.0
	for _, v := range m {
		s += v
	}
	return s
}

func sortedSet(set map[string]bool) []string {
	out := make([]string, 0, len(set))
	for k := range set {
		out = append(out, k)
	}
	return out
}

// CashGapForecast — суммарный кассовый разрыв по месяцам (прогноз), млн ₽.
// Используется для влияния ЗИ и песочницы.
func CashGapForecast(fc FinanceComputed) float64 {
	s := 0.0
	for _, m := range fc.DDS.Monthly {
		if m.Gap.Forecast > 0 {
			s += m.Gap.Forecast
		}
	}
	return s
}
