package engine

import (
	"isup/internal/model"
)

// FunnelStageMetrics — метрики этапа воронки (Ф4): количество, сумма, взвешенная сумма.
type FunnelStageMetrics struct {
	StageID     string  `json:"stageId"`
	Name        string  `json:"name"`
	Probability float64 `json:"probability"`
	Count       int     `json:"count"`
	Sum         float64 `json:"sum"`
	Weighted    float64 `json:"weighted"`
}

// FunnelConversion — конверсия между соседними этапами.
type FunnelConversion struct {
	From string  `json:"from"`
	To   string  `json:"to"`
	Rate float64 `json:"rate"` // 0..1
}

// FunnelComputed — воронка пресейлов (Ф2–Ф5).
type FunnelComputed struct {
	Stages       []FunnelStageMetrics `json:"stages"`
	TotalCount   int                  `json:"totalCount"`
	TotalSum     float64              `json:"totalSum"`
	TotalWeighted float64             `json:"totalWeighted"` // прогноз выручки по взвешенной воронке (Ф5)
	Conversions  []FunnelConversion   `json:"conversions"`
}

// ComputeFunnel — метрики воронки по активным (не переданным в проекты) пресейлам.
func ComputeFunnel(presales []*model.Presale, stages []model.Stage) FunnelComputed {
	stageByID := map[string]*model.Stage{}
	for i := range stages {
		stageByID[stages[i].ID] = &stages[i]
	}
	// Этапы в порядке воронки.
	ordered := append([]model.Stage(nil), stages...)
	for i := 1; i < len(ordered); i++ {
		for j := i; j > 0 && ordered[j].Order < ordered[j-1].Order; j-- {
			ordered[j], ordered[j-1] = ordered[j-1], ordered[j]
		}
	}

	fc := FunnelComputed{Stages: []FunnelStageMetrics{}}
	counts := map[string]int{}
	for i := range ordered {
		st := &ordered[i]
		fc.Stages = append(fc.Stages, FunnelStageMetrics{
			StageID: st.ID, Name: st.Name, Probability: st.Probability,
		})
		counts[st.ID] = 0
	}
	idx := map[string]int{}
	for i := range fc.Stages {
		idx[fc.Stages[i].StageID] = i
	}

	for _, ps := range presales {
		if ps.ProjectID != "" { // переданные в проекты не участвуют в воронке
			continue
		}
		i, ok := idx[ps.StageID]
		if !ok {
			continue
		}
		prob := ps.Probability(stageByID)
		fc.Stages[i].Count++
		fc.Stages[i].Sum += ps.Amount
		fc.Stages[i].Weighted += ps.Amount * prob
		fc.TotalCount++
		fc.TotalSum += ps.Amount
		fc.TotalWeighted += ps.Amount * prob
	}

	// Конверсии: доля пресейлов на этапе i+1 и дальше от количества на этапе i и дальше.
	for i := 0; i+1 < len(fc.Stages); i++ {
		before, after := 0, 0
		for j := i; j < len(fc.Stages); j++ {
			before += fc.Stages[j].Count
		}
		for j := i + 1; j < len(fc.Stages); j++ {
			after += fc.Stages[j].Count
		}
		rate := 0.0
		if before > 0 {
			rate = float64(after) / float64(before)
		}
		fc.Conversions = append(fc.Conversions, FunnelConversion{
			From: fc.Stages[i].Name, To: fc.Stages[i+1].Name, Rate: rate,
		})
	}
	return fc
}

// PresaleWeighted — взвешенная сумма пресейла (Ф5): сумма × вероятность.
func PresaleWeighted(ps *model.Presale, stageByID map[string]*model.Stage) float64 {
	return ps.Amount * ps.Probability(stageByID)
}
