'use client'

import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { Play, Zap, TrendingUp, Activity } from 'lucide-react'
import { runDemo, runSebiStoryline } from '@/lib/api'
import { addDemoAlert } from '@/lib/mockData'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

const scenarios = [
  { id: 'layering', name: 'Layering Attack', description: 'Simulates layering manipulation pattern', icon: Activity },
  { id: 'wash_trade', name: 'Wash Trading', description: 'Simulates wash trading between accounts', icon: TrendingUp },
  { id: 'quote_stuffing', name: 'Quote Stuffing', description: 'High-frequency quote manipulation', icon: Zap },
  { id: 'benign', name: 'Benign Trading', description: 'Normal trading activity baseline', icon: Activity },
]

export default function DemoPage() {
  const [selectedScenario, setSelectedScenario] = useState('layering')
  const [speed, setSpeed] = useState(5)
  const [duration, setDuration] = useState(10)
  const [isRunning, setIsRunning] = useState(false)
  const router = useRouter()

  const demoMutation = useMutation({
    mutationFn: runDemo,
    onSuccess: (response) => {
      toast.success(`Demo started! Task ID: ${response.data.task_id}`)
      setTimeout(() => router.push('/dashboard'), 2000)
    },
    onError: () => {
      // Fallback to demo mode
      handleDemoMode()
    },
  })

  const sebiMutation = useMutation({
    mutationFn: runSebiStoryline,
    onSuccess: (response) => {
      toast.success(`SEBI storyline started! Task ID: ${response.data.task_id}`)
      setTimeout(() => router.push('/dashboard'), 2000)
    },
    onError: () => {
      // Fallback to demo mode
      handleDemoMode()
    },
  })

  const handleDemoMode = () => {
    setIsRunning(true)
    toast.success('Running in Demo Mode - Generating mock alerts', { icon: '🎮' })
    
    // Generate alerts based on duration
    const alertCount = Math.floor(duration * speed / 10)
    let generated = 0
    
    const interval = setInterval(() => {
      if (generated >= alertCount) {
        clearInterval(interval)
        setIsRunning(false)
        toast.success(`Demo complete! Generated ${alertCount} alerts`, { icon: '✅' })
        setTimeout(() => router.push('/dashboard'), 1000)
        return
      }
      
      addDemoAlert()
      generated++
      
      if (generated % 5 === 0) {
        toast.success(`Generated ${generated} alerts...`, { icon: '📊' })
      }
    }, 1000)
  }

  const handleRunDemo = () => {
    demoMutation.mutate({
      scenario: selectedScenario,
      speed,
      duration,
      no_throttle: true,
      randomize_scores: false,
    })
  }

  const handleSebiDemo = () => {
    sebiMutation.mutate()
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-bold gradient-text mb-2">Demo Playground</h1>
          <p className="text-gray-400">Test market manipulation scenarios</p>
          
          {/* Demo Mode Banner */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30"
          >
            <div className="flex items-start gap-3">
              <div className="text-yellow-400 text-2xl">🎮</div>
              <div>
                <h3 className="text-yellow-400 font-semibold mb-1">Demo Mode Active</h3>
                <p className="text-sm text-gray-300">
                  Backend not detected. Demos will generate mock alerts and redirect to dashboard.
                  For full functionality, start the backend server.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-xl p-6"
        >
          <h2 className="text-xl font-bold text-white mb-4">Quick Start</h2>
          <button
            onClick={handleSebiDemo}
            disabled={sebiMutation.isPending || isRunning}
            className="w-full px-6 py-4 rounded-lg bg-gradient-purple text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-3"
          >
            <Play className="w-5 h-5" />
            <span className="font-semibold">
              {sebiMutation.isPending || isRunning ? 'Running Demo...' : 'Run SEBI Storyline Demo'}
            </span>
          </button>
          <p className="text-sm text-gray-400 mt-2 text-center">
            Runs a comprehensive demo with multiple scenarios (works in demo mode!)
          </p>
        </motion.div>

        {/* Custom Demo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-xl p-6"
        >
          <h2 className="text-xl font-bold text-white mb-6">Custom Scenario</h2>
          
          {/* Scenario Selection */}
          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-3">Select Scenario</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scenarios.map((scenario) => (
                <button
                  key={scenario.id}
                  onClick={() => setSelectedScenario(scenario.id)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedScenario === scenario.id
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-gray-700 bg-white/5 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <scenario.icon className={`w-6 h-6 ${
                      selectedScenario === scenario.id ? 'text-primary-400' : 'text-gray-400'
                    }`} />
                    <div>
                      <h3 className="font-semibold text-white mb-1">{scenario.name}</h3>
                      <p className="text-sm text-gray-400">{scenario.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Speed (events/sec): {speed}
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Duration (seconds): {duration}
              </label>
              <input
                type="range"
                min="5"
                max="30"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {/* Run Button */}
          <button
            onClick={handleRunDemo}
            disabled={demoMutation.isPending || isRunning}
            className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5" />
            <span className="font-semibold">
              {demoMutation.isPending || isRunning ? 'Running Demo...' : 'Run Custom Demo'}
            </span>
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            {isRunning ? 'Generating alerts in demo mode...' : 'Works without backend in demo mode'}
          </p>
        </motion.div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: 'Real-time Detection',
              description: 'Alerts are generated in real-time as patterns are detected',
              icon: Zap,
              color: 'cyan',
            },
            {
              title: 'AI Analysis',
              description: 'Machine learning models analyze trading patterns',
              icon: Activity,
              color: 'purple',
            },
            {
              title: 'Evidence Chain',
              description: 'All evidence is cryptographically verified',
              icon: TrendingUp,
              color: 'blue',
            },
          ].map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="glass-light rounded-lg p-6"
            >
              <card.icon className={`w-8 h-8 mb-3 text-${card.color}-400`} />
              <h3 className="text-lg font-semibold text-white mb-2">{card.title}</h3>
              <p className="text-sm text-gray-400">{card.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
