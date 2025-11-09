'use client'

import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import clsx from 'clsx'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  color?: 'purple' | 'blue' | 'cyan' | 'pink' | 'green' | 'red'
  delay?: number
}

const colorClasses = {
  purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
  blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
  cyan: 'from-cyan-500/20 to-cyan-600/20 border-cyan-500/30',
  pink: 'from-pink-500/20 to-pink-600/20 border-pink-500/30',
  green: 'from-green-500/20 to-green-600/20 border-green-500/30',
  red: 'from-red-500/20 to-red-600/20 border-red-500/30',
}

const iconColorClasses = {
  purple: 'text-purple-400',
  blue: 'text-blue-400',
  cyan: 'text-cyan-400',
  pink: 'text-pink-400',
  green: 'text-green-400',
  red: 'text-red-400',
}

export function StatCard({ title, value, icon: Icon, trend, color = 'purple', delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={clsx(
        'relative overflow-hidden rounded-xl border backdrop-blur-sm p-6 card-hover',
        'bg-gradient-to-br',
        colorClasses[color]
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-white mb-2">{value}</p>
          {trend && (
            <div className={clsx(
              'text-xs font-medium',
              trend.isPositive ? 'text-green-400' : 'text-red-400'
            )}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        <div className={clsx(
          'p-3 rounded-lg bg-white/5',
          iconColorClasses[color]
        )}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </motion.div>
  )
}
