'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Shield, TrendingUp, Brain, Network, ArrowRight } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/dashboard')
    }, 3000)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-4xl"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="inline-block mb-8"
        >
          <Shield className="w-24 h-24 text-primary-500" />
        </motion.div>

        <h1 className="text-6xl font-bold mb-4 gradient-text">
          IntegrityPlay
        </h1>
        
        <p className="text-2xl text-gray-300 mb-12">
          AI-Powered Market Surveillance Platform
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {[
            { icon: Brain, label: 'AI Detection' },
            { icon: Network, label: 'Graph Analytics' },
            { icon: TrendingUp, label: 'Real-time' },
            { icon: Shield, label: 'Compliance' },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass p-6 rounded-xl"
            >
              <item.icon className="w-8 h-8 mx-auto mb-2 text-primary-400" />
              <p className="text-sm text-gray-300">{item.label}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          animate={{ x: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="flex items-center justify-center gap-2 text-primary-400"
        >
          <span>Redirecting to Dashboard</span>
          <ArrowRight className="w-5 h-5" />
        </motion.div>
      </motion.div>
    </div>
  )
}
