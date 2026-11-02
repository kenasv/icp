// Типы данных ИСУП (соответствуют JSON Go-бэкенда).
// Суммы — млн ₽; даты приходят в ISO (YYYY-MM-DDT...) и форматируются как ДД.ММ.ГГГГ.

export type Zone = 'green' | 'yellow' | 'red'

export interface Client { id: string; name: string; inn: string; segment: string; region: string }
export interface Supplier { id: string; name: string }
export interface Employee { id: string; name: string; position: string }
export interface Stage { id: string; name: string; probability: number; order: number }

export interface StageChange { date: string; fromStage: string; toStage: string; comment?: string }

export interface PresaleView {
  id: string; number: string; name: string; clientId: string; clientName: string
  product: string; region: string; amount: number; stageId: string; stageName: string
  probability: number; weighted: number; team: string[]; leadSource: string
  stageHistory: StageChange[]; projectId?: string; convertedAt?: string
}

export interface Dependency { fromId: string; lagDays: number }

export interface PurchaseLink {
  id: string; number: string; name: string; supplier: string; amount: number
  status: string; planDate: string; forecastDate: string; devDays: number
}

export interface BudgetLink {
  id: string; article: string; isRevenue: boolean
  planSum: number; planMonth: string; forecastSum: number; forecastMonth: string
}

export interface WBSRow {
  id: string; parentId?: string; type: 'phase' | 'work' | 'milestone'; name: string
  start: string; end: string; baseStart: string; baseEnd: string; hasBase: boolean
  devDays: number; dependencies?: Dependency[]; purchase?: PurchaseLink; budgetLinks?: BudgetLink[]
}

export interface Side { plan: number; forecast: number; actual: number }
export interface DDSMonth { month: string; in: Side; out: Side; gap: Side }
export interface GMMonth { month: string; plan: number; forecast: number; actual: number }
export interface Totals { plan: number; forecast: number; actual: number }

export interface ArticleRow {
  id: string; article: string; isRevenue: boolean; milestoneId: string
  plan: Record<string, number>; forecast: Record<string, number>; actual: Record<string, number>
  total: Totals
}

export interface FinanceComputed {
  months: string[]; articles: ArticleRow[]
  revenue: { plan: Record<string, number>; forecast: Record<string, number>; actual: Record<string, number>; total: Totals }
  cost: { plan: Record<string, number>; forecast: Record<string, number>; actual: Record<string, number>; total: Totals }
  gm: { plan: number; forecast: number; actual: number; monthly: GMMonth[] }
  dds: { monthly: DDSMonth[] }
  oebsSyncAt: string
}

export interface HealthPart { zone: Zone; reason: string; devDays?: number; devPct?: number; devPp?: number }
export interface HealthComputed {
  schedule: HealthPart; revenue: HealthPart; gm: HealthPart
  overall: Zone; overallReason: string
}

export interface CascadeRow {
  itemId: string; name: string; type: string; baseDate: string; forecastDate: string
  devDays: number; shifted: boolean
}
export interface FinanceShift {
  itemId: string; article: string; isRevenue: boolean; amount: number
  planMonth: string; forecastMonth: string; shiftMonths: number
}
export interface PurchaseCascade {
  number: string; name: string; amount: number; status: string
  planDate: string; forecastDate: string; devDays: number; milestone: string; affected: string[]
}
export interface CascadeComputed {
  rows: CascadeRow[]; financeShifts: FinanceShift[]; purchases: PurchaseCascade[]; baselineVersion: number
}

export interface ProjectSummary {
  id: string; name: string; clientName: string; status: string; amount: number
  gmPlan: number; gmForecast: number; endPlan: string; endForecast: string
  devDays: number; health: Zone; healthReason: string; note: string
}

export interface Insight { severity: 'info' | 'warning' | 'critical'; text: string }

export interface TeamView { employeeId: string; name: string; role: string }

export interface Purchase {
  id: string; number: string; name: string; supplierId: string; amount: number
  status: string; planDate: string; forecastDate: string; milestoneId: string
}

export interface Risk {
  id: string; name: string; probability: string; impact: string
  owner: string; dueDate: string; status: string
}

export interface Baseline {
  version: number; approvedAt: string; approvedBy: string
  items: { itemId: string; name: string; type: string; start: string; end: string }[]
  finance: { month: string; revenue: number; cost: number }[]
  comment: string
}

export interface ScenarioOp {
  kind: 'shiftMilestone' | 'shiftWork' | 'shiftDuration' | 'addCost'
  targetId?: string; shiftDays?: number; durationDelta?: number
  article?: string; amount?: number; month?: string
}

export interface Scenario { id: string; projectId: string; name: string; ops: ScenarioOp[]; createdAt: string }

export interface ChangeRequest {
  id: string; projectId: string; type: string; reason: string; description: string
  impactGmPp: number; impactDds: number; status: string; scenarioId?: string
  createdAt: string; author: string
}

export interface EventItem {
  id: string; projectId?: string; at: string
  type: 'статус' | 'согласование' | 'изменение' | 'риск' | 'отклонение' | 'комментарий ИИ'
  text: string; author?: string
}

export interface Project {
  id: string; name: string; clientId: string; product: string; region: string; type: string
  contractAmount: number; status: string; note?: string; presaleId: string
  team: { employeeId: string; role: string }[]; wbs: any[]; budget: any[]
  purchases: Purchase[]; risks: Risk[]; baselines: Baseline[]; events: EventItem[]; scenarios: Scenario[]
}

export interface ProjectCard {
  project: Project; client?: Client; team: TeamView[]; presale?: PresaleView
  computed: { schedule: WBSRow[]; finance: FinanceComputed; health: HealthComputed; cascade: CascadeComputed }
  summary: ProjectSummary; changeRequests: ChangeRequest[]
}

export interface FunnelStageMetrics {
  stageId: string; name: string; probability: number; count: number; sum: number; weighted: number
}
export interface FunnelComputed {
  stages: FunnelStageMetrics[]; totalCount: number; totalSum: number; totalWeighted: number
  conversions: { from: string; to: string; rate: number }[]
}

export interface Portfolio {
  name: string; director: string
  projects: ProjectSummary[]; funnel: FunnelComputed
  metrics: { revenuePlan: number; revenueForecast: number; revenueActual: number; gmPlan: number; gmForecast: number; weightedPresales: number }
  dds: DDSMonth[]
}

export interface ImpactItemDiff {
  itemId: string; name: string; type: string; oldDate: string; newDate: string; deltaDays: number
}
export interface ImpactPreview { affectedWorks: number; affectedMilestones: number; items: ImpactItemDiff[] }

export interface MilestoneCompare { milestoneId: string; name: string; date: string }
export interface CashGapMonth { month: string; gap: number }
export interface ScenarioColumn {
  keyMilestones: MilestoneCompare[]; gm: number; cashGaps: CashGapMonth[]; health: HealthComputed
}
export interface ScenarioComparison { base: ScenarioColumn; current: ScenarioColumn; scenario: ScenarioColumn }
