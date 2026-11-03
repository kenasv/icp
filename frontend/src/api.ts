// API-клиент ИСУП. Все данные фронтенд получает из расчётного движка бэкенда.
import type {
  Portfolio, PresaleView, ProjectSummary, ProjectCard, ImpactPreview,
  Scenario, ScenarioOp, ScenarioComparison, ChangeRequest, Insight,
} from './types'

const BASE = '/api'

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try {
      const body = await res.json()
      if (body?.error) msg = body.error
    } catch { /* ignore */ }
    throw new Error(msg)
  }
  return res.json() as Promise<T>
}

export const api = {
  meta: () => req<any>('/meta'),
  directories: () => req<any>('/directories'),

  portfolio: () => req<Portfolio>('/portfolio'),

  presales: () => req<PresaleView[]>('/presales'),
  createPresale: (body: {
    name: string; clientId: string; product?: string; region?: string;
    amount: number; stageId: string; leadSource?: string; team?: string[];
  }) => req<PresaleView>('/presales', { method: 'POST', body: JSON.stringify(body) }),
  movePresale: (id: string, stageId: string) =>
    req<PresaleView>(`/presales/${id}`, { method: 'PATCH', body: JSON.stringify({ stageId }) }),
  convertPresale: (id: string) =>
    req<{ projectId: string }>(`/presales/${id}/convert`, { method: 'POST' }),

  projects: () => req<ProjectSummary[]>('/projects'),
  project: (id: string) => req<ProjectCard>(`/projects/${id}`),
  patchProject: (id: string, body: any) => req<ProjectCard>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  patchWbs: (id: string, itemId: string, body: any) =>
    req<ProjectCard>(`/projects/${id}/wbs/${itemId}`, { method: 'PATCH', body: JSON.stringify(body) }),

  purchasePreview: (id: string, pid: string, forecastDate: string) =>
    req<ImpactPreview>(`/projects/${id}/purchases/${pid}/preview`, { method: 'POST', body: JSON.stringify({ forecastDate }) }),
  patchPurchase: (id: string, pid: string, body: any) =>
    req<ProjectCard>(`/projects/${id}/purchases/${pid}`, { method: 'PATCH', body: JSON.stringify(body) }),

  scenarios: (id: string) => req<Scenario[]>(`/projects/${id}/scenarios`),
  createScenario: (id: string, body: { name: string; ops: ScenarioOp[]; save: boolean }) =>
    req<{ comparison: ScenarioComparison; scenario: Scenario | null }>(`/projects/${id}/scenarios`, { method: 'POST', body: JSON.stringify(body) }),
  scenarioToCR: (id: string, sid: string) =>
    req<ChangeRequest>(`/projects/${id}/scenarios/${sid}/to-cr`, { method: 'POST' }),

  changeRequests: () => req<ChangeRequest[]>('/change-requests'),
  createCR: (body: any) => req<ChangeRequest>('/change-requests', { method: 'POST', body: JSON.stringify(body) }),
  patchCR: (id: string, status: string) => req<ChangeRequest>(`/change-requests/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  aiChat: (question: string) =>
    req<{ answer: string }>('/ai/chat', { method: 'POST', body: JSON.stringify({ question }) }),
  aiStatusReport: (projectId: string) => req<{ report: string }>(`/ai/status-report/${projectId}`),
  aiRecommendations: (projectId: string) => req<Insight[]>(`/ai/recommendations/${projectId}`),

  bpmnList: () => req<{ key: string; name: string; description: string; customized: boolean }[]>('/bpmn'),
  bpmnGet: (key: string) => req<{ xml: string; source: string }>(`/bpmn/${key}`),
  bpmnPut: (key: string, xml: string) => req<any>(`/bpmn/${key}`, { method: 'PUT', body: JSON.stringify({ xml }) }),
  bpmnReset: (key: string) => req<{ xml: string; source: string }>(`/bpmn/${key}`, { method: 'DELETE' }),

  c4: () => req<{ mermaidContext: string; mermaidContainer: string; structurizrDsl: string }>('/c4'),
}
