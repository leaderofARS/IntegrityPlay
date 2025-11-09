'use client'

import { motion } from 'framer-motion'
import { Brain, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react'
import clsx from 'clsx'

interface AIInsight {
  type: 'prediction' | 'anomaly' | 'recommendation' | 'success'
  title: string
  description: string
  confidence?: number
}

interface AIInsightCardProps {
  insight: AIInsight
  delay?: number
}

const typeConfig = {
  prediction: {
    icon: Brain,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
  anomaly: {
    icon: AlertCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
  recommendation: {
    icon: TrendingUp,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  success: {
    icon: CheckCircle,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
  },
}

export function AIInsightCard({ insight, delay = 0 }: AIInsightCardProps) {
  const config = typeConfig[insight.type]
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className={clsx(
        'glass-light rounded-lg p-4 border',
        config.borderColor,
        'hover:scale-[1.02] transition-transform'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={clsx('p-2 rounded-lg', config.bgColor)}>
          <Icon className={clsx('w-5 h-5', config.color)} />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-white mb-1">{insight.title}</h4>
          <p className="text-xs text-gray-400 mb-2">{insight.description}</p>
          {insight.confidence !== undefined && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${insight.confidence}%` }}
                  transition={{ delay: delay + 0.2, duration: 0.8 }}
                  className={clsx('h-full', config.bgColor.replace('/10', ''))}
                />
              </div>
              <span className="text-xs text-gray-400">{insight.confidence}%</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
