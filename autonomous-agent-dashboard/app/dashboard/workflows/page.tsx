'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { motion } from 'framer-motion';
import { useWorkflowStore } from '@/lib/store/workflow-store';
import { Play, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function WorkflowsPage() {
  const executionHistory = useWorkflowStore((state) => state.executionHistory);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-emerald-400';
      case 'failed':
        return 'text-red-400';
      case 'running':
        return 'text-cyan-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4" />;
      case 'running':
        return <Clock className="w-4 h-4 animate-spin" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Workflows</h1>
            <p className="text-gray-400">Manage and monitor your AI workflows</p>
          </div>
          <Button className="bg-gradient-to-r from-purple-600 to-cyan-500 text-white">
            <Play className="w-4 h-4 mr-2" />
            New Workflow
          </Button>
        </motion.div>

        {/* Workflows List */}
        <motion.div
          className="rounded-lg border border-purple-900/20 bg-slate-900/40 backdrop-blur-sm overflow-hidden"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {executionHistory.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-gray-500 mb-4">
                <Clock className="w-12 h-12 mx-auto opacity-50" />
              </div>
              <p className="text-gray-400">No workflows yet</p>
              <p className="text-gray-600 text-sm mt-1">
                Start a new workflow from the dashboard
              </p>
            </div>
          ) : (
            <div className="divide-y divide-purple-900/20">
              {executionHistory.map((execution, index) => (
                <motion.div
                  key={execution.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 hover:bg-slate-800/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div
                          className={`${getStatusColor(
                            execution.status
                          )} flex-shrink-0`}
                        >
                          {getStatusIcon(execution.status)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-white truncate">
                            {execution.name}
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {Object.keys(execution.tasks).length} tasks •{' '}
                            {new Date(execution.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 ml-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium capitalize ${
                          execution.status === 'completed'
                            ? 'bg-emerald-900/30 text-emerald-400'
                            : execution.status === 'failed'
                            ? 'bg-red-900/30 text-red-400'
                            : execution.status === 'running'
                            ? 'bg-cyan-900/30 text-cyan-400'
                            : 'bg-gray-900/30 text-gray-400'
                        }`}
                      >
                        {execution.status}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Sample Workflows */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xl font-semibold text-white mb-4">
            Available Workflows
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                id: 'sample-1',
                name: 'Document Analysis',
                description: 'Extract, analyze, and summarize documents',
              },
              {
                id: 'sample-2',
                name: 'Data Processing Pipeline',
                description: 'Clean, transform, and enrich data',
              },
              {
                id: 'sample-3',
                name: 'Content Moderation',
                description: 'Review and moderate user-generated content',
              },
              {
                id: 'sample-4',
                name: 'Report Generation',
                description: 'Generate automated business reports',
              },
            ].map((workflow) => (
              <motion.div
                key={workflow.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-lg border border-purple-900/20 bg-slate-900/40 backdrop-blur-sm hover:border-purple-500/40 transition-all cursor-pointer group"
              >
                <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors">
                  {workflow.name}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  {workflow.description}
                </p>
                <Button
                  variant="outline"
                  className="mt-3 w-full border-purple-500/30 text-gray-300 hover:border-purple-400/50 text-xs"
                >
                  <Play className="w-3 h-3 mr-1" />
                  Start
                </Button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
