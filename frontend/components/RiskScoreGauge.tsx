'use client'

import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'

export function RiskScoreGauge() {
  const [score, setScore] = useState(75)

  useEffect(() => {
    const interval = setInterval(() => {
      setScore(prev => {
        const change = (Math.random() - 0.5) * 10
        return Math.max(0, Math.min(100, prev + change))
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const data = [
    { value: score },
    { value: 100 - score },
  ]

  const getColor = (score: number) => {
    if (score >= 80) return '#ef4444'
    if (score >= 50) return '#f59e0b'
    return '#10b981'
  }

  const color = getColor(score)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 }}
      className="glass rounded-xl p-6"
    >
      <h3 className="text-xl font-bold text-white mb-4">System Risk Score</h3>
      
      <div className="relative">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              startAngle={180}
              endAngle={0}
              innerRadius={60}
              outerRadius={80}
              dataKey="value"
            >
              <Cell fill={color} />
              <Cell fill="#1e293b" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl font-bold text-white mb-1">
              {score.toFixed(0)}
            </div>
            <div className="text-sm text-gray-400">Risk Level</div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-green-400">Low</span>
        <span className="text-yellow-400">Medium</span>
        <span className="text-red-400">High</span>
      </div>
    </motion.div>
  )
}
