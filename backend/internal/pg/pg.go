// Package pg — хранение состояния ИСУП в PostgreSQL (сервис db в docker compose).
// Стратегия записи: после каждого изменяющего запроса API синхронизирует всё
// состояние одной транзакцией (объём демо-данных — десятки строк, это гарантирует
// консистентность и проще, чем точечные upsert по каждому полю движка).
// Чтение: при старте состояние загружается из БД; если БД пуста — засеиваются
// демо-данные портфеля «Цифровизация B2B» и сохраняются в БД.
package pg

import (
	"database/sql"
	"encoding/json"
	"fmt"

	_ "github.com/jackc/pgx/v5/stdlib"

	"isup/internal/model"
	"isup/internal/store"
)

type DB struct{ db *sql.DB }

// Open — подключение к PostgreSQL (DSN вида postgres://user:pass@host:5432/isup?sslmode=disable).
func Open(dsn string) (*DB, error) {
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		return nil, err
	}
	if err := db.Ping(); err != nil {
		return nil, err
	}
	return &DB{db}, nil
}

// EnsureSchema — создаёт таблицы, если их ещё нет (владелец схемы — бэкенд).
func (d *DB) EnsureSchema() error {
	const schema = `
CREATE TABLE IF NOT EXISTS clients (
  id text PRIMARY KEY, name text NOT NULL, inn text NOT NULL DEFAULT '',
  segment text NOT NULL DEFAULT '', region text NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS suppliers (
  id text PRIMARY KEY, name text NOT NULL
);
CREATE TABLE IF NOT EXISTS employees (
  id text PRIMARY KEY, name text NOT NULL, position text NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS stages (
  id text PRIMARY KEY, name text NOT NULL,
  probability double precision NOT NULL DEFAULT 0, sort_order int NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS presales (
  id text PRIMARY KEY, number text NOT NULL, name text NOT NULL,
  client_id text NOT NULL DEFAULT '', product text NOT NULL DEFAULT '', region text NOT NULL DEFAULT '',
  amount double precision NOT NULL DEFAULT 0, stage_id text NOT NULL DEFAULT '',
  probability_override double precision, team jsonb NOT NULL DEFAULT '[]',
  lead_source text NOT NULL DEFAULT '', stage_history jsonb NOT NULL DEFAULT '[]',
  project_id text NOT NULL DEFAULT '', converted_at timestamptz
);
CREATE TABLE IF NOT EXISTS projects (
  id text PRIMARY KEY, name text NOT NULL,
  client_id text NOT NULL DEFAULT '', product text NOT NULL DEFAULT '', region text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT '', contract_amount double precision NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT '', note text NOT NULL DEFAULT '', presale_id text NOT NULL DEFAULT '',
  team jsonb NOT NULL DEFAULT '[]', wbs jsonb NOT NULL DEFAULT '[]', budget jsonb NOT NULL DEFAULT '[]',
  purchases jsonb NOT NULL DEFAULT '[]', risks jsonb NOT NULL DEFAULT '[]', baselines jsonb NOT NULL DEFAULT '[]',
  events jsonb NOT NULL DEFAULT '[]', scenarios jsonb NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS change_requests (
  id text PRIMARY KEY, project_id text NOT NULL DEFAULT '', type text NOT NULL DEFAULT '',
  reason text NOT NULL DEFAULT '', description text NOT NULL DEFAULT '',
  impact_gm_pp double precision NOT NULL DEFAULT 0, impact_dds double precision NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT '', scenario_id text NOT NULL DEFAULT '',
  created_at timestamptz, author text NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS bpmn (
  key text PRIMARY KEY, xml text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
`
	_, err := d.db.Exec(schema)
	return err
}

// HasData — есть ли в БД уже загруженные данные (проекты или пресейлы).
func (d *DB) HasData() (bool, error) {
	for _, table := range []string{"projects", "presales"} {
		var n int
		if err := d.db.QueryRow("SELECT count(*) FROM " + table).Scan(&n); err != nil {
			return false, err
		}
		if n > 0 {
			return true, nil
		}
	}
	return false, nil
}

// Sync — записывает всё состояние хранилища в БД одной транзакцией
// (демо-объёмы малы, поэтому очистка + вставка проще и надёжнее diff-ов).
func (d *DB) Sync(s *store.Store) error {
	s.RLockStore()
	defer s.RUnlockStore()

	tx, err := d.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for _, t := range []string{"clients", "suppliers", "employees", "stages", "presales", "projects", "change_requests", "bpmn"} {
		if _, err := tx.Exec("DELETE FROM " + t); err != nil {
			return fmt.Errorf("очистка %s: %w", t, err)
		}
	}

	for _, c := range s.Clients {
		if _, err := tx.Exec(`INSERT INTO clients (id, name, inn, segment, region) VALUES ($1,$2,$3,$4,$5)`,
			c.ID, c.Name, c.INN, c.Segment, c.Region); err != nil {
			return err
		}
	}
	for _, x := range s.Suppliers {
		if _, err := tx.Exec(`INSERT INTO suppliers (id, name) VALUES ($1,$2)`, x.ID, x.Name); err != nil {
			return err
		}
	}
	for _, e := range s.Employees {
		if _, err := tx.Exec(`INSERT INTO employees (id, name, position) VALUES ($1,$2,$3)`, e.ID, e.Name, e.Position); err != nil {
			return err
		}
	}
	for _, st := range s.Stages {
		if _, err := tx.Exec(`INSERT INTO stages (id, name, probability, sort_order) VALUES ($1,$2,$3,$4)`,
			st.ID, st.Name, st.Probability, st.Order); err != nil {
			return err
		}
	}
	for _, ps := range s.Presales {
		team, _ := json.Marshal(ps.Team)
		hist, _ := json.Marshal(ps.StageHistory)
		if _, err := tx.Exec(`
INSERT INTO presales (id, number, name, client_id, product, region, amount, stage_id,
  probability_override, team, lead_source, stage_history, project_id, converted_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
			ps.ID, ps.Number, ps.Name, ps.ClientID, ps.Product, ps.Region, ps.Amount, ps.StageID,
			ps.ProbabilityOverride, team, ps.LeadSource, hist, ps.ProjectID, ps.ConvertedAt); err != nil {
			return err
		}
	}
	for _, p := range s.Projects {
		if err := insertProject(tx, p); err != nil {
			return err
		}
	}
	for _, cr := range s.ChangeRequests {
		if _, err := tx.Exec(`
INSERT INTO change_requests (id, project_id, type, reason, description,
  impact_gm_pp, impact_dds, status, scenario_id, created_at, author)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
			cr.ID, cr.ProjectID, cr.Type, cr.Reason, cr.Description,
			cr.ImpactGMpp, cr.ImpactDDS, cr.Status, cr.ScenarioID, cr.CreatedAt, cr.Author); err != nil {
			return err
		}
	}
	for key, xml := range s.BPMN {
		if _, err := tx.Exec(`INSERT INTO bpmn (key, xml) VALUES ($1,$2)`, key, xml); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func insertProject(tx *sql.Tx, p *model.Project) error {
	mustJSON := func(v any) []byte { b, _ := json.Marshal(v); return b }
	_, err := tx.Exec(`
INSERT INTO projects (id, name, client_id, product, region, type, contract_amount, status, note, presale_id,
  team, wbs, budget, purchases, risks, baselines, events, scenarios)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
		p.ID, p.Name, p.ClientID, p.Product, p.Region, p.Type, p.ContractAmount, p.Status, p.Note, p.PresaleID,
		mustJSON(p.Team), mustJSON(p.WBS), mustJSON(p.Budget), mustJSON(p.Purchases),
		mustJSON(p.Risks), mustJSON(p.Baselines), mustJSON(p.Events), mustJSON(p.Scenarios))
	return err
}

// LoadInto — загружает состояние из БД в пустое хранилище.
func (d *DB) LoadInto(s *store.Store) error {
	rows, err := d.db.Query(`SELECT id, name, inn, segment, region FROM clients`)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var c model.Client
		if err := rows.Scan(&c.ID, &c.Name, &c.INN, &c.Segment, &c.Region); err != nil {
			return err
		}
		s.Clients[c.ID] = c
	}
	if err := rows.Err(); err != nil {
		return err
	}

	rows2, err := d.db.Query(`SELECT id, name FROM suppliers`)
	if err != nil {
		return err
	}
	defer rows2.Close()
	for rows2.Next() {
		var x model.Supplier
		if err := rows2.Scan(&x.ID, &x.Name); err != nil {
			return err
		}
		s.Suppliers[x.ID] = x
	}
	if err := rows2.Err(); err != nil {
		return err
	}

	rows3, err := d.db.Query(`SELECT id, name, position FROM employees`)
	if err != nil {
		return err
	}
	defer rows3.Close()
	for rows3.Next() {
		var e model.Employee
		if err := rows3.Scan(&e.ID, &e.Name, &e.Position); err != nil {
			return err
		}
		s.Employees[e.ID] = e
	}
	if err := rows3.Err(); err != nil {
		return err
	}

	rows4, err := d.db.Query(`SELECT id, name, probability, sort_order FROM stages ORDER BY sort_order`)
	if err != nil {
		return err
	}
	defer rows4.Close()
	for rows4.Next() {
		var st model.Stage
		if err := rows4.Scan(&st.ID, &st.Name, &st.Probability, &st.Order); err != nil {
			return err
		}
		s.Stages = append(s.Stages, st)
	}
	if err := rows4.Err(); err != nil {
		return err
	}

	rows5, err := d.db.Query(`
SELECT id, number, name, client_id, product, region, amount, stage_id,
  probability_override, team, lead_source, stage_history, project_id, converted_at FROM presales`)
	if err != nil {
		return err
	}
	defer rows5.Close()
	for rows5.Next() {
		ps := &model.Presale{}
		var team, hist []byte
		if err := rows5.Scan(&ps.ID, &ps.Number, &ps.Name, &ps.ClientID, &ps.Product, &ps.Region,
			&ps.Amount, &ps.StageID, &ps.ProbabilityOverride, &team, &ps.LeadSource, &hist,
			&ps.ProjectID, &ps.ConvertedAt); err != nil {
			return err
		}
		if len(team) > 0 {
			if err := json.Unmarshal(team, &ps.Team); err != nil {
				return fmt.Errorf("пресейл %s: team: %w", ps.ID, err)
			}
		}
		if len(hist) > 0 {
			if err := json.Unmarshal(hist, &ps.StageHistory); err != nil {
				return fmt.Errorf("пресейл %s: stage_history: %w", ps.ID, err)
			}
		}
		s.Presales[ps.ID] = ps
	}
	if err := rows5.Err(); err != nil {
		return err
	}

	rows6, err := d.db.Query(`
SELECT id, name, client_id, product, region, type, contract_amount, status, note, presale_id,
  team, wbs, budget, purchases, risks, baselines, events, scenarios FROM projects`)
	if err != nil {
		return err
	}
	defer rows6.Close()
	for rows6.Next() {
		p := &model.Project{}
		var team, wbs, budget, purchases, risks, baselines, events, scenarios []byte
		if err := rows6.Scan(&p.ID, &p.Name, &p.ClientID, &p.Product, &p.Region, &p.Type,
			&p.ContractAmount, &p.Status, &p.Note, &p.PresaleID,
			&team, &wbs, &budget, &purchases, &risks, &baselines, &events, &scenarios); err != nil {
			return err
		}
		for _, pair := range []struct {
			raw []byte
			dst any
		}{
			{team, &p.Team}, {wbs, &p.WBS}, {budget, &p.Budget}, {purchases, &p.Purchases},
			{risks, &p.Risks}, {baselines, &p.Baselines}, {events, &p.Events}, {scenarios, &p.Scenarios},
		} {
			if len(pair.raw) > 0 {
				if err := json.Unmarshal(pair.raw, pair.dst); err != nil {
					return fmt.Errorf("проект %s: %w", p.ID, err)
				}
			}
		}
		// В БД могли лежать null-ы (проекты из пресейла, созданные до фикса) — нормализуем.
		p.EnsureSlices()
		s.Projects[p.ID] = p
	}
	if err := rows6.Err(); err != nil {
		return err
	}

	rows7, err := d.db.Query(`
SELECT id, project_id, type, reason, description, impact_gm_pp, impact_dds,
  status, scenario_id, created_at, author FROM change_requests`)
	if err != nil {
		return err
	}
	defer rows7.Close()
	for rows7.Next() {
		cr := &model.ChangeRequest{}
		if err := rows7.Scan(&cr.ID, &cr.ProjectID, &cr.Type, &cr.Reason, &cr.Description,
			&cr.ImpactGMpp, &cr.ImpactDDS, &cr.Status, &cr.ScenarioID, &cr.CreatedAt, &cr.Author); err != nil {
			return err
		}
		s.ChangeRequests[cr.ID] = cr
	}
	if err := rows7.Err(); err != nil {
		return err
	}

	rows8, err := d.db.Query(`SELECT key, xml FROM bpmn`)
	if err != nil {
		return err
	}
	defer rows8.Close()
	for rows8.Next() {
		var key, xml string
		if err := rows8.Scan(&key, &xml); err != nil {
			return err
		}
		s.BPMN[key] = xml
	}
	if err := rows8.Err(); err != nil {
		return err
	}

	s.PostLoad() // последовательности ID событий и т.п.
	return nil
}

// Close — закрыть соединение.
func (d *DB) Close() error { return d.db.Close() }
