'use client';

import { motion } from 'framer-motion';
import { Zap, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useWorkflowStore } from '@/lib/store/workflow-store';
import { Button } from '@/components/ui/button';

export function WelcomeSection() {
  const metrics = useWorkflowStore((state) => state.metrics);
  const executionHistory = useWorkflowStore((state) => state.executionHistory);

  const stats = [
    {
      icon: Zap,
      label: 'Active Workflows',
      value: metrics.activeWorkflows,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-400/10',
    },
    {
      icon: CheckCircle,
      label: 'Completed',
      value: metrics.completedWorkflows,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-400/10',
    },
    {
      icon: AlertCircle,
      label: 'Failed',
      value: metrics.failedWorkflows,
      color: 'text-red-400',
      bgColor: 'bg-red-400/10',
    },
    {
      icon: Clock,
      label: 'Avg Time',
      value: `${Math.round(metrics.averageExecutionTime / 1000)}s`,
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-4"
    >
      {/* Greeting */}
      <div>
        <h1 
          className="text-3xl sm:text-4xl font-bold text-white mb-1"
          style={{
            textShadow: '0 0 30px rgba(167,139,250,0.6)',
          }}
        >
          Good Evening, Arjun
        </h1>
        <p className="text-gray-400 text-sm">
          Welcome to your AI Operations Hub
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              className="p-3 rounded-lg border backdrop-blur-sm transition-all"
              style={{
                backgroundColor: '#080810',
                borderColor: 'rgba(124,58,237,0.4)',
                boxShadow: '0 0 20px rgba(124,58,237,0.4), inset 0 0 10px rgba(124,58,237,0.2)',
              }}
            >
              <span className="text-gray-400 text-xs font-medium uppercase block mb-2">
                {stat.label}
              </span>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
            </motion.div>
          );
        })}
      </div>

    </motion.div>
  );
}
