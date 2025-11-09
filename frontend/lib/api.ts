import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'demo_key'

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'X-API-Key': API_KEY,
  },
})

// Types
export interface Alert {
  alert_id: string
  rule_name: string
  score: number
  severity: string
  anchored: boolean
  created_at: string
  evidence_path?: string
  narrative?: string
}

export interface Case {
  case_id: string
  title: string
  status: string
  priority: string
  assignee?: string
  created_at: string
  updated_at: string
}

export interface Metrics {
  eps: number
  p50_ms: number
  p95_ms: number
  alerts_emitted: number
  rules: Record<string, number>
}

// API Functions
export const getHealth = () => api.get('/api/health')

export const getMetrics = () => api.get<Metrics>('/api/metrics')

export const getAlerts = (params?: {
  page?: number
  page_size?: number
  anchored?: boolean
  min_score?: number
}) => api.get('/api/alerts', { params })

export const getAlert = (alertId: string) => 
  api.get<Alert>(`/api/alerts/${alertId}`)

export const getAlertExplanation = (alertId: string) =>
  api.get(`/api/alerts/${alertId}/explanation`)

export const getCases = (params?: { page?: number; page_size?: number }) =>
  api.get('/api/cases', { params })

export const getCase = (caseId: string) =>
  api.get(`/api/cases/${caseId}`)

export const createCase = (data: { title: string; priority: string; assignee?: string }) =>
  api.post('/api/cases', data)

export const assignCase = (caseId: string, assignee: string) =>
  api.post(`/api/cases/${caseId}/assign`, { assignee })

export const addCaseComment = (caseId: string, author: string, text: string) =>
  api.post(`/api/cases/${caseId}/comment`, { author, text })

export const linkAlertToCase = (caseId: string, alertId: string) =>
  api.post(`/api/cases/${caseId}/link_alert/${alertId}`)

export const runDemo = (data: {
  scenario: string
  speed: number
  duration: number
  no_throttle?: boolean
  randomize_scores?: boolean
}) => api.post('/api/run_demo', data)

export const runSebiStoryline = () =>
  api.post('/api/demo/sebi_storyline')

export const downloadAlertPack = (alertId: string) =>
  api.post(`/api/alerts/${alertId}/download_pack`, null, {
    responseType: 'blob',
  })

export const verifyChain = (alertId: string) =>
  api.get(`/api/alerts/${alertId}/verify_chain`)
