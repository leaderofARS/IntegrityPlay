'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { motion } from 'framer-motion'

interface DataPoint {
  time: string
  alerts: number
  events: number
  score: number
}

export function RealTimeChart() {
  const [data, setData] = useState<DataPoint[]>([])

  useEffect(() => {
    // Initialize with some data
    const initialData: DataPoint[] = []
    const now = Date.now()
    for (let i = 29; i >= 0; i--) {
      initialData.push({
        time: new Date(now - i * 2000).toLocaleTimeString(),
        alerts: Math.floor(Math.random() * 10),
        events: Math.floor(Math.random() * 100) + 50,
        score: Math.random() * 100,
      })
    }
    setData(initialData)

    // Update data every 2 seconds
    const interval = setInterval(() => {
      setData(prev => {
        const newData = [...prev.slice(1)]
        newData.push({
          time: new Date().toLocaleTimeString(),
          alerts: Math.floor(Math.random() * 10),
          events: Math.floor(Math.random() * 100) + 50,
          score: Math.random() * 100,
        })
        return newData
      })
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">Real-Time Activity</h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-gray-400">Live</span>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis 
            dataKey="time" 
            stroke="#94a3b8"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
          />
          <YAxis 
            stroke="#94a3b8"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #4338ca',
              borderRadius: '8px',
              color: '#fff',
            }}
          />
          <Legend 
            wrapperStyle={{ color: '#94a3b8' }}
          />
          <Line 
            type="monotone" 
            dataKey="events" 
            stroke="#06b6d4" 
            strokeWidth={2}
            dot={false}
            name="Events/sec"
          />
          <Line 
            type="monotone" 
            dataKey="alerts" 
            stroke="#ef4444" 
            strokeWidth={2}
            dot={false}
            name="Alerts"
          />
          <Line 
            type="monotone" 
            dataKey="score" 
            stroke="#a855f7" 
            strokeWidth={2}
            dot={false}
            name="Avg Score"
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
