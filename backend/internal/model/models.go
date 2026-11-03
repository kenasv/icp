// Package model — доменная модель ИСУП (см. требования, раздел «Доменная модель»).
// Все суммы — в млн ₽, даты — календарные (без времени).
package model

import "time"

// DateLayout — формат дат в API (ISO, во фронтенде отображается как ДД.ММ.ГГГГ).
const DateLayout = "2006-01-02"

// MonthLayout — ключ помесячных финансовых данных.
const MonthLayout = "2006-01"

// DemoNow — «текущая дата» демо (период март–июнь 2024).
var DemoNow = time.Date(2024, 4, 1, 12, 0, 0, 0, time.UTC)

// NewDate — конструктор даты без времени.
func NewDate(y int, m time.Month, d int) time.Time {
	return time.Date(y, m, d, 0, 0, 0, 0, time.UTC)
}

// MonthKey — ключ месяца для финансовых карт.
func MonthKey(t time.Time) string { return t.Format(MonthLayout) }

// ============ Справочники (Ф12) ============

type Client struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	INN     string `json:"inn"`
	Segment string `json:"segment"`
	Region  string `json:"region"`
}

type Supplier struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type Employee struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Position string `json:"position"` // РП | Инженер | Менеджер по закупкам | Директор департамента
}

// Product — позиция справочника продуктов: выбирается в карточке пресейла.
type Product struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// Region — позиция справочника регионов: выбирается в карточке пресейла.
type Region struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// ============ Пресейл и воронка (Ф1–Ф6) ============

// Stage — этап воронки. Вероятность этапа используется по умолчанию,
// у конкретного пресейла она может быть переопределена (например, тендер 25%).
type Stage struct {
	ID           string  `json:"id"`
	Name         string  `json:"name"`
	Probability  float64 `json:"probability"` // 0..1
	Order        int     `json:"order"`
}

// Work — позиция справочника видов работ: из него набирается состав работ
// планируемого проекта на этапе пресейла.
type Work struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// ScopeItem — строка состава работ планируемого проекта: вид работ из справочника,
// плановая дата реализации и плановая стоимость (млн ₽). Заполняется в пресейле,
// при передаче в проект переносится и превращается в статьи бюджета затрат.
type ScopeItem struct {
	WorkID string    `json:"workId"`
	Name   string    `json:"name"`
	Date   time.Time `json:"date"`
	Cost   float64   `json:"cost"`
}

// ScopeCost — суммарные плановые затраты по составу работ.
func ScopeCost(items []ScopeItem) float64 {
	s := 0.0
	for _, it := range items {
		s += it.Cost
	}
	return s
}

type StageChange struct {
	Date     time.Time `json:"date"`
	FromStage string   `json:"fromStage"`
	ToStage   string   `json:"toStage"`
	Comment  string    `json:"comment,omitempty"`
}

type Presale struct {
	ID                   string        `json:"id"`
	Number               string        `json:"number"`
	Name                 string        `json:"name"`
	ClientID             string        `json:"clientId"`
	Product              string        `json:"product"`
	Region               string        `json:"region"`
	Amount               float64       `json:"amount"` // плановая выручка от проекта, млн ₽
	StageID              string        `json:"stageId"`
	ProbabilityOverride  *float64      `json:"probabilityOverride,omitempty"` // 0..1
	Team                 []string      `json:"team"`                         // ID сотрудников
	LeadSource           string        `json:"leadSource"`
	Scope                []ScopeItem   `json:"scope"` // состав работ планируемого проекта
	StageHistory         []StageChange `json:"stageHistory"`
	ProjectID            string        `json:"projectId,omitempty"` // связь «пресейл → проект»
	ConvertedAt          *time.Time    `json:"convertedAt,omitempty"`
}

// Probability — итоговая вероятность пресейла (override либо вероятность этапа).
func (p *Presale) Probability(stageByID map[string]*Stage) float64 {
	if p.ProbabilityOverride != nil {
		return *p.ProbabilityOverride
	}
	if s, ok := stageByID[p.StageID]; ok {
		return s.Probability
	}
	return 0
}

// ============ Проект (Ф7–Ф12) ============

type ProjectStatus string

const (
	StatusPlanning   ProjectStatus = "Планирование"
	StatusInProgress ProjectStatus = "В реализации"
	StatusDone       ProjectStatus = "Завершён"
	StatusArchived   ProjectStatus = "Архив"
)

type Project struct {
	ID             string        `json:"id"` // PRJ-ГГГГ-NNN
	Name           string        `json:"name"`
	ClientID       string        `json:"clientId"`
	Product        string        `json:"product"`
	Region         string        `json:"region"`
	Type           string        `json:"type"`
	ContractAmount float64       `json:"contractAmount"` // плановая выручка от проекта, млн ₽
	Status         ProjectStatus `json:"status"`
	Note           string        `json:"note,omitempty"` // примечание для реестра портфеля
	PresaleID      string        `json:"presaleId"` // связка пресейл—проект обязательна (Ф7)
	Scope          []ScopeItem   `json:"scope"`     // состав работ (переносится из пресейла, Ф6)
	Team           []TeamMember  `json:"team"`
	WBS            []WBSItem     `json:"wbs"`
	Budget         []BudgetItem  `json:"budget"`
	Purchases      []Purchase    `json:"purchases"`
	Risks          []Risk        `json:"risks"`
	Baselines      []Baseline    `json:"baselines"`
	Events         []Event       `json:"events"`
	Scenarios      []Scenario    `json:"scenarios"`
}

// EnsureSlices — заменяет nil-срезы на пустые, чтобы API не отдавал JSON null
// там, где фронтенд ждёт массив (актуально для проектов, созданных из пресейла
// до первого базового плана/риска/события).
func (p *Project) EnsureSlices() {
	if p.Team == nil {
		p.Team = []TeamMember{}
	}
	if p.WBS == nil {
		p.WBS = []WBSItem{}
	}
	if p.Budget == nil {
		p.Budget = []BudgetItem{}
	}
	if p.Purchases == nil {
		p.Purchases = []Purchase{}
	}
	if p.Risks == nil {
		p.Risks = []Risk{}
	}
	if p.Baselines == nil {
		p.Baselines = []Baseline{}
	}
	if p.Events == nil {
		p.Events = []Event{}
	}
	if p.Scenarios == nil {
		p.Scenarios = []Scenario{}
	}
	if p.Scope == nil {
		p.Scope = []ScopeItem{}
	}
}

// TeamMember — назначение участника с ролью (Ф35).
type TeamMember struct {
	EmployeeID string `json:"employeeId"`
	Role       string `json:"role"` // РП | Инженер | Менеджер по закупкам
}

// ============ СДР, Гант, зависимости (Ф13–Ф20) ============

type WBSType string

const (
	WBSPhase     WBSType = "phase"     // этап (верхний уровень СДР)
	WBSWork      WBSType = "work"      // работа
	WBSMilestone WBSType = "milestone" // веха
)

// Dependency — связь «финиш-старт» с лагом в днях (Ф15):
// старт задачи >= финиш предшественника + лаг.
type Dependency struct {
	FromID  string `json:"fromId"`
	LagDays int    `json:"lagDays"`
}

type WBSItem struct {
	ID           string       `json:"id"`
	ParentID     string       `json:"parentId,omitempty"`
	Type         WBSType      `json:"type"`
	Name         string       `json:"name"`
	Start        time.Time    `json:"start"` // текущий прогноз
	End          time.Time    `json:"end"`   // для вехи End == Start
	DurationDays int          `json:"durationDays,omitempty"`
	Dependencies []Dependency `json:"dependencies,omitempty"` // FS + лаг
	PurchaseID   string       `json:"purchaseId,omitempty"`   // привязка закупки (для вех)
	BudgetItemIDs []string    `json:"budgetItemIds,omitempty"` // привязки статей (для карточки привязок Ф16)
}

// ============ Закупки (Ф27–Ф29) ============

type PurchaseStatus string

const (
	PurchaseCreated    PurchaseStatus = "создана"
	PurchaseOrdered    PurchaseStatus = "заказ размещён"
	PurchaseContracted PurchaseStatus = "договор подписан"
	PurchaseReceived   PurchaseStatus = "получено"
)

type Purchase struct {
	ID           string         `json:"id"`
	Number       string         `json:"number"` // З-ГГГГ-NNN
	Name         string         `json:"name"`
	SupplierID   string         `json:"supplierId"`
	Amount       float64        `json:"amount"` // млн ₽
	Status       PurchaseStatus `json:"status"`
	PlanDate     time.Time      `json:"planDate"`
	ForecastDate time.Time      `json:"forecastDate"`
	MilestoneID  string         `json:"milestoneId"`
	BudgetItemID string         `json:"budgetItemID"`
}

// ============ Финансы и ДДС (Ф21–Ф26) ============

type BudgetArticle string

const (
	ArticleRevenue     BudgetArticle = "Выручка"
	ArticleEquipment   BudgetArticle = "Оборудование"
	ArticleWorks       BudgetArticle = "Работы"
	ArticleSubcontract BudgetArticle = "Подряд"
	ArticleOther       BudgetArticle = "Прочее"
)

// BudgetItem — статья бюджета с помесячным планом; прогноз пересчитывает движок.
// План размазан по месяцам относительно месяца вехи-якоря; выставление/оплата
// может иметь лаг в месяцах (BillingLagMonths), например счёт в месяце после вехи.
type BudgetItem struct {
	ID               string                  `json:"id"`
	ProjectID        string                  `json:"projectId"`
	IsRevenue        bool                    `json:"isRevenue"`
	Article          BudgetArticle           `json:"article"`
	MilestoneID      string                  `json:"milestoneId"` // веха-якорь
	BillingLagMonths int                     `json:"billingLagMonths"`
	Plan             map[string]float64      `json:"plan"`   // "2024-03" -> млн ₽
	Actual           map[string]float64      `json:"actual"` // факт из OEBS-заглушки (Ф23)
	Note             string                  `json:"note,omitempty"`
}

// ============ Риски (Ф30–Ф32) ============

type Probability string // низкая | средняя | высокая
const (
	ProbLow    Probability = "низкая"
	ProbMedium Probability = "средняя"
	ProbHigh   Probability = "высокая"
)

type Impact string // низкое | среднее | высокое
const (
	ImpactLow    Impact = "низкое"
	ImpactMedium Impact = "среднее"
	ImpactHigh   Impact = "высокое"
)

type Risk struct {
	ID          string     `json:"id"`
	Name        string     `json:"name"`
	Probability Probability `json:"probability"`
	Impact      Impact     `json:"impact"`
	Owner       string     `json:"owner"`   // сотрудник
	DueDate     time.Time  `json:"dueDate"`
	Status      string     `json:"status"` // открыт | закрыт
}

// RiskLevel — уровень риска по матрице 3x3 (1..9), 1-2 🟢, 3-4 🟡, 6-9 🔴.
func RiskLevel(p Probability, i Impact) int {
	pm := map[Probability]int{ProbLow: 1, ProbMedium: 2, ProbHigh: 3}
	im := map[Impact]int{ImpactLow: 1, ImpactMedium: 2, ImpactHigh: 3}
	return pm[p] * im[i]
}

// ============ Базовые планы и запросы на изменение (Ф17, Ф33–Ф34) ============

type ItemSnapshot struct {
	ItemID string    `json:"itemId"`
	Name   string    `json:"name"`
	Type   WBSType   `json:"type"`
	Start  time.Time `json:"start"`
	End    time.Time `json:"end"`
}

type MonthlySnapshot struct {
	Month   string  `json:"month"`
	Revenue float64 `json:"revenue"`
	Cost    float64 `json:"cost"`
}

// Baseline — версия базового плана: срез дат элементов СДР (вехи + работы)
// и помесячных финансов на момент утверждения (Ф17).
type Baseline struct {
	Version    int               `json:"version"` // v1, v2, ...
	ApprovedAt time.Time         `json:"approvedAt"`
	ApprovedBy string            `json:"approvedBy"`
	Items      []ItemSnapshot    `json:"items"`
	Finance    []MonthlySnapshot `json:"finance"`
	Comment    string            `json:"comment,omitempty"`
}

type CRStatus string

const (
	CRDraft    CRStatus = "черновик"
	CRReview   CRStatus = "на согласовании"
	CRApproved CRStatus = "утверждён"
)

type CRType string

const (
	CRSchedule CRType = "сроки"
	CRBudget   CRType = "бюджет"
	CRGM       CRType = "GM"
)

// ChangeRequest — запрос на изменение базового плана.
// Влияние (GM п.п., ДДС млн ₽) подставляется автоматически движком (Ф34).
type ChangeRequest struct {
	ID          string       `json:"id"` // ЗИ-ГГГГ-NNN
	ProjectID   string       `json:"projectId"`
	Type        CRType       `json:"type"`
	Reason      string       `json:"reason"`
	Description string       `json:"description"`
	ImpactGMpp  float64      `json:"impactGmPp"`  // влияние на GM, п.п.
	ImpactDDS   float64      `json:"impactDds"`   // влияние на ДДС (млн ₽, рост разрыва)
	Status      CRStatus     `json:"status"`
	ScenarioID  string       `json:"scenarioId,omitempty"`
	CreatedAt   time.Time    `json:"createdAt"`
	Author      string       `json:"author"`
}

// ============ Сценарии what-if (пояснение «What-if песочница») ============

type ScenarioOp struct {
	Kind        string    `json:"kind"` // shiftMilestone | shiftDuration | addCost | shiftWork
	TargetID    string    `json:"targetId,omitempty"`
	ShiftDays   int       `json:"shiftDays,omitempty"`
	DurationDelta int     `json:"durationDelta,omitempty"` // изменение длительности работы, дней
	Article     string    `json:"article,omitempty"`       // для addCost
	Amount      float64   `json:"amount,omitempty"`        // млн ₽
	Month       string    `json:"month,omitempty"`         // "2024-04"
}

type Scenario struct {
	ID        string       `json:"id"`
	ProjectID string       `json:"projectId"`
	Name      string       `json:"name"`
	Ops       []ScenarioOp `json:"ops"`
	CreatedAt time.Time    `json:"createdAt"`
}

// ============ Лента событий (пояснение «Лента здоровья проекта») ============

type EventType string

const (
	EventStatus      EventType = "статус"
	EventApproval    EventType = "согласование"
	EventChange      EventType = "изменение"
	EventRisk        EventType = "риск"
	EventDeviation   EventType = "отклонение"
	EventAIComment   EventType = "комментарий ИИ"
)

type Event struct {
	ID        string    `json:"id"`
	ProjectID string    `json:"projectId,omitempty"`
	At        time.Time `json:"at"`
	Type      EventType `json:"type"`
	Text      string    `json:"text"`
	Author    string    `json:"author,omitempty"`
}
