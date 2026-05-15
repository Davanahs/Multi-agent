'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { motion } from 'framer-motion';
import { Bell, Lock, Palette, Code } from 'lucide-react';

export default function SettingsPage() {
  const settingsSections = [
    {
      icon: Bell,
      title: 'Notifications',
      description: 'Manage alert preferences and notifications',
    },
    {
      icon: Lock,
      title: 'Security',
      description: 'API keys, authentication, and access control',
    },
    {
      icon: Palette,
      title: 'Appearance',
      description: 'Theme and display preferences',
    },
    {
      icon: Code,
      title: 'API Configuration',
      description: 'Backend API endpoint and settings',
    },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400">Configure your workflow platform</p>
        </motion.div>

        {/* Settings Grid */}
        <motion.div
          className="grid gap-4"
          initial="hidden"
          animate="visible"
          variants={{ staggerChildren: 0.1 }}
        >
          {settingsSections.map((section, index) => {
            const Icon = section.icon;
            return (
              <motion.button
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-6 rounded-lg border border-purple-900/20 bg-slate-900/40 backdrop-blur-sm hover:border-purple-500/40 hover:bg-slate-900/60 transition-all text-left group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-purple-900/20 group-hover:bg-purple-900/30 transition-colors">
                      <Icon className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{section.title}</h3>
                      <p className="text-sm text-gray-400 mt-1">
                        {section.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-gray-600 group-hover:text-gray-400 transition-colors">
                    →
                  </div>
                </div>
              </motion.button>
            );
          })}
        </motion.div>

        {/* API Configuration Example */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="p-6 rounded-lg border border-purple-900/20 bg-slate-900/40 backdrop-blur-sm"
        >
          <h3 className="font-semibold text-white mb-4">API Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                API Base URL
              </label>
              <input
                type="text"
                defaultValue={process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080'}
                disabled
                className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-purple-900/20 text-gray-400 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Set via NEXT_PUBLIC_API_BASE environment variable
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Connection Status
              </label>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <span className="text-sm text-gray-400">
                  Demo mode enabled - Showing simulated workflow execution
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Connect your FastAPI backend to enable real workflow orchestration
              </p>
            </div>
          </div>
        </motion.div>

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="p-4 rounded-lg border border-cyan-500/30 bg-cyan-900/10 backdrop-blur-sm"
        >
          <p className="text-sm text-cyan-200">
            <strong>Note:</strong> Many settings are coming soon. The dashboard is currently in demo
            mode showing simulated workflow execution. Connect your FastAPI backend to enable
            real functionality.
          </p>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
