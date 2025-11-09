'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

interface HeatmapCell {
  hour: number
  day: string
  value: number
}

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const hours = Array.from({ length: 24 }, (_, i) => i)

export function ThreatHeatmap() {
  const [data, setData] = useState<HeatmapCell[]>([])

  useEffect(() => {
    const newData: HeatmapCell[] = []
    days.forEach(day => {
      hours.forEach(hour => {
        newData.push({
          day,
          hour,
          value: Math.random() * 100,
        })
      })
    })
    setData(newData)

    const interval = setInterval(() => {
      setData(prev => prev.map(cell => ({
        ...cell,
        value: Math.max(0, Math.min(100, cell.value + (Math.random() - 0.5) * 20)),
      })))
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const getColor = (value: number) => {
    if (value >= 80) return 'bg-red-500'
    if (value >= 60) return 'bg-orange-500'
    if (value >= 40) return 'bg-yellow-500'
    if (value >= 20) return 'bg-blue-500'
    return 'bg-gray-700'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass rounded-xl p-6"
    >
      <h3 className="text-xl font-bold text-white mb-6">Threat Activity Heatmap</h3>
      
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="flex gap-1 mb-2">
            <div className="w-12" />
            {hours.map(hour => (
              <div key={hour} className="w-6 text-xs text-gray-400 text-center">
                {hour % 6 === 0 ? hour : ''}
              </div>
            ))}
          </div>
          
          {days.map((day, dayIndex) => (
            <div key={day} className="flex gap-1 mb-1">
              <div className="w-12 text-xs text-gray-400 flex items-center">
                {day}
              </div>
              {hours.map(hour => {
                const cell = data.find(d => d.day === day && d.hour === hour)
                return (
                  <motion.div
                    key={`${day}-${hour}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: dayIndex * 0.05 + hour * 0.001 }}
                    className={`w-6 h-6 rounded ${getColor(cell?.value || 0)} transition-colors duration-500`}
                    title={`${day} ${hour}:00 - ${cell?.value.toFixed(0)}%`}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
        <span>Less Activity</span>
        <div className="flex gap-1">
          <div className="w-4 h-4 rounded bg-gray-700" />
          <div className="w-4 h-4 rounded bg-blue-500" />
          <div className="w-4 h-4 rounded bg-yellow-500" />
          <div className="w-4 h-4 rounded bg-orange-500" />
          <div className="w-4 h-4 rounded bg-red-500" />
        </div>
        <span>More Activity</span>
      </div>
    </motion.div>
  )
}
