// Package equip — сервис импорта состава оборудования проекта из Excel:
// первая колонка — наименование единицы оборудования, вторая — количество.
// Сумма и прогнозная дата поставки присваиваются случайно, статус — «Планируется»
// (справочник статусов оборудования — model.EquipmentStatuses).
package equip

import (
	"fmt"
	"io"
	"math/rand"
	"strconv"
	"strings"
	"time"

	"github.com/xuri/excelize/v2"

	"isup/internal/model"
)

// Row — распарсенная строка файла.
type Row struct {
	Name string
	Qty  int
}

// Parse читает .xlsx и возвращает строки оборудования (пропуская заголовок,
// если вторая ячейка первой строки — не число).
func Parse(r io.Reader) ([]Row, error) {
	f, err := excelize.OpenReader(r)
	if err != nil {
		return nil, fmt.Errorf("не удалось прочитать Excel-файл: %w", err)
	}
	defer f.Close()

	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		return nil, fmt.Errorf("в файле нет листов")
	}
	rows, err := f.GetRows(sheets[0])
	if err != nil {
		return nil, fmt.Errorf("не удалось прочитать лист: %w", err)
	}

	var out []Row
	for i, row := range rows {
		name := ""
		if len(row) > 0 {
			name = strings.TrimSpace(row[0])
		}
		if name == "" {
			continue
		}
		qtyStr := ""
		if len(row) > 1 {
			qtyStr = strings.TrimSpace(row[1])
		}
		qty, convErr := strconv.Atoi(qtyStr)
		if convErr != nil {
			// Первая строка с нечисловым количеством — считаем заголовком и пропускаем.
			if i == 0 {
				continue
			}
			qty = 1 // количество не указано — одна единица
		}
		if qty <= 0 {
			qty = 1
		}
		out = append(out, Row{Name: name, Qty: qty})
	}
	if len(out) == 0 {
		return nil, fmt.Errorf("в файле не найдено строк с оборудованием (нужны столбцы: наименование, количество)")
	}
	return out, nil
}

// Fill — присваивает строкам случайные сумму (0,1–2,0 млн ₽) и прогнозную дату
// поставки (в горизонте 120 дней от from), статус — «Планируется».
func Fill(rows []Row, from time.Time, rnd *rand.Rand) []model.Equipment {
	out := make([]model.Equipment, 0, len(rows))
	for i, r := range rows {
		amount := 0.1 + rnd.Float64()*1.9
		forecast := from.AddDate(0, 0, 1+rnd.Intn(120))
		out = append(out, model.Equipment{
			ID:       fmt.Sprintf("EQ-%03d", i+1),
			Name:     r.Name,
			Qty:      r.Qty,
			Amount:   float64(int(amount*10)) / 10,
			Forecast: forecast,
			Status:   model.EquipPlanned,
		})
	}
	return out
}

// VolumeRow — строка сметного расчёта на работы: наименование + объём работ.
type VolumeRow struct {
	Name   string
	Volume string
}

// ParseEstimate читает .xlsx сметного расчёта: столбец 1 — наименование работы,
// столбец 2 — объём работ (произвольная строка). Заголовок пропускается по
// словам «наименование»/«объём» в ячейках первой строки.
func ParseEstimate(r io.Reader) ([]VolumeRow, error) {
	f, err := excelize.OpenReader(r)
	if err != nil {
		return nil, fmt.Errorf("не удалось прочитать Excel-файл: %w", err)
	}
	defer f.Close()

	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		return nil, fmt.Errorf("в файле нет листов")
	}
	rows, err := f.GetRows(sheets[0])
	if err != nil {
		return nil, fmt.Errorf("не удалось прочитать лист: %w", err)
	}

	var out []VolumeRow
	for i, row := range rows {
		name := ""
		if len(row) > 0 {
			name = strings.TrimSpace(row[0])
		}
		if name == "" {
			continue
		}
		volume := ""
		if len(row) > 1 {
			volume = strings.TrimSpace(row[1])
		}
		// Строка-заголовок: «наименование» или «объём» в ячейках первой строки.
		lower := strings.ToLower(name + " " + volume)
		if i == 0 && (strings.Contains(lower, "наименован") || strings.Contains(lower, "объём") || strings.Contains(lower, "объем")) {
			continue
		}
		if volume == "" {
			volume = "—"
		}
		out = append(out, VolumeRow{Name: name, Volume: volume})
	}
	if len(out) == 0 {
		return nil, fmt.Errorf("в файле не найдено строк работ (нужны столбцы: наименование, объём работ)")
	}
	return out, nil
}

// FillEstimate — строки сметы со случайной суммой (0,1–2,0 млн ₽) на позицию.
func FillEstimate(rows []VolumeRow, rnd *rand.Rand) []model.EstimateItem {
	out := make([]model.EstimateItem, 0, len(rows))
	for _, r := range rows {
		amount := 0.1 + rnd.Float64()*1.9
		out = append(out, model.EstimateItem{
			Name:   r.Name,
			Volume: r.Volume,
			Amount: float64(int(amount*10)) / 10,
		})
	}
	return out
}
