// Package store — хранилище ИСУП с предзагруженными демо-данными.
// Рабочее состояние хранится в PostgreSQL (internal/pg, включается через ISUP_DB_DSN);
// без DSN хранилище работает в памяти процесса (локальная разработка, тесты).
// Факт финансов — модуль-заглушка «OEBS-факт» (требование 4.1.2).
package store

import (
	"fmt"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"isup/internal/engine"
	"isup/internal/model"
)

type Store struct {
	mu             sync.RWMutex
	Clients        map[string]model.Client
	Suppliers      map[string]model.Supplier
	Employees      map[string]model.Employee
	Stages         []model.Stage
	Presales       map[string]*model.Presale
	Projects       map[string]*model.Project
	ChangeRequests map[string]*model.ChangeRequest
	BPMN           map[string]string // key -> BPMN XML (кастомизация сохраняется здесь)
	eventSeq       int
}

// NewEmpty — пустое хранилище без демо-данных (сюда загружается состояние из PostgreSQL).
func NewEmpty() *Store {
	return &Store{
		Clients:        map[string]model.Client{},
		Suppliers:      map[string]model.Supplier{},
		Employees:      map[string]model.Employee{},
		Presales:       map[string]*model.Presale{},
		Projects:       map[string]*model.Project{},
		ChangeRequests: map[string]*model.ChangeRequest{},
		BPMN:           map[string]string{},
	}
}

// New — создаёт хранилище и загружает демо-данные портфеля «Цифровизация B2B».
func New() *Store {
	s := NewEmpty()
	s.seed()
	return s
}

// PostLoad — восстановление служебных последовательностей после загрузки из БД.
func (s *Store) PostLoad() {
	for _, p := range s.Projects {
		for _, ev := range p.Events {
			var n int
			if _, err := fmt.Sscanf(ev.ID, "EV-%d", &n); err == nil && n > s.eventSeq {
				s.eventSeq = n
			}
		}
	}
}

// Dirs — справочники для движка.
func (s *Store) Dirs() *engine.Directories {
	return &engine.Directories{Clients: s.Clients, Suppliers: s.Suppliers, Employees: s.Employees}
}

// RLockStore / RUnlockStore — доступ к данным для чтения (ИИ-провайдер, API).
func (s *Store) RLockStore()   { s.mu.RLock() }
func (s *Store) RUnlockStore() { s.mu.RUnlock() }

// LockStore / UnlockStore — эксклюзивный доступ (изменения).
func (s *Store) LockStore()    { s.mu.Lock() }
func (s *Store) UnlockStore()  { s.mu.Unlock() }

// ============ Справочники (Ф12) ============

// nextMapID — следующий свободный ID вида prefix-NNN в карте (существующие
// нечисловые суффиксы вроде cl-rzd пропускаются).
func nextMapID[V any](m map[string]V, prefix string) string {
	max := 0
	for k := range m {
		suffix := strings.TrimPrefix(k, prefix+"-")
		if suffix != k {
			if n, err := strconv.Atoi(suffix); err == nil && n > max {
				max = n
			}
		}
	}
	return fmt.Sprintf("%s-%03d", prefix, max+1)
}

// CreateClient — новая позиция справочника клиентов (Ф12). ИНН проверяется на дубли.
func (s *Store) CreateClient(c model.Client) (*model.Client, error) {
	c.Name = strings.TrimSpace(c.Name)
	if c.Name == "" {
		return nil, fmt.Errorf("укажите наименование клиента")
	}
	if c.INN != "" {
		for _, x := range s.Clients {
			if x.INN == c.INN {
				return nil, fmt.Errorf("клиент с ИНН %s уже есть в справочнике: %s", c.INN, x.Name)
			}
		}
	}
	if c.ID == "" {
		c.ID = nextMapID(s.Clients, "cl")
	}
	s.Clients[c.ID] = c
	return &c, nil
}

// CreateSupplier — новая позиция справочника поставщиков (Ф12).
func (s *Store) CreateSupplier(x model.Supplier) (*model.Supplier, error) {
	x.Name = strings.TrimSpace(x.Name)
	if x.Name == "" {
		return nil, fmt.Errorf("укажите наименование поставщика")
	}
	for _, v := range s.Suppliers {
		if v.Name == x.Name {
			return nil, fmt.Errorf("поставщик «%s» уже есть в справочнике", x.Name)
		}
	}
	if x.ID == "" {
		x.ID = nextMapID(s.Suppliers, "sup")
	}
	s.Suppliers[x.ID] = x
	return &x, nil
}

// CreateEmployee — новая позиция справочника сотрудников (Ф12).
func (s *Store) CreateEmployee(e model.Employee) (*model.Employee, error) {
	e.Name = strings.TrimSpace(e.Name)
	if e.Name == "" {
		return nil, fmt.Errorf("укажите ФИО сотрудника")
	}
	for _, v := range s.Employees {
		if v.Name == e.Name {
			return nil, fmt.Errorf("сотрудник «%s» уже есть в справочнике", e.Name)
		}
	}
	if e.Position == "" {
		e.Position = "Инженер"
	}
	if e.ID == "" {
		e.ID = nextMapID(s.Employees, "emp")
	}
	s.Employees[e.ID] = e
	return &e, nil
}

// ============ События ============

// AddEvent — запись в ленту здоровья проекта.
func (s *Store) AddEvent(p *model.Project, at time.Time, t model.EventType, text, author string) {
	s.eventSeq++
	p.Events = append(p.Events, model.Event{
		ID: fmt.Sprintf("EV-%d", s.eventSeq), ProjectID: p.ID, At: at, Type: t, Text: text, Author: author,
	})
	sort.SliceStable(p.Events, func(i, j int) bool { return p.Events[i].At.Before(p.Events[j].At) })
}

// ============ Пресейлы ============

// CreatePresale — заведение новой карточки пресейла из интерфейса (Ф1).
// Номер ПС-ГГГГ-NNN присваивается автоматически, история начинается с выбранного этапа.
func (s *Store) CreatePresale(ps model.Presale) (*model.Presale, error) {
	ps.Name = strings.TrimSpace(ps.Name)
	if ps.Name == "" {
		return nil, fmt.Errorf("укажите название пресейла")
	}
	if ps.ClientID == "" {
		return nil, fmt.Errorf("выберите клиента из справочника")
	}
	if _, ok := s.Clients[ps.ClientID]; !ok {
		return nil, fmt.Errorf("клиент %s не найден в справочнике", ps.ClientID)
	}
	stageOK := false
	for _, st := range s.Stages {
		if st.ID == ps.StageID {
			stageOK = true
			break
		}
	}
	if !stageOK {
		return nil, fmt.Errorf("неизвестный этап воронки: %s", ps.StageID)
	}
	if ps.Amount <= 0 {
		return nil, fmt.Errorf("сумма должна быть больше нуля")
	}
	// Следующий свободный номер ПС-ГГГГ-NNN.
	max := 0
	for _, p := range s.Presales {
		parts := strings.Split(p.Number, "-")
		if len(parts) == 3 {
			if n, err := strconv.Atoi(parts[2]); err == nil && n > max {
				max = n
			}
		}
	}
	ps.ID = fmt.Sprintf("PS-2024-%03d", max+1)
	ps.Number = fmt.Sprintf("ПС-2024-%03d", max+1)
	ps.ProjectID = ""
	ps.StageHistory = []model.StageChange{{
		Date: model.DemoNow, ToStage: ps.StageID, Comment: "Карточка создана в интерфейсе",
	}}
	if ps.LeadSource == "" {
		ps.LeadSource = "Прочее"
	}
	s.Presales[ps.ID] = &ps
	return &ps, nil
}

// MovePresaleStage — смена этапа воронки (канбан, Ф3); история фиксируется.
func (s *Store) MovePresaleStage(id, stageID string) (*model.Presale, error) {
	ps, ok := s.Presales[id]
	if !ok {
		return nil, fmt.Errorf("пресейл %s не найден", id)
	}
	if ps.ProjectID != "" {
		return nil, fmt.Errorf("пресейл уже передан в проект %s", ps.ProjectID)
	}
	old := ps.StageID
	ps.StageID = stageID
	ps.StageHistory = append(ps.StageHistory, model.StageChange{
		Date: model.DemoNow, FromStage: old, ToStage: stageID,
	})
	return ps, nil
}

// ConvertPresale — передача пресейла в реализацию одной кнопкой (Ф6):
// создаётся проект, данные переносятся без повторного ввода.
func (s *Store) ConvertPresale(id string) (*model.Project, error) {
	ps, ok := s.Presales[id]
	if !ok {
		return nil, fmt.Errorf("пресейл %s не найден", id)
	}
	if ps.ProjectID != "" {
		return nil, fmt.Errorf("пресейл уже передан в проект %s", ps.ProjectID)
	}
	num := s.nextProjectNumber()
	p := &model.Project{
		ID:             num,
		Name:           ps.Name,
		ClientID:       ps.ClientID,
		Product:        ps.Product,
		Region:         ps.Region,
		Type:           "Проект",
		ContractAmount: ps.Amount,
		Status:         model.StatusPlanning,
		PresaleID:      ps.ID,
		Note:           "Передан из пресейла " + ps.Number,
	}
	// Бюджет-заготовка: вся сумма как плановая выручка (детализация — на планировании).
	p.Budget = []model.BudgetItem{{
		ID: "B-" + num + "-REV", ProjectID: p.ID, IsRevenue: true,
		Article: model.ArticleRevenue, Plan: map[string]float64{},
		Note: "Заготовка из пресейла: " + fmt.Sprintf("%.1f", ps.Amount) + " млн ₽",
	}}
	// Минимальная СДР стадии планирования.
	p.WBS = []model.WBSItem{
		{ID: "PH-" + num, Type: model.WBSPhase, Name: "Планирование"},
		{ID: "W-" + num + "-1", ParentID: "PH-" + num, Type: model.WBSWork, Name: "Обследование и инициация"},
		{ID: "M-" + num + "-1", ParentID: "PH-" + num, Type: model.WBSMilestone, Name: "Базовый план готов"},
	}
	start := model.DemoNow
	p.WBS[0].Start, p.WBS[0].End = start, start.AddDate(0, 0, 30)
	p.WBS[1].Start, p.WBS[1].End = start, start.AddDate(0, 0, 20)
	p.WBS[2].Start, p.WBS[2].End = start.AddDate(0, 0, 30), start.AddDate(0, 0, 30)
	// Команда переносится из пресейла (первый РП — если указан).
	for _, empID := range ps.Team {
		role := "Инженер"
		if e, ok := s.Employees[empID]; ok && e.Position == "РП" {
			role = "РП"
		}
		p.Team = append(p.Team, model.TeamMember{EmployeeID: empID, Role: role})
	}
	now := model.DemoNow
	ps.ProjectID = p.ID
	ps.ConvertedAt = &now
	p.EnsureSlices() // Baselines/Purchases/Risks/… как пустые массивы, не null в JSON
	s.Projects[p.ID] = p
	s.AddEvent(p, now, model.EventStatus, "Проект создан из пресейла "+ps.Number+" (данные перенесены автоматически)", "Система")
	// Связь видна в обеих карточках (Ф6).
	return p, nil
}

func (s *Store) nextProjectNumber() string {
	max := 0
	for id := range s.Projects {
		parts := strings.Split(id, "-")
		if len(parts) == 3 {
			if n, err := strconv.Atoi(parts[2]); err == nil && n > max {
				max = n
			}
		}
	}
	return fmt.Sprintf("PRJ-2024-%03d", max+1)
}

// ============ Проекты ============

// UpdateProjectStatus — смена статуса жизненного цикла с записью в ленту.
func (s *Store) UpdateProjectStatus(id string, st model.ProjectStatus) (*model.Project, error) {
	p, ok := s.Projects[id]
	if !ok {
		return nil, fmt.Errorf("проект %s не найден", id)
	}
	old := p.Status
	p.Status = st
	s.AddEvent(p, model.DemoNow, model.EventStatus, fmt.Sprintf("Статус: %s → %s", old, st), "РП")
	return p, nil
}

// UpdateWBItem — ручное изменение дат элемента СДР с каскадным пересчётом (Ф19).
func (s *Store) UpdateWBItem(projectID, itemID string, start, end *time.Time) (*model.Project, error) {
	p, ok := s.Projects[projectID]
	if !ok {
		return nil, fmt.Errorf("проект %s не найден", projectID)
	}
	var item *model.WBSItem
	for i := range p.WBS {
		if p.WBS[i].ID == itemID {
			item = &p.WBS[i]
		}
	}
	if item == nil {
		return nil, fmt.Errorf("элемент СДР %s не найден", itemID)
	}
	oldStart := item.Start
	if item.PurchaseID != "" {
		return nil, fmt.Errorf("веха управляется закупкой %s — измените прогнозную дату поставки", item.PurchaseID)
	}
	if start != nil {
		dur := int(item.End.Sub(item.Start).Hours() / 24)
		item.Start = *start
		if item.Type == model.WBSMilestone {
			item.End = *start
		} else {
			item.End = item.Start.AddDate(0, 0, dur)
		}
	} else if end != nil && item.Type == model.WBSWork {
		item.End = *end
	}
	s.Recalc(p)
	s.AddEvent(p, model.DemoNow, model.EventChange,
		fmt.Sprintf("Изменён график: «%s» %s → %s (зависимые сроки пересчитаны)", item.Name, oldStart.Format(model.DateLayout), item.Start.Format(model.DateLayout)), "РП")
	return p, nil
}

// UpdatePurchase — изменение закупки (статус/прогноз даты) с пересчётом графика.
func (s *Store) UpdatePurchase(projectID, purchaseID string, forecast *time.Time, status *model.PurchaseStatus) (*model.Project, error) {
	p, ok := s.Projects[projectID]
	if !ok {
		return nil, fmt.Errorf("проект %s не найден", projectID)
	}
	var pu *model.Purchase
	for i := range p.Purchases {
		if p.Purchases[i].ID == purchaseID {
			pu = &p.Purchases[i]
		}
	}
	if pu == nil {
		return nil, fmt.Errorf("закупка %s не найдена", purchaseID)
	}
	if status != nil {
		old := pu.Status
		pu.Status = *status
		s.AddEvent(p, model.DemoNow, model.EventChange, fmt.Sprintf("Закупка %s: статус %s → %s", pu.Number, old, pu.Status), "Менеджер по закупкам")
	}
	if forecast != nil && !forecast.Equal(pu.ForecastDate) {
		old := pu.ForecastDate
		pu.ForecastDate = *forecast
		s.Recalc(p)
		s.AddEvent(p, model.DemoNow, model.EventDeviation,
			fmt.Sprintf("Закупка %s: прогноз поставки %s → %s (%+d дн.), график пересчитан", pu.Number,
				old.Format(model.DateLayout), pu.ForecastDate.Format(model.DateLayout),
				int(pu.ForecastDate.Sub(old).Hours()/24)), "Менеджер по закупкам")
	}
	return p, nil
}

// Recalc — пересчёт проекта движком (график + финансы).
func (s *Store) Recalc(p *model.Project) {
	engine.RecalcSchedule(p, s.Dirs())
}

// ============ Запросы на изменение ============

// CreateCR — создание запроса на изменение; влияние подставляется движком (Ф34).
func (s *Store) CreateCR(cr *model.ChangeRequest) *model.ChangeRequest {
	p := s.Projects[cr.ProjectID]
	if p != nil {
		cr.ImpactGMpp, cr.ImpactDDS = engine.ComputeCRImpact(p)
		s.AddEvent(p, model.DemoNow, model.EventChange, fmt.Sprintf("Создан запрос на изменение %s (%s)", cr.ID, cr.Type), cr.Author)
	}
	s.ChangeRequests[cr.ID] = cr
	return cr
}

// SetCRStatus — смена статуса ЗИ; утверждение создаёт новую версию базового плана (Ф34).
func (s *Store) SetCRStatus(id string, st model.CRStatus) (*model.ChangeRequest, error) {
	cr, ok := s.ChangeRequests[id]
	if !ok {
		return nil, fmt.Errorf("запрос на изменение %s не найден", id)
	}
	cr.Status = st
	p := s.Projects[cr.ProjectID]
	if p == nil {
		return cr, nil
	}
	if st == model.CRReview {
		s.AddEvent(p, model.DemoNow, model.EventApproval, fmt.Sprintf("Запрос на изменение %s отправлен на согласование", cr.ID), cr.Author)
	}
	if st == model.CRApproved {
		b := s.NewBaseline(p, cr.Author, "Утверждён ЗИ "+cr.ID)
		s.AddEvent(p, model.DemoNow, model.EventApproval,
			fmt.Sprintf("Запрос на изменение %s утверждён; создан базовый план v%d", cr.ID, b.Version), "Директор департамента")
	}
	return cr, nil
}

// NewBaseline — снимает текущий прогноз как новую версию базового плана (Ф17).
func (s *Store) NewBaseline(p *model.Project, approvedBy, comment string) *model.Baseline {
	engine.RecalcSchedule(p, s.Dirs())
	v := 1
	if last := engine.LatestBaseline(p); last != nil {
		v = last.Version + 1
	}
	b := model.Baseline{
		Version: v, ApprovedAt: model.DemoNow, ApprovedBy: approvedBy, Comment: comment,
	}
	for _, it := range p.WBS {
		b.Items = append(b.Items, model.ItemSnapshot{ItemID: it.ID, Name: it.Name, Type: it.Type, Start: it.Start, End: it.End})
	}
	fc := engine.ComputeFinance(p)
	for _, m := range fc.Months {
		b.Finance = append(b.Finance, model.MonthlySnapshot{Month: m, Revenue: fc.Revenue.Plan[m], Cost: fc.Cost.Plan[m]})
	}
	p.Baselines = append(p.Baselines, b)
	p.Note = fmt.Sprintf("Базовый план v%d утверждён", b.Version)
	return &p.Baselines[len(p.Baselines)-1]
}

// ============ Сценарии ============

// AddScenario — сохраняет сценарий what-if (базовый план не меняется).
func (s *Store) AddScenario(sc model.Scenario) *model.Scenario {
	p := s.Projects[sc.ProjectID]
	if p == nil {
		return nil
	}
	sc.CreatedAt = model.DemoNow
	p.Scenarios = append(p.Scenarios, sc)
	return &p.Scenarios[len(p.Scenarios)-1]
}

// ============ Риски ============

// AddRisk — добавить риск в проект.
func (s *Store) AddRisk(projectID string, r model.Risk) *model.Risk {
	p, ok := s.Projects[projectID]
	if !ok {
		return nil
	}
	p.Risks = append(p.Risks, r)
	s.AddEvent(p, model.DemoNow, model.EventRisk, fmt.Sprintf("Выявлен риск «%s» (%s/%s)", r.Name, r.Probability, r.Impact), "РП")
	return &p.Risks[len(p.Risks)-1]
}
