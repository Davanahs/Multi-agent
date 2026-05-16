'use client';

import { motion } from 'framer-motion';
import { CheckCircle, Circle, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AgentInstance {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'error';
  icon: React.ReactNode;
  color: string;
}

const agents: AgentInstance[] = [
  {
    id: '1',
    name: 'Brainy-Bot v2',
    status: 'active',
    icon: '🧠',
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: '2',
    name: 'Data-Miner-X',
    status: 'idle',
    icon: '⛏️',
    color: 'from-cyan-500 to-blue-500',
  },
  {
    id: '3',
    name: 'Report-Gen',
    status: 'active',
    icon: '📄',
    color: 'from-emerald-500 to-teal-500',
  },
];

export function AgentInstances() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Active Agent Instances</h2>
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-gray-200"
        >
          <Edit2 className="w-4 h-4 mr-2" />
          Edit
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {agents.map((agent, index) => (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
            className="p-4 rounded-lg border backdrop-blur-sm"
            style={{
              backgroundColor: '#080810',
              borderColor: 'rgba(124,58,237,0.4)',
              boxShadow: '0 0 20px rgba(124,58,237,0.4), inset 0 0 10px rgba(124,58,237,0.2)',
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="text-3xl">{agent.icon}</div>
              <div
                className={`w-3 h-3 rounded-full ${
                  agent.status === 'active'
                    ? 'bg-emerald-400'
                    : agent.status === 'idle'
                    ? 'bg-gray-500'
                    : 'bg-red-400'
                }`}
                style={{
                  boxShadow:
                    agent.status === 'active'
                      ? '0 0 10px rgba(16,185,129,0.8)'
                      : agent.status === 'idle'
                      ? '0 0 6px rgba(107,114,128,0.6)'
                      : '0 0 10px rgba(239,68,68,0.8)',
                }}
              />
            </div>

            <h3 className="font-semibold text-white text-sm mb-1">{agent.name}</h3>
            <p className="text-xs text-gray-400 capitalize mb-3">{agent.status}</p>

            <div className="w-full h-1 rounded-full bg-gray-700/30 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-600 to-cyan-400"
                initial={{ width: '0%' }}
                animate={{ width: agent.status === 'active' ? '100%' : '40%' }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  boxShadow: '0 0 10px rgba(124,58,237,0.5)',
                }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
