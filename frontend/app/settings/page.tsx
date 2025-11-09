'use client'

import { motion } from 'framer-motion'
import { Settings as SettingsIcon, Bell, Shield, Palette, Database } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    notifications: true,
    autoRefresh: true,
    darkMode: true,
    apiKey: 'demo_key',
    refreshInterval: 5,
  })

  const handleSave = () => {
    toast.success('Settings saved successfully')
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-bold gradient-text mb-2">Settings</h1>
          <p className="text-gray-400">Configure your IntegrityPlay experience</p>
        </motion.div>

        {/* Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white">Notifications</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-medium">Enable Notifications</div>
                <div className="text-sm text-gray-400">Receive alerts for new detections</div>
              </div>
              <button
                onClick={() => setSettings({ ...settings, notifications: !settings.notifications })}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.notifications ? 'bg-primary-500' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.notifications ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-medium">Auto Refresh</div>
                <div className="text-sm text-gray-400">Automatically refresh dashboard data</div>
              </div>
              <button
                onClick={() => setSettings({ ...settings, autoRefresh: !settings.autoRefresh })}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.autoRefresh ? 'bg-primary-500' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.autoRefresh ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Appearance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Palette className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-bold text-white">Appearance</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-medium">Dark Mode</div>
                <div className="text-sm text-gray-400">Use dark theme (recommended)</div>
              </div>
              <button
                onClick={() => setSettings({ ...settings, darkMode: !settings.darkMode })}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.darkMode ? 'bg-primary-500' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.darkMode ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div>
              <label className="block text-white font-medium mb-2">
                Refresh Interval: {settings.refreshInterval}s
              </label>
              <input
                type="range"
                min="1"
                max="30"
                value={settings.refreshInterval}
                onChange={(e) => setSettings({ ...settings, refreshInterval: Number(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>
        </motion.div>

        {/* API Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-6 h-6 text-green-400" />
            <h2 className="text-xl font-bold text-white">API Configuration</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">API Key</label>
              <input
                type="password"
                value={settings.apiKey}
                onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>
        </motion.div>

        {/* System Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-6 h-6 text-cyan-400" />
            <h2 className="text-xl font-bold text-white">System Information</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-light p-4 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">Version</div>
              <div className="text-white font-mono">2.0.0</div>
            </div>
            <div className="glass-light p-4 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">API Status</div>
              <div className="text-green-400 font-medium">Connected</div>
            </div>
            <div className="glass-light p-4 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">WebSocket</div>
              <div className="text-green-400 font-medium">Active</div>
            </div>
            <div className="glass-light p-4 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">Theme</div>
              <div className="text-white">Dark Purple/Blue</div>
            </div>
          </div>
        </motion.div>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <button
            onClick={handleSave}
            className="w-full px-6 py-3 rounded-lg bg-gradient-purple text-white hover:opacity-90 transition-opacity font-semibold"
          >
            Save Settings
          </button>
        </motion.div>
      </div>
    </div>
  )
}
