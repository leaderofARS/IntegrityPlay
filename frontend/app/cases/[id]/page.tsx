'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useParams } from 'next/navigation'
import { ArrowLeft, User, MessageSquare, Link as LinkIcon } from 'lucide-react'
import { getCase, addCaseComment, assignCase } from '@/lib/api'
import Link from 'next/link'
import { useState } from 'react'
import toast from 'react-hot-toast'

export default function CaseDetailPage() {
  const params = useParams()
  const caseId = params.id as string
  const [comment, setComment] = useState({ author: '', text: '' })
  const [assignee, setAssignee] = useState('')
  const queryClient = useQueryClient()

  const { data: caseData, isLoading } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => getCase(caseId).then(res => res.data),
  })

  const commentMutation = useMutation({
    mutationFn: () => addCaseComment(caseId, comment.author, comment.text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId] })
      setComment({ author: '', text: '' })
      toast.success('Comment added')
    },
  })

  const assignMutation = useMutation({
    mutationFn: () => assignCase(caseId, assignee),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId] })
      setAssignee('')
      toast.success('Case assigned')
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    )
  }

  if (!caseData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Case Not Found</h2>
          <Link href="/cases" className="text-primary-400 hover:text-primary-300">
            ← Back to Cases
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link
            href="/cases"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Cases
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">{caseData.title}</h1>
          <p className="text-gray-400">{caseData.case_id}</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-xl p-6"
            >
              <h2 className="text-xl font-bold text-white mb-4">Case Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-light p-4 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">Status</div>
                  <div className="text-white font-medium capitalize">{caseData.status.replace('_', ' ')}</div>
                </div>
                <div className="glass-light p-4 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">Priority</div>
                  <div className="text-white font-medium capitalize">{caseData.priority}</div>
                </div>
                <div className="glass-light p-4 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">Created</div>
                  <div className="text-white">{new Date(caseData.created_at).toLocaleDateString()}</div>
                </div>
                <div className="glass-light p-4 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">Updated</div>
                  <div className="text-white">{new Date(caseData.updated_at).toLocaleDateString()}</div>
                </div>
              </div>
            </motion.div>

            {/* Linked Alerts */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass rounded-xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <LinkIcon className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-bold text-white">Linked Alerts</h2>
              </div>
              {caseData.links?.length > 0 ? (
                <div className="space-y-2">
                  {caseData.links.map((link: any) => (
                    <Link
                      key={link.alert_id}
                      href={`/alerts/${link.alert_id}`}
                      className="block p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <span className="font-mono text-sm text-primary-400">{link.alert_id}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">No alerts linked yet</p>
              )}
            </motion.div>

            {/* Comments */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass rounded-xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <MessageSquare className="w-6 h-6 text-purple-400" />
                <h2 className="text-xl font-bold text-white">Comments</h2>
              </div>
              <div className="space-y-4 mb-6">
                {caseData.comments?.map((c: any, i: number) => (
                  <div key={i} className="glass-light p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-white">{c.author}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(c.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300">{c.text}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Your name"
                  value={comment.author}
                  onChange={(e) => setComment({ ...comment, author: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                />
                <textarea
                  placeholder="Add a comment..."
                  value={comment.text}
                  onChange={(e) => setComment({ ...comment, text: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-white/5 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500 resize-none"
                />
                <button
                  onClick={() => commentMutation.mutate()}
                  disabled={!comment.author || !comment.text || commentMutation.isPending}
                  className="w-full px-4 py-2 rounded-lg bg-gradient-purple text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {commentMutation.isPending ? 'Adding...' : 'Add Comment'}
                </button>
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Assignee */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <User className="w-6 h-6 text-green-400" />
                <h2 className="text-lg font-bold text-white">Assignee</h2>
              </div>
              <div className="mb-4">
                <div className="text-sm text-gray-400 mb-1">Current</div>
                <div className="text-white font-medium">{caseData.assignee || 'Unassigned'}</div>
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="New assignee"
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                />
                <button
                  onClick={() => assignMutation.mutate()}
                  disabled={!assignee || assignMutation.isPending}
                  className="w-full px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                >
                  {assignMutation.isPending ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
