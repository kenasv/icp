package store

import (
	"fmt"
	"time"

	"isup/internal/engine"
	"isup/internal/model"
)

// dt — краткий конструктор даты.
func dt(y int, m time.Month, d int) time.Time { return model.NewDate(y, m, d) }

func (s *Store) seed() {
	s.seedDirectories()
	s.seedStages()
	s.seedProject1()
	s.seedProject2()
	s.seedProject3()
	s.seedProject4()
	s.seedPresales()
	s.seedChangeRequests()
	s.finalRecalc()
}

func (s *Store) seedDirectories() {
	clients := []model.Client{
		{ID: "cl-rzd", Name: "РЖД", INN: "7708649839", Segment: "Транспорт", Region: "Москва"},
		{ID: "cl-mega", Name: "ТЦ «Мега»", INN: "7710620205", Segment: "Ритейл", Region: "Москва"},
		{ID: "cl-gpn", Name: "Газпром Нефть", INN: "7816132104", Segment: "Нефтегаз", Region: "Санкт-Петербург"},
		{ID: "cl-x5", Name: "X5 Group", INN: "7715800333", Segment: "Ритейл", Region: "Москва"},
		{ID: "cl-sberlog", Name: "СберЛогистика", INN: "9715313881", Segment: "Логистика", Region: "Москва"},
		{ID: "cl-nlmk", Name: "НЛМК", INN: "4823005447", Segment: "Промышленность", Region: "Липецк"},
		{ID: "cl-mvideo", Name: "М.Видео", INN: "7710539365", Segment: "Ритейл", Region: "Москва"},
		{ID: "cl-promzona", Name: "Промзона «Станколит»", INN: "7123001177", Segment: "Промышленность", Region: "Тула"},
		{ID: "cl-pochta", Name: "Почта России", INN: "7724261610", Segment: "Логистика", Region: "Москва"},
		{ID: "cl-severstal", Name: "Северсталь", INN: "3528000547", Segment: "Промышленность", Region: "Череповец"},
		{ID: "cl-ozon", Name: "Ozon", INN: "7704217370", Segment: "E-commerce", Region: "Москва"},
		{ID: "cl-pik", Name: "ПИК", INN: "7736050003", Segment: "Девелопмент", Region: "Москва"},
	}
	for _, c := range clients {
		s.Clients[c.ID] = c
	}
	suppliers := []model.Supplier{
		{ID: "sup-techno", Name: "ТехноСвязь"},
		{ID: "sup-setres", Name: "ООО «Сетевые решения»"},
		{ID: "sup-kabel", Name: "Завод «Кабель-Пром»"},
		{ID: "sup-montazh", Name: "ООО «МонтажСпецСтрой»"},
		{ID: "sup-itint", Name: "ИТ-Интегратор"},
	}
	for _, x := range suppliers {
		s.Suppliers[x.ID] = x
	}
	employees := []model.Employee{
		{ID: "emp-ivanov", Name: "Иванов И.И.", Position: "Директор департамента"},
		{ID: "emp-petrov", Name: "Петров П.П.", Position: "РП"},
		{ID: "emp-sidorova", Name: "Сидорова А.А.", Position: "РП"},
		{ID: "emp-kuznetsova", Name: "Кузнецова Л.Л.", Position: "РП"},
		{ID: "emp-kozlov", Name: "Козлов К.К.", Position: "Инженер"},
		{ID: "emp-smirnova", Name: "Смирнова Е.В.", Position: "Инженер"},
		{ID: "emp-morozov", Name: "Морозов М.М.", Position: "Менеджер по закупкам"},
		{ID: "emp-volkova", Name: "Волкова О.О.", Position: "Менеджер по закупкам"},
	}
	for _, e := range employees {
		s.Employees[e.ID] = e
	}
}

// seedStages — воронка (Ф2) + дополнительный этап «Тендер» из кейса №8.
func (s *Store) seedStages() {
	s.Stages = []model.Stage{
		{ID: "st-contact", Name: "Первичный контакт", Probability: 0.15, Order: 1},
		{ID: "st-negot", Name: "Переговоры", Probability: 0.40, Order: 2},
		{ID: "st-tkp", Name: "ТКП", Probability: 0.40, Order: 3},
		{ID: "st-tender", Name: "Тендер", Probability: 0.25, Order: 4},
		{ID: "st-close", Name: "Закрытие", Probability: 0.90, Order: 5},
	}
}

// ============ Проект 1: «Видеонаблюдение для РЖД» ============

func (s *Store) seedProject1() {
	p := &model.Project{
		ID: "PRJ-2024-001", Name: "Видеонаблюдение для РЖД",
		ClientID: "cl-rzd", Product: "Видеонаблюдение", Region: "Москва", Type: "Интеграция",
		ContractAmount: 45, Status: model.StatusInProgress,
		PresaleID: "PS-2023-101", Note: "Базовый план v1 утверждён",
		Team: []model.TeamMember{
			{EmployeeID: "emp-petrov", Role: "РП"},
			{EmployeeID: "emp-kozlov", Role: "Инженер"},
			{EmployeeID: "emp-smirnova", Role: "Инженер"},
			{EmployeeID: "emp-morozov", Role: "Менеджер по закупкам"},
		},
		WBS: []model.WBSItem{
			{ID: "p1-ph1", Type: model.WBSPhase, Name: "Подготовка", Start: dt(2024, 3, 1), End: dt(2024, 3, 15)},
			{ID: "p1-w1", ParentID: "p1-ph1", Type: model.WBSWork, Name: "Обследование и проектирование", Start: dt(2024, 3, 1), End: dt(2024, 3, 15), DurationDays: 14},
			{ID: "p1-m1", ParentID: "p1-ph1", Type: model.WBSMilestone, Name: "Проектная документация утверждена", Start: dt(2024, 3, 15), End: dt(2024, 3, 15), BudgetItemIDs: []string{"p1-b-rev1", "p1-b-other"}},
			{ID: "p1-ph2", Type: model.WBSPhase, Name: "Поставка и монтаж", Start: dt(2024, 4, 5), End: dt(2024, 4, 25)},
			{ID: "p1-m2", ParentID: "p1-ph2", Type: model.WBSMilestone, Name: "Оборудование получено", Start: dt(2024, 4, 5), End: dt(2024, 4, 5), PurchaseID: "p1-pu1", BudgetItemIDs: []string{"p1-b-eq"}},
			{ID: "p1-w2", ParentID: "p1-ph2", Type: model.WBSWork, Name: "Монтаж камер", Start: dt(2024, 4, 6), End: dt(2024, 4, 25), DurationDays: 19,
				Dependencies: []model.Dependency{{FromID: "p1-m2", LagDays: 1}}},
			{ID: "p1-m3", ParentID: "p1-ph2", Type: model.WBSMilestone, Name: "Монтаж завершён", Start: dt(2024, 4, 25), End: dt(2024, 4, 25), BudgetItemIDs: []string{"p1-b-rev2", "p1-b-works", "p1-b-sub"}},
			{ID: "p1-ph3", Type: model.WBSPhase, Name: "Пусконаладка и приёмка", Start: dt(2024, 4, 26), End: dt(2024, 5, 31)},
			{ID: "p1-w3", ParentID: "p1-ph3", Type: model.WBSWork, Name: "Пусконаладочные работы", Start: dt(2024, 4, 26), End: dt(2024, 5, 29), DurationDays: 33,
				Dependencies: []model.Dependency{{FromID: "p1-m3", LagDays: 1}}},
			{ID: "p1-m4", ParentID: "p1-ph3", Type: model.WBSMilestone, Name: "Приёмка", Start: dt(2024, 5, 31), End: dt(2024, 5, 31), BudgetItemIDs: []string{"p1-b-rev3", "p1-b-other"}},
		},
		Budget: []model.BudgetItem{
			{ID: "p1-b-rev1", ProjectID: "PRJ-2024-001", IsRevenue: true, Article: model.ArticleRevenue, MilestoneID: "p1-m1", BillingLagMonths: 0,
				Plan: map[string]float64{"2024-03": 9}, Actual: map[string]float64{"2024-03": 9}, Note: "Аванс"},
			{ID: "p1-b-rev2", ProjectID: "PRJ-2024-001", IsRevenue: true, Article: model.ArticleRevenue, MilestoneID: "p1-m3", BillingLagMonths: 1,
				Plan: map[string]float64{"2024-05": 13.5}},
			{ID: "p1-b-rev3", ProjectID: "PRJ-2024-001", IsRevenue: true, Article: model.ArticleRevenue, MilestoneID: "p1-m4", BillingLagMonths: 1,
				Plan: map[string]float64{"2024-06": 22.5}},
			{ID: "p1-b-eq", ProjectID: "PRJ-2024-001", Article: model.ArticleEquipment, MilestoneID: "p1-m2", BillingLagMonths: 0,
				Plan: map[string]float64{"2024-04": 20}},
			{ID: "p1-b-works", ProjectID: "PRJ-2024-001", Article: model.ArticleWorks, MilestoneID: "p1-m3", BillingLagMonths: 0,
				Plan: map[string]float64{"2024-04": 1, "2024-05": 2, "2024-06": 2}, Actual: map[string]float64{"2024-04": 1}},
			{ID: "p1-b-sub", ProjectID: "PRJ-2024-001", Article: model.ArticleSubcontract, MilestoneID: "p1-m3", BillingLagMonths: 0,
				Plan: map[string]float64{"2024-04": 2, "2024-05": 2, "2024-06": 2}},
			{ID: "p1-b-other", ProjectID: "PRJ-2024-001", Article: model.ArticleOther, MilestoneID: "p1-m1", BillingLagMonths: 0,
				Plan: map[string]float64{"2024-03": 0.7, "2024-06": 0.7}, Actual: map[string]float64{"2024-03": 0.7}},
		},
		Purchases: []model.Purchase{
			{ID: "p1-pu1", Number: "З-2024-071", Name: "Видеокамеры и серверы", SupplierID: "sup-itint",
				Amount: 20, Status: model.PurchaseContracted,
				PlanDate: dt(2024, 4, 5), ForecastDate: dt(2024, 4, 5), MilestoneID: "p1-m2", BudgetItemID: "p1-b-eq"},
		},
		Risks: []model.Risk{
			{ID: "p1-r1", Name: "Рост цен на оборудование", Probability: model.ProbLow, Impact: model.ImpactHigh,
				Owner: "emp-morozov", DueDate: dt(2024, 4, 5), Status: "открыт"},
		},
	}
	s.Projects[p.ID] = p
	s.AddEvent(p, dt(2024, 2, 1), model.EventStatus, "Проект создан из пресейла ПС-2023-101", "Система")
	s.AddEvent(p, dt(2024, 2, 10), model.EventApproval, "Базовый план v1 утверждён (Иванов И.И.)", "Директор департамента")
	s.AddEvent(p, dt(2024, 3, 1), model.EventStatus, "Статус: Планирование → В реализации", "РП")
	s.AddEvent(p, dt(2024, 3, 20), model.EventChange, "Закупка З-2024-071: договор подписан", "Менеджер по закупкам")
	s.NewBaseline(p, "Иванов И.И.", "Первичный план")
	p.Baselines[len(p.Baselines)-1].ApprovedAt = dt(2024, 2, 10)
}

// ============ Проект 2: «Wi-Fi для ТЦ Мега» — ключевой инцидент демо ============

func (s *Store) seedProject2() {
	p := &model.Project{
		ID: "PRJ-2024-002", Name: "Wi-Fi для ТЦ Мега",
		ClientID: "cl-mega", Product: "Wi-Fi сеть", Region: "Москва", Type: "Интеграция",
		ContractAmount: 12, Status: model.StatusInProgress,
		PresaleID: "PS-2023-102", Note: "Задержка поставки оборудования",
		Team: []model.TeamMember{
			{EmployeeID: "emp-sidorova", Role: "РП"},
			{EmployeeID: "emp-kozlov", Role: "Инженер"},
			{EmployeeID: "emp-morozov", Role: "Менеджер по закупкам"},
		},
		// СДР (Ф13): Подготовка → Поставка (веха 15.03) → Монтаж (веха 18.03, FS + 3 от поставки)
		// → Пусконаладка → Приёмка (веха 30.04). Прогноз поставки уже сдвинут на 05.04 (+21 дн.).
		WBS: []model.WBSItem{
			{ID: "p2-ph1", Type: model.WBSPhase, Name: "Подготовка", Start: dt(2024, 3, 1), End: dt(2024, 3, 14)},
			{ID: "p2-w1", ParentID: "p2-ph1", Type: model.WBSWork, Name: "Обследование и проектирование", Start: dt(2024, 3, 1), End: dt(2024, 3, 14), DurationDays: 13},
			{ID: "p2-m1", ParentID: "p2-ph1", Type: model.WBSMilestone, Name: "Проект утверждён", Start: dt(2024, 3, 14), End: dt(2024, 3, 14), BudgetItemIDs: []string{"p2-b-other"}},
			{ID: "p2-m2", Type: model.WBSMilestone, Name: "Поставка оборудования", Start: dt(2024, 3, 15), End: dt(2024, 3, 15), PurchaseID: "p2-pu1", BudgetItemIDs: []string{"p2-b-eq"}},
			{ID: "p2-ph2", Type: model.WBSPhase, Name: "Монтаж", Start: dt(2024, 3, 15), End: dt(2024, 3, 18)},
			{ID: "p2-m3", ParentID: "p2-ph2", Type: model.WBSMilestone, Name: "Монтаж завершён", Start: dt(2024, 3, 18), End: dt(2024, 3, 18),
				Dependencies:                    []model.Dependency{{FromID: "p2-m2", LagDays: 3}},
				BudgetItemIDs: []string{"p2-b-rev1", "p2-b-works"}},
			{ID: "p2-ph3", Type: model.WBSPhase, Name: "Пусконаладка и приёмка", Start: dt(2024, 3, 19), End: dt(2024, 4, 30)},
			{ID: "p2-w2", ParentID: "p2-ph3", Type: model.WBSWork, Name: "Пусконаладочные работы", Start: dt(2024, 3, 19), End: dt(2024, 4, 28), DurationDays: 40,
				Dependencies: []model.Dependency{{FromID: "p2-m3", LagDays: 1}}, BudgetItemIDs: []string{"p2-b-sub"}},
			{ID: "p2-m4", ParentID: "p2-ph3", Type: model.WBSMilestone, Name: "Приёмка", Start: dt(2024, 4, 30), End: dt(2024, 4, 30),
				Dependencies:   []model.Dependency{{FromID: "p2-w2", LagDays: 2}},
				BudgetItemIDs: []string{"p2-b-rev2"}},
		},
		Budget: []model.BudgetItem{
			// Выручка 6 млн в апреле (веха монтажа 18.03 + лаг выставления 1 мес.) и 6 млн в мае (приёмка).
			{ID: "p2-b-rev1", ProjectID: "PRJ-2024-002", IsRevenue: true, Article: model.ArticleRevenue, MilestoneID: "p2-m3", BillingLagMonths: 1,
				Plan: map[string]float64{"2024-04": 6}},
			{ID: "p2-b-rev2", ProjectID: "PRJ-2024-002", IsRevenue: true, Article: model.ArticleRevenue, MilestoneID: "p2-m4", BillingLagMonths: 1,
				Plan: map[string]float64{"2024-05": 6}},
			{ID: "p2-b-eq", ProjectID: "PRJ-2024-002", Article: model.ArticleEquipment, MilestoneID: "p2-m2", BillingLagMonths: 0,
				Plan: map[string]float64{"2024-03": 4}},
			{ID: "p2-b-works", ProjectID: "PRJ-2024-002", Article: model.ArticleWorks, MilestoneID: "p2-m3", BillingLagMonths: 0,
				Plan: map[string]float64{"2024-03": 1.2, "2024-04": 2}, Actual: map[string]float64{"2024-03": 1}},
			{ID: "p2-b-sub", ProjectID: "PRJ-2024-002", Article: model.ArticleSubcontract, MilestoneID: "p2-w2", BillingLagMonths: 0,
				Plan: map[string]float64{"2024-04": 1, "2024-05": 1}},
			{ID: "p2-b-other", ProjectID: "PRJ-2024-002", Article: model.ArticleOther, MilestoneID: "p2-m1", BillingLagMonths: 0,
				Plan: map[string]float64{"2024-03": 0.4, "2024-04": 0.3, "2024-05": 0.3}, Actual: map[string]float64{"2024-03": 0.4}},
		},
		Purchases: []model.Purchase{
			// Ключевая закупка демо: план 15.03, прогноз уже сдвинут на 05.04 (+21 дн.).
			{ID: "p2-pu1", Number: "З-2024-089", Name: "Точки доступа Wi-Fi", SupplierID: "sup-techno",
				Amount: 4, Status: model.PurchaseOrdered,
				PlanDate: dt(2024, 3, 15), ForecastDate: dt(2024, 4, 5), MilestoneID: "p2-m2", BudgetItemID: "p2-b-eq"},
		},
		Risks: []model.Risk{
			{ID: "p2-r1", Name: "Задержка поставки оборудования", Probability: model.ProbHigh, Impact: model.ImpactHigh,
				Owner: "emp-morozov", DueDate: dt(2024, 4, 15), Status: "открыт"},
			{ID: "p2-r2", Name: "Сложности согласования с арендаторами ТЦ", Probability: model.ProbMedium, Impact: model.ImpactMedium,
				Owner: "emp-sidorova", DueDate: dt(2024, 3, 31), Status: "открыт"},
		},
	}
	s.Projects[p.ID] = p
	s.AddEvent(p, dt(2024, 2, 5), model.EventStatus, "Проект создан из пресейла ПС-2023-102", "Система")
	s.AddEvent(p, dt(2024, 2, 10), model.EventApproval, "Базовый план v1 утверждён (Иванов И.И.)", "Директор департамента")
	s.AddEvent(p, dt(2024, 3, 1), model.EventStatus, "Статус: Планирование → В реализации", "РП")
	// Базовый план v1 снимается по плановым датам (поставка ещё 15.03)…
	p.Purchases[0].ForecastDate = dt(2024, 3, 15)
	s.NewBaseline(p, "Иванов И.И.", "Первичный план")
	p.Baselines[len(p.Baselines)-1].ApprovedAt = dt(2024, 2, 10)
	// …затем фиксируется задержка: прогноз поставки 15.03 → 05.04 (+21 дн.), каскад пересчитает движок.
	p.Purchases[0].ForecastDate = dt(2024, 4, 5)
	engine.RecalcSchedule(p, s.Dirs())
	s.AddEvent(p, dt(2024, 3, 25), model.EventDeviation, "Закупка З-2024-089: прогноз поставки 15.03.2024 → 05.04.2024 (+21 дн.)", "Менеджер по закупкам")
	s.AddEvent(p, dt(2024, 3, 25), model.EventRisk, "Риск «Задержка поставки оборудования» повышен до высокого", "РП")
	p.Note = "Задержка поставки оборудования"
}

// ============ Проект 3: «СКС для Газпром Нефть» ============

func (s *Store) seedProject3() {
	p := &model.Project{
		ID: "PRJ-2024-003", Name: "СКС для Газпром Нефть",
		ClientID: "cl-gpn", Product: "Структурированная кабельная система", Region: "Санкт-Петербург", Type: "Инфраструктура",
		ContractAmount: 78, Status: model.StatusPlanning,
		PresaleID: "PS-2023-103", Note: "Только передан из пресейла",
		Team: []model.TeamMember{
			{EmployeeID: "emp-kuznetsova", Role: "РП"},
			{EmployeeID: "emp-smirnova", Role: "Инженер"},
		},
		WBS: []model.WBSItem{
			{ID: "p3-ph1", Type: model.WBSPhase, Name: "Планирование", Start: dt(2024, 4, 1), End: dt(2024, 4, 30)},
			{ID: "p3-w1", ParentID: "p3-ph1", Type: model.WBSWork, Name: "Обследование объекта", Start: dt(2024, 4, 1), End: dt(2024, 4, 20), DurationDays: 19},
			{ID: "p3-m1", ParentID: "p3-ph1", Type: model.WBSMilestone, Name: "Базовый план готов", Start: dt(2024, 4, 30), End: dt(2024, 4, 30), BudgetItemIDs: []string{"p3-b-other"}},
			{ID: "p3-m2", Type: model.WBSMilestone, Name: "Старт реализации", Start: dt(2024, 5, 15), End: dt(2024, 5, 15),
				Dependencies:   []model.Dependency{{FromID: "p3-m1", LagDays: 15}},
				BudgetItemIDs: []string{"p3-b-rev", "p3-b-eq", "p3-b-works", "p3-b-sub"}},
		},
		Budget: []model.BudgetItem{
			{ID: "p3-b-rev", ProjectID: "PRJ-2024-003", IsRevenue: true, Article: model.ArticleRevenue, MilestoneID: "p3-m2", BillingLagMonths: 0,
				Plan: map[string]float64{"2024-05": 30, "2024-06": 48}, Note: "Заготовка из пресейла"},
			{ID: "p3-b-eq", ProjectID: "PRJ-2024-003", Article: model.ArticleEquipment, MilestoneID: "p3-m2", BillingLagMonths: 1,
				Plan: map[string]float64{"2024-06": 35}},
			{ID: "p3-b-works", ProjectID: "PRJ-2024-003", Article: model.ArticleWorks, MilestoneID: "p3-m2", BillingLagMonths: 1,
				Plan: map[string]float64{"2024-06": 6, "2024-07": 6}},
			{ID: "p3-b-sub", ProjectID: "PRJ-2024-003", Article: model.ArticleSubcontract, MilestoneID: "p3-m2", BillingLagMonths: 1,
				Plan: map[string]float64{"2024-06": 5, "2024-07": 5}},
			{ID: "p3-b-other", ProjectID: "PRJ-2024-003", Article: model.ArticleOther, MilestoneID: "p3-m1", BillingLagMonths: 0,
				Plan: map[string]float64{"2024-04": 1.84, "2024-05": 2}},
		},
	}
	s.Projects[p.ID] = p
	s.AddEvent(p, dt(2024, 3, 28), model.EventStatus, "Проект передан из пресейла ПС-2023-103 (данные перенесены)", "Система")
	s.AddEvent(p, dt(2024, 3, 28), model.EventStatus, "Назначен РП: Кузнецова Л.Л.", "Директор департамента")
}

// ============ Проект 4: «IoT для склада X5» — база знаний ============

func (s *Store) seedProject4() {
	p := &model.Project{
		ID: "PRJ-2024-004", Name: "IoT для склада X5",
		ClientID: "cl-x5", Product: "IoT-мониторинг", Region: "Москва", Type: "Интеграция",
		ContractAmount: 8, Status: model.StatusDone,
		PresaleID: "PS-2023-104", Note: "Архив, для демо базы знаний",
		Team: []model.TeamMember{
			{EmployeeID: "emp-kuznetsova", Role: "РП"},
			{EmployeeID: "emp-kozlov", Role: "Инженер"},
			{EmployeeID: "emp-volkova", Role: "Менеджер по закупкам"},
		},
		WBS: []model.WBSItem{
			{ID: "p4-ph1", Type: model.WBSPhase, Name: "Реализация", Start: dt(2024, 2, 1), End: dt(2024, 3, 28)},
			{ID: "p4-w1", ParentID: "p4-ph1", Type: model.WBSWork, Name: "Поставка и монтаж IoT-датчиков", Start: dt(2024, 2, 1), End: dt(2024, 3, 10), DurationDays: 38, BudgetItemIDs: []string{"p4-b-eq"}},
			{ID: "p4-m1", ParentID: "p4-ph1", Type: model.WBSMilestone, Name: "Монтаж завершён", Start: dt(2024, 3, 10), End: dt(2024, 3, 10), BudgetItemIDs: []string{"p4-b-rev1", "p4-b-works"}},
			{ID: "p4-w2", ParentID: "p4-ph1", Type: model.WBSWork, Name: "Пусконаладка и интеграция", Start: dt(2024, 3, 11), End: dt(2024, 3, 25), DurationDays: 14,
				Dependencies: []model.Dependency{{FromID: "p4-m1", LagDays: 1}}, BudgetItemIDs: []string{"p4-b-other"}},
			{ID: "p4-m2", ParentID: "p4-ph1", Type: model.WBSMilestone, Name: "Приёмка", Start: dt(2024, 3, 28), End: dt(2024, 3, 28),
				Dependencies:   []model.Dependency{{FromID: "p4-w2", LagDays: 3}},
				BudgetItemIDs: []string{"p4-b-rev2", "p4-b-sub"}},
		},
		Budget: []model.BudgetItem{
			{ID: "p4-b-rev1", ProjectID: "PRJ-2024-004", IsRevenue: true, Article: model.ArticleRevenue, MilestoneID: "p4-m1", BillingLagMonths: 0,
				Plan: map[string]float64{"2024-03": 3}, Actual: map[string]float64{"2024-03": 3}},
			{ID: "p4-b-rev2", ProjectID: "PRJ-2024-004", IsRevenue: true, Article: model.ArticleRevenue, MilestoneID: "p4-m2", BillingLagMonths: 1,
				Plan: map[string]float64{"2024-04": 5}, Actual: map[string]float64{"2024-04": 5}},
			{ID: "p4-b-eq", ProjectID: "PRJ-2024-004", Article: model.ArticleEquipment, MilestoneID: "p4-w1", BillingLagMonths: 0,
				Plan: map[string]float64{"2024-02": 2.6}, Actual: map[string]float64{"2024-02": 2.6}},
			{ID: "p4-b-works", ProjectID: "PRJ-2024-004", Article: model.ArticleWorks, MilestoneID: "p4-m1", BillingLagMonths: 0,
				Plan: map[string]float64{"2024-03": 1.4}, Actual: map[string]float64{"2024-03": 1.4}},
			{ID: "p4-b-sub", ProjectID: "PRJ-2024-004", Article: model.ArticleSubcontract, MilestoneID: "p4-m2", BillingLagMonths: 1,
				Plan: map[string]float64{"2024-04": 0.8}, Actual: map[string]float64{"2024-04": 0.8}},
			{ID: "p4-b-other", ProjectID: "PRJ-2024-004", Article: model.ArticleOther, MilestoneID: "p4-w2", BillingLagMonths: 0,
				Plan: map[string]float64{"2024-03": 0.4}, Actual: map[string]float64{"2024-03": 0.4}},
		},
	}
	s.Projects[p.ID] = p
	s.AddEvent(p, dt(2024, 1, 10), model.EventStatus, "Проект создан из пресейла ПС-2023-104", "Система")
	s.AddEvent(p, dt(2024, 1, 15), model.EventApproval, "Базовый план v1 утверждён (Иванов И.И.)", "Директор департамента")
	s.AddEvent(p, dt(2024, 1, 20), model.EventStatus, "Статус: Планирование → В реализации", "РП")
	s.AddEvent(p, dt(2024, 3, 28), model.EventStatus, "Веха «Приёмка» принята заказчиком", "РП")
	s.AddEvent(p, dt(2024, 3, 31), model.EventStatus, "Статус: В реализации → Завершён. Проект передан в базу знаний", "РП")
	s.NewBaseline(p, "Иванов И.И.", "Первичный план")
	p.Baselines[len(p.Baselines)-1].ApprovedAt = dt(2024, 1, 15)
	p.Note = "Архив, для демо базы знаний"
}

// ============ Пресейлы ============

func (s *Store) seedPresales() {
	prob := func(v float64) *float64 { return &v }
	mk := func(id, num, name, client, product, region string, amount float64, stage string, override *float64, source string, team ...string) *model.Presale {
		return &model.Presale{
			ID: id, Number: num, Name: name, ClientID: client, Product: product, Region: region,
			Amount: amount, StageID: stage, ProbabilityOverride: override, LeadSource: source, Team: team,
		}
	}
	// Переданные в проекты (связь пресейл—проект, Ф7).
	converted := []*model.Presale{
		mk("PS-2023-101", "ПС-2023-101", "Видеонаблюдение для РЖД", "cl-rzd", "Видеонаблюдение", "Москва", 45, "st-close", nil, "Входящая заявка", "emp-petrov", "emp-kozlov"),
		mk("PS-2023-102", "ПС-2023-102", "Wi-Fi для ТЦ Мега", "cl-mega", "Wi-Fi сеть", "Москва", 12, "st-close", nil, "Партнёр", "emp-sidorova"),
		mk("PS-2023-103", "ПС-2023-103", "СКС для Газпром Нефть", "cl-gpn", "СКС", "Санкт-Петербург", 78, "st-close", nil, "Входящая заявка", "emp-kuznetsova"),
		mk("PS-2023-104", "ПС-2023-104", "IoT для склада X5", "cl-x5", "IoT-мониторинг", "Москва", 8, "st-close", nil, "Повторные продажи", "emp-kuznetsova"),
	}
	links := map[string]string{
		"PS-2023-101": "PRJ-2024-001", "PS-2023-102": "PRJ-2024-002",
		"PS-2023-103": "PRJ-2024-003", "PS-2023-104": "PRJ-2024-004",
	}
	convAt := map[string]time.Time{
		"PS-2023-101": dt(2024, 2, 1), "PS-2023-102": dt(2024, 2, 5),
		"PS-2023-103": dt(2024, 3, 28), "PS-2023-104": dt(2024, 1, 10),
	}
	for _, ps := range converted {
		ps.ProjectID = links[ps.ID]
		at := convAt[ps.ID]
		ps.ConvertedAt = &at
		s.Presales[ps.ID] = ps
	}

	// Активная воронка (кейсы №5–№8 + фоновые пресейлы, всего 8).
	active := []*model.Presale{
		mk("PS-005", "ПС-005", "ЦОД для СберЛогистики", "cl-sberlog", "ЦОД / инфраструктура", "Москва", 120, "st-tkp", nil, "Входящая заявка", "emp-petrov", "emp-kozlov"),
		mk("PS-006", "ПС-006", "АСУ ТП для НЛМК", "cl-nlmk", "АСУ ТП", "Липецк", 65, "st-negot", prob(0.60), "Партнёр", "emp-sidorova"),
		mk("PS-007", "ПС-007", "Контакт-центр для МВидео", "cl-mvideo", "Контакт-центр", "Москва", 30, "st-contact", nil, "Холодный звонок", "emp-petrov"),
		mk("PS-008", "ПС-008", "5G для промзоны", "cl-promzona", "5G-сеть", "Тула", 200, "st-tender", prob(0.25), "Тендерная площадка", "emp-petrov", "emp-smirnova"),
		mk("PS-009", "ПС-009", "Видеосвязь для Почты России", "cl-pochta", "Видеоконференцсвязь", "Москва", 18, "st-negot", nil, "Входящая заявка", "emp-kozlov"),
		mk("PS-010", "ПС-010", "Мониторинг для Северстали", "cl-severstal", "Промышленный видеомониторинг", "Череповец", 25, "st-tkp", nil, "Партнёр", "emp-smirnova"),
		mk("PS-011", "ПС-011", "Облачный контакт-центр для Ozon", "cl-ozon", "Контакт-центр", "Москва", 15, "st-contact", nil, "Холодный звонок", "emp-sidorova"),
		mk("PS-012", "ПС-012", "Умный дом для ПИК", "cl-pik", "Умный дом", "Москва", 9, "st-close", nil, "Выставка", "emp-kozlov"),
	}
	// История изменений этапа (Ф1).
	for _, ps := range active {
		switch ps.StageID {
		case "st-close":
			ps.StageHistory = []model.StageChange{
				{Date: dt(2024, 1, 15), FromStage: "", ToStage: "st-contact"},
				{Date: dt(2024, 2, 1), FromStage: "st-contact", ToStage: "st-negot"},
				{Date: dt(2024, 2, 20), FromStage: "st-negot", ToStage: "st-tkp"},
				{Date: dt(2024, 3, 10), FromStage: "st-tkp", ToStage: "st-close"},
			}
		case "st-tkp", "st-tender":
			ps.StageHistory = []model.StageChange{
				{Date: dt(2024, 2, 1), FromStage: "", ToStage: "st-contact"},
				{Date: dt(2024, 2, 25), FromStage: "st-contact", ToStage: "st-negot"},
				{Date: dt(2024, 3, 12), FromStage: "st-negot", ToStage: ps.StageID},
			}
		case "st-negot":
			ps.StageHistory = []model.StageChange{
				{Date: dt(2024, 2, 10), FromStage: "", ToStage: "st-contact"},
				{Date: dt(2024, 3, 1), FromStage: "st-contact", ToStage: "st-negot"},
			}
		default:
			ps.StageHistory = []model.StageChange{{Date: dt(2024, 3, 20), FromStage: "", ToStage: "st-contact"}}
		}
		s.Presales[ps.ID] = ps
	}
}

// ============ Запросы на изменение ============

func (s *Store) seedChangeRequests() {
	s.ChangeRequests["ЗИ-2024-011"] = &model.ChangeRequest{
		ID: "ЗИ-2024-011", ProjectID: "PRJ-2024-002", Type: model.CRSchedule,
		Reason:    "Задержка производства у поставщика ТехноСвязь",
		Description: "Прогноз поставки оборудования сдвигается с 15.03 на 05.04 (+21 дн.). Каскад: монтаж — 08.04, приёмка — 21.05, выручка переносится на май–июнь.",
		Status:    model.CRReview, CreatedAt: dt(2024, 3, 25), Author: "Сидорова А.А.",
	}
	s.ChangeRequests["ЗИ-2024-012"] = &model.ChangeRequest{
		ID: "ЗИ-2024-012", ProjectID: "PRJ-2024-003", Type: model.CRBudget,
		Reason:      "Уточнение состава работ после обследования",
		Description: "Увеличение статьи «Работы» на 2 млн ₽ (дополнительные кабель-каналы на складе №3).",
		Status:      model.CRDraft, CreatedAt: dt(2024, 3, 30), Author: "Кузнецова Л.Л.",
	}
}

// finalRecalc — пересчёт всех проектов движком; ИИ-комментарии в ленту (Ф39).
func (s *Store) finalRecalc() {
	for _, p := range s.Projects {
		engine.RecalcSchedule(p, s.Dirs())
	}
	// Влияние ЗИ пересчитывается движком при отдаче API, здесь — стартовые значения.
	for id, cr := range s.ChangeRequests {
		if p, ok := s.Projects[cr.ProjectID]; ok {
			cr.ImpactGMpp, cr.ImpactDDS = engine.ComputeCRImpact(p)
			_ = id
		}
	}
	// Сценарий-заготовка для песочницы проекта №2.
	s.AddScenario(model.Scenario{
		ID: "SC-1", ProjectID: "PRJ-2024-002", Name: "Параллельный монтаж (сокращение ПНР на 7 дн.)",
		Ops: []model.ScenarioOp{
			{Kind: "shiftDuration", TargetID: "p2-w2", DurationDelta: -7},
			{Kind: "addCost", Article: "Работы", Amount: 0.5, Month: "2024-04"},
		},
	})
	// ИИ-комментарий по ключевому инциденту — текст собирается из данных движка.
	if p := s.Projects["PRJ-2024-002"]; p != nil {
		pc := engine.Compose(p, s.Dirs())
		var worst *engine.WBSRow
		for i := range pc.Schedule {
			r := &pc.Schedule[i]
			if r.Type == model.WBSMilestone && r.Purchase != nil && (worst == nil || r.DevDays > worst.DevDays) {
				worst = r
			}
		}
		if worst != nil && worst.DevDays > 0 {
			gap := 0.0
			gapMonth := ""
			for _, m := range pc.Finance.DDS.Monthly {
				if m.Gap.Forecast > gap {
					gap, gapMonth = m.Gap.Forecast, m.Month
				}
			}
			text := fmt.Sprintf(
				"ИИ: задержка закупки %s на %d дн. сдвигает веху «%s» и каскад работ; выручка переносится на более поздние месяцы.",
				worst.Purchase.Number, worst.Purchase.DevDays, worst.Name)
			if gap > 0 {
				text += fmt.Sprintf(" Прогнозный кассовый разрыв %s: +%.1f млн ₽. Рекомендация: согласовать авансирование или параллельный монтаж.", gapMonth, gap)
			}
			s.AddEvent(p, dt(2024, 3, 26), model.EventAIComment, text, "ИИ-ассистент")
		}
	}
}
