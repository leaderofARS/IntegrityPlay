'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { Plus, Briefcase, User, Calendar } from 'lucide-react'
import { getCases, createCase } from '@/lib/api'
import { getDemoCases, addDemoCase } from '@/lib/mockData'
import Link from 'next/link'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function CasesPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newCase, setNewCase] = useState({ title: '', priority: 'medium', assignee: '' })
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['cases'],
    queryFn: () => getCases().then(res => res.data),
    retry: 1,
  })

  // Use mock data if backend is unavailable
  const displayData = error ? getDemoCases() : data

  const createMutation = useMutation({
    mutationFn: createCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      setShowCreateModal(false)
      setNewCase({ title: '', priority: 'medium', assignee: '' })
      toast.success('Case created successfully')
    },
    onError: () => {
      // Try mock data in demo mode
      if (error) {
        addDemoCase(newCase.title, newCase.priority, newCase.assignee)
        queryClient.invalidateQueries({ queryKey: ['cases'] })
        setShowCreateModal(false)
        setNewCase({ title: '', priority: 'medium', assignee: '' })
        toast.success('Case created successfully (Demo Mode)')
      } else {
        toast.error('Failed to create case')
      }
    },
  })

  const handleCreate = () => {
    if (!newCase.title) {
      toast.error('Title is required')
      return
    }
    if (error) {
      // Demo mode - create directly
      addDemoCase(newCase.title, newCase.priority, newCase.assignee)
      setShowCreateModal(false)
      setNewCase({ title: '', priority: 'medium', assignee: '' })
      toast.success('Case created successfully (Demo Mode)')
    } else {
      createMutation.mutate(newCase)
    }
  }

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
            <h1 className="text-4xl font-bold gradient-text mb-2">Case Management</h1>
            <p className="text-gray-400">Track and manage investigation cases</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-lg bg-gradient-purple text-white hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Case
          </button>
        </motion.div>

        {/* Cases Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="spinner" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayData?.items?.map((caseItem: any, i: number) => (
              <motion.div
                key={caseItem.case_id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  href={`/cases/${caseItem.case_id}`}
                  className="block glass rounded-xl p-6 card-hover"
                >
                  <div className="flex items-start justify-between mb-4">
                    <Briefcase className="w-8 h-8 text-primary-400" />
                    <span className={clsx(
                      'px-2 py-1 rounded text-xs font-medium',
                      caseItem.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                      caseItem.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-blue-500/20 text-blue-400'
                    )}>
                      {caseItem.priority}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{caseItem.title}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-400">
                      <User className="w-4 h-4" />
                      {caseItem.assignee || 'Unassigned'}
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <Calendar className="w-4 h-4" />
                      {new Date(caseItem.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <span className={clsx(
                      'text-xs font-medium',
                      caseItem.status === 'open' ? 'text-green-400' :
                      caseItem.status === 'in_progress' ? 'text-yellow-400' :
                      'text-gray-400'
                    )}>
                      {caseItem.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass rounded-xl p-6 max-w-md w-full"
            >
              <h2 className="text-2xl font-bold text-white mb-4">Create New Case</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Title</label>
                  <input
                    type="text"
                    value={newCase.title}
                    onChange={(e) => setNewCase({ ...newCase, title: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                    placeholder="Enter case title"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Priority</label>
                  <select
                    value={newCase.priority}
                    onChange={(e) => setNewCase({ ...newCase, priority: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Assignee (optional)</label>
                  <input
                    type="text"
                    value={newCase.assignee}
                    onChange={(e) => setNewCase({ ...newCase, assignee: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                    placeholder="Enter assignee name"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  className="flex-1 px-4 py-2 rounded-lg bg-gradient-purple text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Case'}
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg bg-white/5 text-white hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}
