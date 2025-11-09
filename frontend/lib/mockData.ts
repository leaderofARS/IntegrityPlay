// Mock data service for demo mode when backend is not available

export interface MockAlert {
  alert_id: string
  rule_name: string
  score: number
  severity: 'high' | 'medium' | 'low'
  anchored: boolean
  created_at: string
  narrative?: string
  evidence_path?: string
}

export interface MockCase {
  case_id: string
  title: string
  status: 'open' | 'in_progress' | 'closed'
  priority: 'high' | 'medium' | 'low'
  assignee?: string
  created_at: string
  updated_at: string
}

const ruleNames = [
  'layering',
  'wash_trade',
  'quote_stuffing',
  'spoofing',
  'pump_and_dump',
  'front_running',
  'insider_trading',
]

const severities: ('high' | 'medium' | 'low')[] = ['high', 'medium', 'low']

function generateAlertId(): string {
  return `ALERT-${Math.random().toString(36).substr(2, 8).toUpperCase()}`
}

function generateCaseId(): string {
  return `CASE-${Math.random().toString(36).substr(2, 8).toUpperCase()}`
}

export function generateMockAlert(): MockAlert {
  const ruleName = ruleNames[Math.floor(Math.random() * ruleNames.length)]
  const score = Math.random()
  const severity = score >= 0.7 ? 'high' : score >= 0.4 ? 'medium' : 'low'
  
  return {
    alert_id: generateAlertId(),
    rule_name: ruleName,
    score: score,
    severity: severity,
    anchored: Math.random() > 0.5,
    created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    narrative: `Detected ${ruleName.replace(/_/g, ' ')} pattern with confidence ${(score * 100).toFixed(1)}%. Multiple suspicious transactions identified across related accounts.`,
    evidence_path: `/evidence/${generateAlertId()}.json`,
  }
}

export function generateMockAlerts(count: number): MockAlert[] {
  return Array.from({ length: count }, () => generateMockAlert())
}

export function generateMockCase(): MockCase {
  const statuses: ('open' | 'in_progress' | 'closed')[] = ['open', 'in_progress', 'closed']
  const priorities: ('high' | 'medium' | 'low')[] = ['high', 'medium', 'low']
  
  return {
    case_id: generateCaseId(),
    title: `Investigation: ${ruleNames[Math.floor(Math.random() * ruleNames.length)].replace(/_/g, ' ')}`,
    status: statuses[Math.floor(Math.random() * statuses.length)],
    priority: priorities[Math.floor(Math.random() * priorities.length)],
    assignee: Math.random() > 0.3 ? `Analyst ${Math.floor(Math.random() * 5) + 1}` : undefined,
    created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
  }
}

export function generateMockCases(count: number): MockCase[] {
  return Array.from({ length: count }, () => generateMockCase())
}

export const mockMetrics = {
  eps: Math.random() * 100 + 50,
  p50_ms: Math.random() * 50 + 10,
  p95_ms: Math.random() * 100 + 50,
  alerts_emitted: Math.floor(Math.random() * 500) + 100,
  rules: {
    layering: Math.floor(Math.random() * 50),
    wash_trade: Math.floor(Math.random() * 40),
    quote_stuffing: Math.floor(Math.random() * 30),
    spoofing: Math.floor(Math.random() * 25),
    pump_and_dump: Math.floor(Math.random() * 20),
  },
}

// Store for demo mode
let demoAlerts: MockAlert[] = []
let demoCases: MockCase[] = []

export function initializeDemoData() {
  demoAlerts = generateMockAlerts(50)
  demoCases = generateMockCases(20)
}

export function getDemoAlerts(page: number = 1, pageSize: number = 20) {
  if (demoAlerts.length === 0) initializeDemoData()
  
  const start = (page - 1) * pageSize
  const end = start + pageSize
  
  return {
    total: demoAlerts.length,
    items: demoAlerts.slice(start, end),
  }
}

export function getDemoAlert(alertId: string) {
  if (demoAlerts.length === 0) initializeDemoData()
  return demoAlerts.find(a => a.alert_id === alertId)
}

export function getDemoCases(page: number = 1, pageSize: number = 20) {
  if (demoCases.length === 0) initializeDemoData()
  
  const start = (page - 1) * pageSize
  const end = start + pageSize
  
  return {
    total: demoCases.length,
    items: demoCases.slice(start, end),
  }
}

export function getDemoCase(caseId: string) {
  if (demoCases.length === 0) initializeDemoData()
  return demoCases.find(c => c.case_id === caseId)
}

export function addDemoAlert() {
  const newAlert = generateMockAlert()
  demoAlerts.unshift(newAlert)
  return newAlert
}

export function addDemoCase(title: string, priority: string, assignee?: string) {
  const newCase: MockCase = {
    case_id: generateCaseId(),
    title,
    status: 'open',
    priority: priority as 'high' | 'medium' | 'low',
    assignee,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  demoCases.unshift(newCase)
  return newCase
}

// Initialize on load
if (typeof window !== 'undefined') {
  initializeDemoData()
}
