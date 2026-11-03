// Package api — REST API ИСУП на стандартной библиотеке Go 1.22 (маршрутизация с путевыми параметрами).
// Все ответы собираются расчётным движком; интерфейс ничего не вычисляет сам (требование 4.1.4).
package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sort"
	"strings"
	"time"

	"isup/internal/ai"
	"isup/internal/bpmn"
	"isup/internal/c4"
	"isup/internal/engine"
	"isup/internal/model"
	"isup/internal/pg"
	"isup/internal/store"
)

type Server struct {
	st  *store.Store
	ai  ai.Provider
	pg  *pg.DB // nil — работа без PostgreSQL (память процесса)
	mux *http.ServeMux
}

func New(s *store.Store, database *pg.DB) *Server {
	srv := &Server{st: s, ai: ai.NewDemoProvider(s), pg: database, mux: http.NewServeMux()}
	srv.routes()
	return srv
}

func (s *Server) Handler() http.Handler { return s.cors(s.persist(s.mux)) }

// persist — после каждого изменяющего запроса состояние синхронизируется
// в PostgreSQL (одной транзакцией; см. internal/pg). Вызывается уже после
// снятия блокировок хранилища в обработчике.
func (s *Server) persist(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		next.ServeHTTP(w, r)
		if s.pg != nil && r.Method != http.MethodGet && r.Method != http.MethodOptions {
			if err := s.pg.Sync(s.st); err != nil {
				log.Printf("ОШИБКА: синхронизация с PostgreSQL: %v", err)
			}
		}
	})
}

func (s *Server) routes() {
	m := s.mux
	m.HandleFunc("GET /api/meta", s.handleMeta)
	m.HandleFunc("GET /api/directories", s.handleDirectories)
	m.HandleFunc("POST /api/directories/{entity}", s.handleCreateDirectoryItem)
	m.HandleFunc("GET /api/portfolio", s.handlePortfolio)

	m.HandleFunc("GET /api/presales", s.handlePresales)
	m.HandleFunc("POST /api/presales", s.handleCreatePresale)
	m.HandleFunc("PATCH /api/presales/{id}", s.handlePatchPresale)
	m.HandleFunc("POST /api/presales/{id}/convert", s.handleConvertPresale)

	m.HandleFunc("GET /api/projects", s.handleProjects)
	m.HandleFunc("GET /api/projects/{id}", s.handleProject)
	m.HandleFunc("PATCH /api/projects/{id}", s.handlePatchProject)
	m.HandleFunc("PATCH /api/projects/{id}/wbs/{itemId}", s.handlePatchWBS)
	m.HandleFunc("POST /api/projects/{id}/purchases/{pid}/preview", s.handlePurchasePreview)
	m.HandleFunc("PATCH /api/projects/{id}/purchases/{pid}", s.handlePatchPurchase)
	m.HandleFunc("GET /api/projects/{id}/scenarios", s.handleScenarios)
	m.HandleFunc("POST /api/projects/{id}/scenarios", s.handleCreateScenario)
	m.HandleFunc("POST /api/projects/{id}/scenarios/{sid}/to-cr", s.handleScenarioToCR)

	m.HandleFunc("GET /api/change-requests", s.handleCRs)
	m.HandleFunc("POST /api/change-requests", s.handleCreateCR)
	m.HandleFunc("PATCH /api/change-requests/{id}", s.handlePatchCR)

	m.HandleFunc("POST /api/ai/chat", s.handleAIChat)
	m.HandleFunc("GET /api/ai/status-report/{projectId}", s.handleAIStatusReport)
	m.HandleFunc("GET /api/ai/recommendations/{projectId}", s.handleAIRecommendations)

	m.HandleFunc("GET /api/bpmn", s.handleBPMNList)
	m.HandleFunc("GET /api/bpmn/{key}", s.handleBPMNGet)
	m.HandleFunc("PUT /api/bpmn/{key}", s.handleBPMNPut)
	m.HandleFunc("DELETE /api/bpmn/{key}", s.handleBPMNReset)

	m.HandleFunc("GET /api/c4", s.handleC4)
}

// ============ Инфраструктура ============

func (s *Server) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// parseDate — принимает дату в форматах "2006-01-02" и RFC3339 (фронтенд шлёт дату без времени).
func parseDate(s string) (time.Time, error) {
	if s == "" {
		return time.Time{}, nil
	}
	if t, err := time.Parse(model.DateLayout, s); err == nil {
		return t, nil
	}
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t, nil
	}
	return time.Time{}, fmt.Errorf("некорректная дата: %s", s)
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, code int, err error) {
	writeJSON(w, code, map[string]string{"error": err.Error()})
}

func decode[T any](r *http.Request) (T, error) {
	var v T
	err := json.NewDecoder(r.Body).Decode(&v)
	return v, err
}

// ============ Мета и справочники ============

func (s *Server) handleMeta(w http.ResponseWriter, r *http.Request) {
	s.st.RLockStore()
	defer s.st.RUnlockStore()
	writeJSON(w, 200, map[string]any{
		"demoNow":    model.DemoNow,
		"portfolio":  "Цифровизация B2B",
		"director":   "Иванов И.И.",
		"currency":   "млн ₽",
		"aiProvider": "DemoProvider (интерфейс ai.Provider; в пилоте подключается LLM)",
	})
}

func (s *Server) handleDirectories(w http.ResponseWriter, r *http.Request) {
	s.st.RLockStore()
	defer s.st.RUnlockStore()
	clients := sortedVals(s.st.Clients)
	suppliers := sortedVals(s.st.Suppliers)
	employees := sortedVals(s.st.Employees)
	works := sortedVals(s.st.Works)
	products := sortedVals(s.st.Products)
	regions := sortedVals(s.st.Regions)
	writeJSON(w, 200, map[string]any{
		"clients": clients, "suppliers": suppliers, "employees": employees,
		"works": works, "products": products, "regions": regions, "stages": s.st.Stages,
	})
}

// handleCreateDirectoryItem — заведение новой позиции справочника (Ф12):
// POST /api/directories/clients | suppliers | employees.
// Этапы воронки не создаются произвольно — их вероятности связаны с движком (Ф2).
func (s *Server) handleCreateDirectoryItem(w http.ResponseWriter, r *http.Request) {
	entity := r.PathValue("entity")
	s.st.LockStore()
	var (
		created any
		err     error
	)
	switch entity {
	case "clients":
		var c model.Client
		if err = json.NewDecoder(r.Body).Decode(&c); err == nil {
			var pc *model.Client
			if pc, err = s.st.CreateClient(c); err == nil {
				created = pc
			}
		}
	case "suppliers":
		var x model.Supplier
		if err = json.NewDecoder(r.Body).Decode(&x); err == nil {
			var px *model.Supplier
			if px, err = s.st.CreateSupplier(x); err == nil {
				created = px
			}
		}
	case "employees":
		var e model.Employee
		if err = json.NewDecoder(r.Body).Decode(&e); err == nil {
			var pe *model.Employee
			if pe, err = s.st.CreateEmployee(e); err == nil {
				created = pe
			}
		}
	case "works":
		var w model.Work
		if err = json.NewDecoder(r.Body).Decode(&w); err == nil {
			var pw *model.Work
			if pw, err = s.st.CreateWork(w); err == nil {
				created = pw
			}
		}
	case "products":
		var p model.Product
		if err = json.NewDecoder(r.Body).Decode(&p); err == nil {
			var pp *model.Product
			if pp, err = s.st.CreateProduct(p); err == nil {
				created = pp
			}
		}
	case "regions":
		var rg model.Region
		if err = json.NewDecoder(r.Body).Decode(&rg); err == nil {
			var pr *model.Region
			if pr, err = s.st.CreateRegion(rg); err == nil {
				created = pr
			}
		}
	default:
		s.st.UnlockStore()
		writeErr(w, 404, fmt.Errorf("неизвестный справочник: %s", entity))
		return
	}
	s.st.UnlockStore()
	if err != nil {
		writeErr(w, 400, err)
		return
	}
	writeJSON(w, 201, created)
}

func sortedVals[T any](m map[string]T) []T {
	out := make([]T, 0, len(m))
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		out = append(out, m[k])
	}
	return out
}

// ============ Портфель (Ф36–Ф37) ============

func (s *Server) handlePortfolio(w http.ResponseWriter, r *http.Request) {
	s.st.RLockStore()
	defer s.st.RUnlockStore()

	ids := make([]string, 0, len(s.st.Projects))
	for id := range s.st.Projects {
		ids = append(ids, id)
	}
	sort.Strings(ids)

	summaries := []engine.ProjectSummary{}
	var revPlan, revFc, revAct float64
	var gmPlanW, gmFcW, wsum float64
	ddsByMonth := map[string]*engine.DDSMonth{}

	for _, id := range ids {
		p := s.st.Projects[id]
		dir := s.st.Dirs()
		pc := engine.Compose(p, dir)
		summaries = append(summaries, engine.Summarize(p, dir))
		if p.Status == model.StatusDone || p.Status == model.StatusArchived {
			continue
		}
		revPlan += pc.Finance.Revenue.Total.Plan
		revFc += pc.Finance.Revenue.Total.Forecast
		revAct += pc.Finance.Revenue.Total.Actual
		if w := pc.Finance.Revenue.Total.Plan; w > 0 {
			gmPlanW += pc.Finance.GM.Plan * w
			gmFcW += pc.Finance.GM.Forecast * w
			wsum += w
		}
		for i := range pc.Finance.DDS.Monthly {
			m := &pc.Finance.DDS.Monthly[i]
			agg, ok := ddsByMonth[m.Month]
			if !ok {
				agg = &engine.DDSMonth{Month: m.Month}
				ddsByMonth[m.Month] = agg
			}
			agg.In.Plan += m.In.Plan
			agg.In.Forecast += m.In.Forecast
			agg.In.Actual += m.In.Actual
			agg.Out.Plan += m.Out.Plan
			agg.Out.Forecast += m.Out.Forecast
			agg.Out.Actual += m.Out.Actual
			agg.Gap.Plan += m.Gap.Plan
			agg.Gap.Forecast += m.Gap.Forecast
			agg.Gap.Actual += m.Gap.Actual
		}
	}
	if wsum > 0 {
		gmPlanW, gmFcW = gmPlanW/wsum, gmFcW/wsum
	}

	dds := make([]engine.DDSMonth, 0, len(ddsByMonth))
	for _, m := range sortedMonthKeys(ddsByMonth) {
		dds = append(dds, *ddsByMonth[m])
	}

	var pres []*model.Presale
	for _, ps := range s.st.Presales {
		pres = append(pres, ps)
	}
	funnel := engine.ComputeFunnel(pres, s.st.Stages)

	writeJSON(w, 200, map[string]any{
		"name":     "Цифровизация B2B",
		"director": "Иванов И.И.",
		"projects": summaries,
		"funnel":   funnel,
		"metrics": map[string]any{
			"revenuePlan": revPlan, "revenueForecast": revFc, "revenueActual": revAct,
			"gmPlan": gmPlanW, "gmForecast": gmFcW,
			"weightedPresales": funnel.TotalWeighted,
		},
		"dds": dds,
	})
}

func sortedMonthKeys(m map[string]*engine.DDSMonth) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

// ============ Пресейлы (Ф1–Ф6) ============

type presaleView struct {
	*model.Presale
	ClientName  string  `json:"clientName"`
	StageName   string  `json:"stageName"`
	Probability float64 `json:"probability"`
	Weighted    float64 `json:"weighted"`
}

func (s *Server) presaleView(ps *model.Presale, stageByID map[string]*model.Stage) presaleView {
	v := presaleView{Presale: ps}
	if c, ok := s.st.Clients[ps.ClientID]; ok {
		v.ClientName = c.Name
	}
	if st, ok := stageByID[ps.StageID]; ok {
		v.StageName = st.Name
	}
	v.Probability = ps.Probability(stageByID)
	v.Weighted = ps.Amount * v.Probability
	return v
}

func (s *Server) handlePresales(w http.ResponseWriter, r *http.Request) {
	s.st.RLockStore()
	defer s.st.RUnlockStore()
	stageByID := map[string]*model.Stage{}
	for i := range s.st.Stages {
		stageByID[s.st.Stages[i].ID] = &s.st.Stages[i]
	}
	out := []presaleView{}
	for _, ps := range sortedVals(s.st.Presales) {
		out = append(out, s.presaleView(ps, stageByID))
	}
	writeJSON(w, 200, out)
}

// handleCreatePresale — заведение новой карточки пресейла из интерфейса (Ф1).
func (s *Server) handleCreatePresale(w http.ResponseWriter, r *http.Request) {
	body, err := decode[model.Presale](r)
	if err != nil {
		writeErr(w, 400, err)
		return
	}
	s.st.LockStore()
	ps, err := s.st.CreatePresale(body)
	s.st.UnlockStore()
	if err != nil {
		writeErr(w, 400, err)
		return
	}
	s.st.RLockStore()
	defer s.st.RUnlockStore()
	stageByID := map[string]*model.Stage{}
	for i := range s.st.Stages {
		stageByID[s.st.Stages[i].ID] = &s.st.Stages[i]
	}
	writeJSON(w, 201, s.presaleView(ps, stageByID))
}

func (s *Server) handlePatchPresale(w http.ResponseWriter, r *http.Request) {
	body, err := decode[struct {
		StageID string `json:"stageId"`
	}](r)
	if err != nil {
		writeErr(w, 400, err)
		return
	}
	s.st.LockStore()
	defer s.st.UnlockStore()
	ps, err := s.st.MovePresaleStage(r.PathValue("id"), body.StageID)
	if err != nil {
		writeErr(w, 404, err)
		return
	}
	stageByID := map[string]*model.Stage{}
	for i := range s.st.Stages {
		stageByID[s.st.Stages[i].ID] = &s.st.Stages[i]
	}
	writeJSON(w, 200, s.presaleView(ps, stageByID))
}

func (s *Server) handleConvertPresale(w http.ResponseWriter, r *http.Request) {
	s.st.LockStore()
	defer s.st.UnlockStore()
	p, err := s.st.ConvertPresale(r.PathValue("id"))
	if err != nil {
		writeErr(w, 400, err)
		return
	}
	writeJSON(w, 200, map[string]string{"projectId": p.ID})
}

// ============ Проекты (Ф7–Ф29) ============

func (s *Server) handleProjects(w http.ResponseWriter, r *http.Request) {
	s.st.RLockStore()
	defer s.st.RUnlockStore()
	ids := make([]string, 0, len(s.st.Projects))
	for id := range s.st.Projects {
		ids = append(ids, id)
	}
	sort.Strings(ids)
	dir := s.st.Dirs()
	out := []engine.ProjectSummary{}
	for _, id := range ids {
		out = append(out, engine.Summarize(s.st.Projects[id], dir))
	}
	writeJSON(w, 200, out)
}

type projectCard struct {
	Project        *model.Project         `json:"project"`
	Client         *model.Client          `json:"client"`
	Team           []teamView             `json:"team"`
	Presale        *presaleView           `json:"presale"`
	Computed       engine.ProjectComputed `json:"computed"`
	Summary        engine.ProjectSummary  `json:"summary"`
	ChangeRequests []model.ChangeRequest  `json:"changeRequests"`
}

type teamView struct {
	EmployeeID string `json:"employeeId"`
	Name       string `json:"name"`
	Role       string `json:"role"`
}

func (s *Server) handleProject(w http.ResponseWriter, r *http.Request) {
	s.st.RLockStore()
	defer s.st.RUnlockStore()
	id := r.PathValue("id")
	p, ok := s.st.Projects[id]
	if !ok {
		writeErr(w, 404, fmt.Errorf("проект %s не найден", id))
		return
	}
	card := s.buildCard(p)
	writeJSON(w, 200, card)
}

func (s *Server) buildCard(p *model.Project) projectCard {
	dir := s.st.Dirs()
	card := projectCard{
		Project:        p,
		Computed:       engine.Compose(p, dir),
		Team:           []teamView{},        // пустой массив, а не null, если команда не назначена
		ChangeRequests: []model.ChangeRequest{}, // аналогично для ЗИ проекта
	}
	card.Summary = engine.Summarize(p, dir)
	if c, ok := s.st.Clients[p.ClientID]; ok {
		card.Client = &c
	}
	for _, m := range p.Team {
		if e, ok := s.st.Employees[m.EmployeeID]; ok {
			card.Team = append(card.Team, teamView{EmployeeID: m.EmployeeID, Name: e.Name, Role: m.Role})
		}
	}
	stageByID := map[string]*model.Stage{}
	for i := range s.st.Stages {
		stageByID[s.st.Stages[i].ID] = &s.st.Stages[i]
	}
	if ps, ok := s.st.Presales[p.PresaleID]; ok {
		v := s.presaleView(ps, stageByID)
		card.Presale = &v
	}
	for _, cr := range s.st.ChangeRequests {
		if cr.ProjectID == p.ID {
			card.ChangeRequests = append(card.ChangeRequests, *cr)
		}
	}
	return card
}

func (s *Server) handlePatchProject(w http.ResponseWriter, r *http.Request) {
	body, err := decode[struct {
		Status model.ProjectStatus `json:"status"`
	}](r)
	if err != nil {
		writeErr(w, 400, err)
		return
	}
	s.st.LockStore()
	defer s.st.UnlockStore()
	p, err := s.st.UpdateProjectStatus(r.PathValue("id"), body.Status)
	if err != nil {
		writeErr(w, 404, err)
		return
	}
	writeJSON(w, 200, s.buildCard(p))
}

func (s *Server) handlePatchWBS(w http.ResponseWriter, r *http.Request) {
	body, err := decode[struct {
		Start *string `json:"start"`
		End   *string `json:"end"`
	}](r)
	if err != nil {
		writeErr(w, 400, err)
		return
	}
	var start, end *time.Time
	if body.Start != nil {
		t, err := parseDate(*body.Start)
		if err != nil {
			writeErr(w, 400, err)
			return
		}
		start = &t
	}
	if body.End != nil {
		t, err := parseDate(*body.End)
		if err != nil {
			writeErr(w, 400, err)
			return
		}
		end = &t
	}
	s.st.LockStore()
	defer s.st.UnlockStore()
	p, err := s.st.UpdateWBItem(r.PathValue("id"), r.PathValue("itemId"), start, end)
	if err != nil {
		writeErr(w, 400, err)
		return
	}
	writeJSON(w, 200, s.buildCard(p))
}

// handlePurchasePreview — предупреждение перед изменением закупки (Ф20).
func (s *Server) handlePurchasePreview(w http.ResponseWriter, r *http.Request) {
	body, err := decode[struct {
		ForecastDate string `json:"forecastDate"`
	}](r)
	if err != nil {
		writeErr(w, 400, err)
		return
	}
	fd, err := parseDate(body.ForecastDate)
	if err != nil || fd.IsZero() {
		writeErr(w, 400, fmt.Errorf("некорректная дата прогноза: %q", body.ForecastDate))
		return
	}
	s.st.RLockStore()
	defer s.st.RUnlockStore()
	p, ok := s.st.Projects[r.PathValue("id")]
	if !ok {
		writeErr(w, 404, fmt.Errorf("проект не найден"))
		return
	}
	writeJSON(w, 200, engine.PreviewPurchaseImpact(p, r.PathValue("pid"), fd))
}

func (s *Server) handlePatchPurchase(w http.ResponseWriter, r *http.Request) {
	body, err := decode[struct {
		ForecastDate *string               `json:"forecastDate"`
		Status       *model.PurchaseStatus `json:"status"`
	}](r)
	if err != nil {
		writeErr(w, 400, err)
		return
	}
	var fd *time.Time
	if body.ForecastDate != nil && *body.ForecastDate != "" {
		t, err := parseDate(*body.ForecastDate)
		if err != nil {
			writeErr(w, 400, err)
			return
		}
		fd = &t
	}
	s.st.LockStore()
	defer s.st.UnlockStore()
	p, err := s.st.UpdatePurchase(r.PathValue("id"), r.PathValue("pid"), fd, body.Status)
	if err != nil {
		writeErr(w, 404, err)
		return
	}
	writeJSON(w, 200, s.buildCard(p))
}

// ============ Сценарии (what-if песочница) ============

func (s *Server) handleScenarios(w http.ResponseWriter, r *http.Request) {
	s.st.RLockStore()
	defer s.st.RUnlockStore()
	p, ok := s.st.Projects[r.PathValue("id")]
	if !ok {
		writeErr(w, 404, fmt.Errorf("проект не найден"))
		return
	}
	writeJSON(w, 200, p.Scenarios)
}

func (s *Server) handleCreateScenario(w http.ResponseWriter, r *http.Request) {
	body, err := decode[struct {
		Name string             `json:"name"`
		Ops  []model.ScenarioOp `json:"ops"`
		Save bool               `json:"save"`
	}](r)
	if err != nil {
		writeErr(w, 400, err)
		return
	}
	s.st.LockStore()
	defer s.st.UnlockStore()
	p, ok := s.st.Projects[r.PathValue("id")]
	if !ok {
		writeErr(w, 404, fmt.Errorf("проект не найден"))
		return
	}
	comp := engine.EvaluateScenario(p, body.Ops)
	var saved *model.Scenario
	if body.Save {
		sc := model.Scenario{ID: fmt.Sprintf("SC-%d", len(p.Scenarios)+1), ProjectID: p.ID, Name: body.Name, Ops: body.Ops}
		saved = s.st.AddScenario(sc)
		s.st.AddEvent(p, model.DemoNow, model.EventChange,
			fmt.Sprintf("Сохранён сценарий «%s» (базовый план не изменён)", body.Name), "РП")
	}
	writeJSON(w, 200, map[string]any{"comparison": comp, "scenario": saved})
}

func (s *Server) handleScenarioToCR(w http.ResponseWriter, r *http.Request) {
	s.st.LockStore()
	defer s.st.UnlockStore()
	p, ok := s.st.Projects[r.PathValue("id")]
	if !ok {
		writeErr(w, 404, fmt.Errorf("проект не найден"))
		return
	}
	var sc *model.Scenario
	for i := range p.Scenarios {
		if p.Scenarios[i].ID == r.PathValue("sid") {
			sc = &p.Scenarios[i]
		}
	}
	if sc == nil {
		writeErr(w, 404, fmt.Errorf("сценарий не найден"))
		return
	}
	// Влияние пересчитывается движком по текущему состоянию проекта.
	gmPP, dds := engine.ComputeCRImpact(p)
	num := 20 + len(s.st.ChangeRequests)
	cr := &model.ChangeRequest{
		ID: fmt.Sprintf("ЗИ-2024-%03d", num), ProjectID: p.ID, Type: model.CRSchedule,
		Reason:      "Из сценария what-if",
		Description: fmt.Sprintf("Сценарий «%s»: %d операция(й) пересчёта.", sc.Name, len(sc.Ops)),
		ImpactGMpp:  gmPP, ImpactDDS: dds,
		Status: model.CRDraft, CreatedAt: model.DemoNow, Author: "РП", ScenarioID: sc.ID,
	}
	s.st.ChangeRequests[cr.ID] = cr
	s.st.AddEvent(p, model.DemoNow, model.EventChange, fmt.Sprintf("Из сценария «%s» создан запрос на изменение %s", sc.Name, cr.ID), "РП")
	writeJSON(w, 200, cr)
}

// ============ Запросы на изменение (Ф33–Ф34) ============

func (s *Server) handleCRs(w http.ResponseWriter, r *http.Request) {
	s.st.LockStore()
	defer s.st.UnlockStore()
	out := []model.ChangeRequest{}
	for _, cr := range s.st.ChangeRequests {
		// Влияние всегда актуально — пересчитываем движком на отдачу.
		if p, ok := s.st.Projects[cr.ProjectID]; ok && cr.Status != model.CRApproved {
			cr.ImpactGMpp, cr.ImpactDDS = engine.ComputeCRImpact(p)
		}
		out = append(out, *cr)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.Before(out[j].CreatedAt) })
	writeJSON(w, 200, out)
}

func (s *Server) handleCreateCR(w http.ResponseWriter, r *http.Request) {
	body, err := decode[struct {
		ProjectID   string       `json:"projectId"`
		Type        model.CRType `json:"type"`
		Reason      string       `json:"reason"`
		Description string       `json:"description"`
		Author      string       `json:"author"`
		ScenarioID  string       `json:"scenarioId"`
	}](r)
	if err != nil {
		writeErr(w, 400, err)
		return
	}
	s.st.LockStore()
	defer s.st.UnlockStore()
	num := 20 + len(s.st.ChangeRequests)
	cr := &model.ChangeRequest{
		ID: fmt.Sprintf("ЗИ-2024-%03d", num), ProjectID: body.ProjectID, Type: body.Type,
		Reason: body.Reason, Description: body.Description,
		Status: model.CRDraft, CreatedAt: model.DemoNow,
		Author: orDefault(body.Author, "РП"), ScenarioID: body.ScenarioID,
	}
	s.st.CreateCR(cr)
	writeJSON(w, 200, cr)
}

func (s *Server) handlePatchCR(w http.ResponseWriter, r *http.Request) {
	body, err := decode[struct {
		Status model.CRStatus `json:"status"`
	}](r)
	if err != nil {
		writeErr(w, 400, err)
		return
	}
	s.st.LockStore()
	defer s.st.UnlockStore()
	cr, err := s.st.SetCRStatus(r.PathValue("id"), body.Status)
	if err != nil {
		writeErr(w, 404, err)
		return
	}
	writeJSON(w, 200, cr)
}

func orDefault(v, def string) string {
	if strings.TrimSpace(v) == "" {
		return def
	}
	return v
}

// ============ ИИ (Ф38–Ф40) ============

func (s *Server) handleAIChat(w http.ResponseWriter, r *http.Request) {
	body, err := decode[struct {
		Question string `json:"question"`
	}](r)
	if err != nil {
		writeErr(w, 400, err)
		return
	}
	writeJSON(w, 200, map[string]string{"answer": s.ai.Chat(body.Question)})
}

func (s *Server) handleAIStatusReport(w http.ResponseWriter, r *http.Request) {
	rep, err := s.ai.StatusReport(r.PathValue("projectId"))
	if err != nil {
		writeErr(w, 404, err)
		return
	}
	writeJSON(w, 200, map[string]string{"report": rep})
}

func (s *Server) handleAIRecommendations(w http.ResponseWriter, r *http.Request) {
	s.st.RLockStore()
	defer s.st.RUnlockStore()
	if _, ok := s.st.Projects[r.PathValue("projectId")]; !ok {
		writeErr(w, 404, fmt.Errorf("проект не найден"))
		return
	}
	writeJSON(w, 200, s.ai.Recommendations(r.PathValue("projectId")))
}

// ============ BPMN (4.1.5) ============

func (s *Server) handleBPMNList(w http.ResponseWriter, r *http.Request) {
	s.st.RLockStore()
	defer s.st.RUnlockStore()
	out := []map[string]any{}
	for _, d := range bpmn.Diagrams() {
		_, customized := s.st.BPMN[d.Key]
		out = append(out, map[string]any{"key": d.Key, "name": d.Name, "description": d.Description, "customized": customized})
	}
	writeJSON(w, 200, out)
}

func (s *Server) handleBPMNGet(w http.ResponseWriter, r *http.Request) {
	key := r.PathValue("key")
	s.st.RLockStore()
	defer s.st.RUnlockStore()
	if xml, ok := s.st.BPMN[key]; ok {
		writeJSON(w, 200, map[string]string{"xml": xml, "source": "custom"})
		return
	}
	xml, ok := bpmn.Generate(key)
	if !ok {
		writeErr(w, 404, fmt.Errorf("диаграмма %s не найдена", key))
		return
	}
	writeJSON(w, 200, map[string]string{"xml": xml, "source": "generated"})
}

func (s *Server) handleBPMNPut(w http.ResponseWriter, r *http.Request) {
	body, err := decode[struct {
		XML string `json:"xml"`
	}](r)
	if err != nil {
		writeErr(w, 400, err)
		return
	}
	s.st.LockStore()
	defer s.st.UnlockStore()
	s.st.BPMN[r.PathValue("key")] = body.XML
	writeJSON(w, 200, map[string]string{"status": "saved"})
}

// handleBPMNReset — сброс к сгенерированной версии.
func (s *Server) handleBPMNReset(w http.ResponseWriter, r *http.Request) {
	key := r.PathValue("key")
	s.st.LockStore()
	delete(s.st.BPMN, key)
	s.st.UnlockStore()
	xml, ok := bpmn.Generate(key)
	if !ok {
		writeErr(w, 404, fmt.Errorf("диаграмма %s не найдена", key))
		return
	}
	writeJSON(w, 200, map[string]string{"xml": xml, "source": "generated"})
}

// ============ C4 (4.1.5) ============

func (s *Server) handleC4(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, 200, c4.Generate())
}

// StartupCheck — простая самопроверка при старте (числа движка в лог).
func (s *Server) StartupCheck() {
	p := s.st.Projects["PRJ-2024-002"]
	if p == nil {
		log.Println("WARN: демо-проект PRJ-2024-002 не найден")
		return
	}
	pc := engine.Compose(p, s.st.Dirs())
	log.Printf("Самопроверка движка: PRJ-2024-002 сдвиг вех %d дн., GM план %.1f%%, прогноз %.1f%%",
		pc.Health.Schedule.DevDays, pc.Finance.GM.Plan*100, pc.Finance.GM.Forecast*100)
}
