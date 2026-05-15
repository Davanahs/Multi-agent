'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { motion } from 'framer-motion';
import { TrendingUp, Clock, Zap, CheckCircle } from 'lucide-react';

export default function AnalyticsPage() {
  const chartVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
          <p className="text-gray-400">Workflow performance and insights</p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          className="grid md:grid-cols-4 gap-4"
          initial="hidden"
          animate="visible"
          variants={{ staggerChildren: 0.1 }}
        >
          {[
            {
              icon: Zap,
              label: 'Total Executions',
              value: '1,234',
              change: '+12%',
            },
            {
              icon: CheckCircle,
              label: 'Success Rate',
              value: '98.2%',
              change: '+2.1%',
            },
            {
              icon: Clock,
              label: 'Avg Duration',
              value: '3.2s',
              change: '-0.4s',
            },
            {
              icon: TrendingUp,
              label: 'Throughput',
              value: '124/min',
              change: '+8%',
            },
          ].map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={index}
                variants={chartVariants}
                className="p-4 rounded-lg border border-purple-900/20 bg-slate-900/40 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className="w-5 h-5 text-cyan-400" />
                  <span className="text-xs text-emerald-400">{stat.change}</span>
                </div>
                <p className="text-gray-400 text-sm">{stat.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Coming Soon Message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="p-8 rounded-lg border border-purple-900/20 bg-slate-900/40 backdrop-blur-sm text-center"
        >
          <p className="text-gray-400">
            Advanced analytics charts coming soon. Connect your backend API to unlock real-time insights.
          </p>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
