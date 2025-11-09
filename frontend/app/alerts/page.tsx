'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { Search, Filter, Download, AlertTriangle } from 'lucide-react'
import { getAlerts } from '@/lib/api'
import { getDemoAlerts } from '@/lib/mockData'
import Link from 'next/link'
import clsx from 'clsx'

export default function AlertsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [minScore, setMinScore] = useState<number>()
  const [anchored, setAnchored] = useState<boolean>()

  const { data, isLoading, error } = useQuery({
    queryKey: ['alerts', { page, minScore, anchored }],
    queryFn: () => getAlerts({ page, page_size: 20, min_score: minScore, anchored }).then(res => res.data),
    retry: 1,
  })

  // Use mock data if backend is unavailable
  const displayData = error ? getDemoAlerts(page, 20) : data

  const filteredAlerts = displayData?.items?.filter((alert: any) => {
    if (search && !alert.alert_id.toLowerCase().includes(search.toLowerCase()) &&
        !alert.rule_name.toLowerCase().includes(search.toLowerCase())) {
      return false
    }
    if (minScore !== undefined && alert.score < minScore) {
      return false
    }
    if (anchored !== undefined && alert.anchored !== anchored) {
      return false
    }
    return true
  })

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-bold gradient-text mb-2">Alert Management</h1>
          <p className="text-gray-400">Monitor and investigate suspicious activities</p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-xl p-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search alerts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 transition-colors"
                />
              </div>
            </div>
            <div>
              <select
                value={minScore || ''}
                onChange={(e) => setMinScore(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-4 py-2 bg-white/5 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 transition-colors"
              >
                <option value="">All Scores</option>
                <option value="0.5">Score ≥ 0.5</option>
                <option value="0.7">Score ≥ 0.7</option>
                <option value="0.9">Score ≥ 0.9</option>
              </select>
            </div>
            <div>
              <select
                value={anchored === undefined ? '' : anchored ? 'true' : 'false'}
                onChange={(e) => setAnchored(e.target.value === '' ? undefined : e.target.value === 'true')}
                className="w-full px-4 py-2 bg-white/5 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 transition-colors"
              >
                <option value="">All Status</option>
                <option value="true">Anchored</option>
                <option value="false">Not Anchored</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Alerts Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="spinner" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredAlerts?.map((alert: any, i: number) => (
              <motion.div
                key={alert.alert_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  href={`/alerts/${alert.alert_id}`}
                  className="block glass rounded-xl p-6 card-hover"
                >
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <AlertTriangle className={clsx(
                          'w-5 h-5',
                          alert.severity === 'high' ? 'text-red-400' :
                          alert.severity === 'medium' ? 'text-yellow-400' :
                          'text-blue-400'
                        )} />
                        <span className="font-mono text-sm text-gray-400">{alert.alert_id}</span>
                        {alert.anchored && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">
                            Anchored
                          </span>
                        )}
                        <span className={clsx(
                          'px-2 py-0.5 rounded text-xs font-medium',
                          alert.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                          alert.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-blue-500/20 text-blue-400'
                        )}>
                          {alert.severity}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2 capitalize">
                        {alert.rule_name.replace(/_/g, ' ')}
                      </h3>
                      <p className="text-sm text-gray-400">
                        Detected at {new Date(alert.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-bold text-white mb-2">
                        {alert.score.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-400 mb-3">Risk Score</div>
                      <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={clsx(
                            'h-full transition-all',
                            alert.score >= 0.8 ? 'bg-red-500' :
                            alert.score >= 0.5 ? 'bg-yellow-500' :
                            'bg-blue-500'
                          )}
                          style={{ width: `${alert.score * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {displayData && displayData.total > 20 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-2"
          >
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg bg-white/5 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-gray-400">
              Page {page} of {Math.ceil(displayData.total / 20)}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(displayData.total / 20)}
              className="px-4 py-2 rounded-lg bg-white/5 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
            >
              Next
            </button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
