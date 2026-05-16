'use client';

import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Clock, Zap } from 'lucide-react';
import { TaskStatus } from '@/lib/types/workflow';

interface DagNodeProps {
  data: {
    label: string;
    status: TaskStatus;
  };
}

const statusConfig: Record<
  TaskStatus,
  { 
    color: string
    bgColor: string
    icon: React.ReactNode
    glowColor: string
    shadowColor: string
  }
> = {
  pending: {
    color: 'text-gray-400',
    bgColor: '#080810',
    icon: <Clock className="w-4 h-4" />,
    glowColor: 'rgba(124,58,237,0.15)',
    shadowColor: 'rgba(124,58,237,0.1)',
  },
  running: {
    color: 'text-cyan-400',
    bgColor: '#080810',
    icon: <Zap className="w-4 h-4 animate-spin" />,
    glowColor: 'rgba(6,182,212,0.4)',
    shadowColor: 'rgba(6,182,212,0.25)',
  },
  completed: {
    color: 'text-emerald-400',
    bgColor: '#080810',
    icon: <CheckCircle className="w-4 h-4" />,
    glowColor: 'rgba(16,185,129,0.4)',
    shadowColor: 'rgba(16,185,129,0.2)',
  },
  failed: {
    color: 'text-red-400',
    bgColor: '#080810',
    icon: <AlertCircle className="w-4 h-4" />,
    glowColor: 'rgba(239,68,68,0.4)',
    shadowColor: 'rgba(239,68,68,0.2)',
  },
};

function DagNodeComponent({ data }: DagNodeProps) {
  const config = statusConfig[data.status];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="relative"
    >
      <Handle type="target" position={Position.Left} />

      <div
        className="w-56 px-4 py-3 rounded-lg border-2 text-center backdrop-blur-sm transition-all"
        style={{
          backgroundColor: config.bgColor,
          borderColor: config.glowColor,
          boxShadow: 
            data.status === 'running'
              ? `0 0 0 1px ${config.glowColor}, 0 0 20px ${config.shadowColor}, 0 0 60px ${config.shadowColor.replace('0.25', '0.1')}`
              : data.status === 'completed'
              ? `0 0 0 1px ${config.glowColor}, 0 0 20px ${config.shadowColor}, 0 0 50px ${config.shadowColor.replace('0.2', '0.08')}`
              : data.status === 'failed'
              ? `0 0 0 1px ${config.glowColor}, 0 0 20px ${config.shadowColor}, 0 0 50px ${config.shadowColor.replace('0.2', '0.08')}`
              : '0 0 0 1px rgba(124,58,237,0.15), 0 0 15px rgba(124,58,237,0.08)',
        }}
      >
        {/* Status indicator */}
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className={`${config.color}`}>{config.icon}</div>
        </div>

        {/* Label */}
        <div className="text-xs font-medium text-white mb-2 leading-snug line-clamp-3">
          {data.label || 'Pending Task...'}
        </div>

        {/* Status text */}
        <div className={`text-xs ${config.color} capitalize`}>
          {data.status}
        </div>

        {/* Pulse animation for running tasks */}
        {data.status === 'running' && (
          <motion.div
            className="absolute inset-0 rounded-lg border border-cyan-400/50"
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(34, 211, 238, 0.4)',
                '0 0 0 8px rgba(34, 211, 238, 0)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </div>

      <Handle type="source" position={Position.Right} />
    </motion.div>
  );
}

export const DagNode = memo(DagNodeComponent);
