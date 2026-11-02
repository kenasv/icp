package engine

import (
	"fmt"

	"isup/internal/model"
)

// Zone — зона здоровья: green / yellow / red (🟢🟡🔴).
type Zone string

const (
	ZoneGreen  Zone = "green"
	ZoneYellow Zone = "yellow"
	ZoneRed    Zone = "red"
)

// HealthComputed — здоровье проекта по трём показателям (Ф32):
// сроки (отклонение вех от базового плана, дней), выручка (прогноз/план, %),
// GM (прогноз − план, п.п.). Пороги зафиксированы ниже.
type HealthComputed struct {
	Schedule struct {
		Zone   Zone   `json:"zone"`
		DevDays int   `json:"devDays"`
		Reason string `json:"reason"`
	} `json:"schedule"`
	Revenue struct {
		Zone   Zone     `json:"zone"`
		DevPct float64  `json:"devPct"`
		Reason string   `json:"reason"`
	} `json:"revenue"`
	GM struct {
		Zone    Zone    `json:"zone"`
		DevPP   float64 `json:"devPp"`
		Reason  string  `json:"reason"`
	} `json:"gm"`
	Overall      Zone   `json:"overall"`
	OverallReason string `json:"overallReason"` // причина для тултипа реестра (Ф10)
}

// Пороги здоровья (Ф32): зафиксированные шкалы.
const (
	scheduleGreenDays  = 7  // до 7 дней включительно — зелёная зона
	scheduleYellowDays = 30 // до 30 дней — жёлтая
	revenueGreenPct    = 5  // отклонение выручки до 5% — зелёная
	revenueYellowPct   = 15
	gmGreenPP          = 2 // отклонение GM до 2 п.п. — зелёная
	gmYellowPP         = 5
)

func zoneBy(value, green, yellow float64) Zone {
	switch {
	case value <= green:
		return ZoneGreen
	case value <= yellow:
		return ZoneYellow
	default:
		return ZoneRed
	}
}

// ComputeHealth — расчёт здоровья по выходу движка (строки СДР + финансы).
func ComputeHealth(p *model.Project, rows []WBSRow, fc FinanceComputed) HealthComputed {
	var h HealthComputed

	// Сроки: максимальное отклонение вехи от базового плана.
	maxDev := 0
	worstName := ""
	for _, r := range rows {
		if r.Type != model.WBSMilestone || !r.HasBase {
			continue
		}
		if r.DevDays > maxDev {
			maxDev = r.DevDays
			worstName = r.Name
		}
	}
	h.Schedule.DevDays = maxDev
	h.Schedule.Zone = zoneBy(float64(maxDev), scheduleGreenDays, scheduleYellowDays)
	h.Schedule.Reason = fmt.Sprintf("Максимальный сдвиг вехи: %d дн.", maxDev)
	if worstName != "" {
		h.Schedule.Reason = fmt.Sprintf("Веха «%s» сдвинута на %d дн.", worstName, maxDev)
		// Если за вехой стоит задержавшаяся закупка — указываем её (Ф10, тултип).
		for _, r := range rows {
			if r.Name == worstName && r.Purchase != nil && r.Purchase.DevDays > 0 {
				h.Schedule.Reason += fmt.Sprintf(" (задержка закупки %s +%d дн.)", r.Purchase.Number, r.Purchase.DevDays)
			}
		}
	}
	if p.Status == model.StatusDone || p.Status == model.StatusArchived {
		h.Schedule.Zone = ZoneGreen
		h.Schedule.Reason = "Проект завершён"
	}
	if LatestBaseline(p) == nil {
		h.Schedule.Zone = ZoneGreen
		h.Schedule.Reason = "Базовый план не утверждён (стадия планирования)"
	}

	// Выручка: отклонение итогового прогноза от плана.
	revDev := 0.0
	if fc.Revenue.Total.Plan > 0 {
		revDev = abs(fc.Revenue.Total.Forecast-fc.Revenue.Total.Plan) / fc.Revenue.Total.Plan * 100
	}
	h.Revenue.DevPct = round2(revDev)
	h.Revenue.Zone = zoneBy(revDev, revenueGreenPct, revenueYellowPct)
	h.Revenue.Reason = fmt.Sprintf("Отклонение выручки (прогноз/план): %.1f%%", revDev)

	// GM: отклонение прогноза от плана в процентных пунктах.
	gmDev := (fc.GM.Forecast - fc.GM.Plan) * 100
	h.GM.DevPP = round2(gmDev)
	h.GM.Zone = zoneBy(abs(gmDev), gmGreenPP, gmYellowPP)
	h.GM.Reason = fmt.Sprintf("GM: план %.1f%%, прогноз %.1f%% (%+.1f п.п.)", fc.GM.Plan*100, fc.GM.Forecast*100, gmDev)

	// Итог — худшая зона; причина — по худшему показателю.
	zones := []struct {
		z     Zone
		reason string
		weight int
	}{{h.Schedule.Zone, h.Schedule.Reason, 1}, {h.Revenue.Zone, h.Revenue.Reason, 2}, {h.GM.Zone, h.GM.Reason, 3}}
	h.Overall = ZoneGreen
	h.OverallReason = "Отклонений нет"
	for _, z := range zones {
		if zoneWeight(z.z) > zoneWeight(h.Overall) {
			h.Overall = z.z
			h.OverallReason = z.reason
		}
	}
	return h
}

func zoneWeight(z Zone) int {
	switch z {
	case ZoneRed:
		return 3
	case ZoneYellow:
		return 2
	default:
		return 1
	}
}

func abs(x float64) float64 {
	if x < 0 {
		return -x
	}
	return x
}

func round2(x float64) float64 {
	return float64(int(x*100+0.5*sign(x))) / 100
}

func sign(x float64) float64 {
	if x < 0 {
		return -1
	}
	return 1
}
