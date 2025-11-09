'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { 
  Activity, AlertTriangle, TrendingUp, Zap, 
  Brain, Network, Shield, Clock 
} from 'lucide-react'
import { StatCard } from '@/components/StatCard'
import { AIInsightCard } from '@/components/AIInsightCard'
import { RealTimeChart } from '@/components/RealTimeChart'
import { AlertDistributionChart } from '@/components/AlertDistributionChart'
import { RiskScoreGauge } from '@/components/RiskScoreGauge'
import { ThreatHeatmap } from '@/components/ThreatHeatmap'
import { getMetrics, getAlerts } from '@/lib/api'
import { mockMetrics, getDemoAlerts, addDemoAlert } from '@/lib/mockData'
import { useEffect, useState } from 'react'
import { realtimeClient } from '@/lib/websocket'
import toast from 'react-hot-toast'

export default function DashboardPage() {
  const [liveAlerts, setLiveAlerts] = useState(0)
  const [useMockData, setUseMockData] = useState(false)
  
  const { data: metrics, error: metricsError } = useQuery({
    queryKey: ['metrics'],
    queryFn: () => getMetrics().then(res => res.data),
    refetchInterval: 5000,
    retry: 1,
  })

  const { data: alertsData, error: alertsError } = useQuery({
    queryKey: ['alerts', { page: 1, page_size: 5 }],
    queryFn: () => getAlerts({ page: 1, page_size: 5 }).then(res => res.data),
    refetchInterval: 5000,
    retry: 1,
  })

  // Use mock data if backend is unavailable
  useEffect(() => {
    if (metricsError || alertsError) {
      setUseMockData(true)
    }
  }, [metricsError, alertsError])

  // Simulate live alerts in demo mode
  useEffect(() => {
    if (useMockData) {
      const interval = setInterval(() => {
        const newAlert = addDemoAlert()
        setLiveAlerts(prev => prev + 1)
        toast.success(`New alert: ${newAlert.alert_id}`, {
          icon: '🚨',
        })
      }, 10000) // New alert every 10 seconds

      return () => clearInterval(interval)
    }
  }, [useMockData])

  const displayMetrics = useMockData ? mockMetrics : metrics
  const displayAlerts = useMockData ? getDemoAlerts(1, 5) : alertsData

  useEffect(() => {
    realtimeClient.connect()
    const unsubscribe = realtimeClient.subscribe((data) => {
      if (data.type === 'alert') {
        setLiveAlerts(prev => prev + 1)
        toast.success(`New alert: ${data.alert_id}`, {
          icon: '🚨',
        })
      }
    })
    return () => {
      unsubscribe()
      realtimeClient.disconnect()
    }
  }, [])

  const aiInsights = [
    {
      type: 'prediction' as const,
      title: 'Pattern Detected',
      description: 'Unusual trading pattern identified in TECH sector',
      confidence: 87,
    },
    {
      type: 'anomaly' as const,
      title: 'Volume Spike',
      description: 'Trading volume 3x above normal baseline',
      confidence: 92,
    },
    {
      type: 'recommendation' as const,
      title: 'Investigation Priority',
      description: 'Review alerts from accounts A123, B456',
      confidence: 78,
    },
  ]

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-2">
              Command Center
            </h1>
            <p className="text-gray-400">Real-time market surveillance dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="glass px-4 py-2 rounded-lg flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-gray-300">System Active</span>
            </div>
            {liveAlerts > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="glass px-4 py-2 rounded-lg flex items-center gap-2 glow-purple"
              >
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-sm text-white font-semibold">{liveAlerts} New</span>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Events/Second"
            value={displayMetrics?.eps.toFixed(1) || '0.0'}
            icon={Zap}
            color="cyan"
            trend={{ value: 12, isPositive: true }}
            delay={0.1}
          />
          <StatCard
            title="Total Alerts"
            value={displayAlerts?.total || 0}
            icon={AlertTriangle}
            color="red"
            trend={{ value: 8, isPositive: false }}
            delay={0.2}
          />
          <StatCard
            title="Avg Latency"
            value={`${displayMetrics?.p50_ms.toFixed(0) || 0}ms`}
            icon={Clock}
            color="blue"
            trend={{ value: 5, isPositive: true }}
            delay={0.3}
          />
          <StatCard
            title="Detection Rate"
            value="94.2%"
            icon={Brain}
            color="purple"
            trend={{ value: 3, isPositive: true }}
            delay={0.4}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* AI Insights */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2 glass rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <Brain className="w-6 h-6 text-purple-400" />
              <h2 className="text-xl font-bold text-white">AI Insights</h2>
              <div className="ml-auto px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30">
                <span className="text-xs text-purple-400 font-medium">Powered by ML</span>
              </div>
            </div>
            <div className="space-y-4">
              {aiInsights.map((insight, i) => (
                <AIInsightCard key={i} insight={insight} delay={0.6 + i * 0.1} />
              ))}
            </div>
          </motion.div>

          {/* Rule Counters */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="glass rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-bold text-white">Detection Rules</h2>
            </div>
            <div className="space-y-3">
              {Object.entries(displayMetrics?.rules || {}).map(([rule, count], i) => (
                <motion.div
                  key={rule}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <span className="text-sm text-gray-300 capitalize">
                    {rule.replace(/_/g, ' ')}
                  </span>
                  <span className="text-lg font-bold text-white">{count}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RealTimeChart />
          <AlertDistributionChart />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <RiskScoreGauge />
          <div className="lg:col-span-2">
            <ThreatHeatmap />
          </div>
        </div>

        {/* Recent Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="glass rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Activity className="w-6 h-6 text-cyan-400" />
              <h2 className="text-xl font-bold text-white">Recent Alerts</h2>
            </div>
            <a
              href="/alerts"
              className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
            >
              View All →
            </a>
          </div>
          <div className="space-y-3">
            {displayAlerts?.items?.slice(0, 5).map((alert: any, i: number) => (
              <motion.a
                key={alert.alert_id}
                href={`/alerts/${alert.alert_id}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + i * 0.05 }}
                className="block p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all card-hover"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-mono text-gray-400">{alert.alert_id}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        alert.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                        alert.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-sm text-white capitalize">{alert.rule_name.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white mb-1">{alert.score.toFixed(1)}</div>
                    <div className="text-xs text-gray-400">Risk Score</div>
                  </div>
                </div>
              </motion.a>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
