'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useWorkflowStore } from '@/lib/store/workflow-store';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
} from 'lucide-react';

export function ExecutionPanel() {
  const currentExecution = useWorkflowStore((state) => state.currentExecution);
  const events = useWorkflowStore((state) => state.currentExecution?.events) || [];
  const isStreaming = useWorkflowStore((state) => state.isStreaming);


  const getEventIcon = (type: string) => {
    switch (type) {
      case 'workflow_start':
        return <Zap className="w-4 h-4 text-purple-400" />;
      case 'task_start':
        return <Zap className="w-4 h-4 text-cyan-400 animate-spin" />;
      case 'task_complete':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'task_error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'workflow_complete':
        return <CheckCircle className="w-4 h-4 text-purple-400" />;
      case 'webhook':
        return <CheckCircle className="w-4 h-4 text-blue-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1 }}
      className="flex flex-col h-full rounded-lg border backdrop-blur-sm overflow-hidden"
      style={{
        backgroundColor: '#080810',
        borderColor: 'rgba(124,58,237,0.4)',
        boxShadow: '0 0 20px rgba(124,58,237,0.4), inset 0 0 10px rgba(124,58,237,0.2)',
      }}
    >
      {/* Header */}
      <div 
        className="px-4 py-3 border-b"
        style={{ borderColor: 'rgba(124,58,237,0.15)' }}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-white">Live Events</h3>
          <div className="flex items-center gap-2">
            {isStreaming && (
              <span className="text-xs text-emerald-400 animate-pulse">● streaming</span>
            )}
            {!isStreaming && currentExecution && (
              <span className="text-xs text-gray-400">idle</span>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-400">Real-time SSE event log</p>
      </div>

      {/* Events list */}
      <ScrollArea className="flex-1">
        <div className="py-3 px-4 space-y-2">
          {events.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-xs">No events yet</p>
            </div>
          ) : (
            <AnimatePresence>
              {events.map((event, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex gap-2 p-2 rounded text-xs"
                  style={{
                    backgroundColor: 'rgba(124,58,237,0.06)',
                  }}
                >
                  <div className="flex-shrink-0">
                    {getEventIcon(event.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-gray-300">
                      {event.taskLabel || 'Task'} ({event.type.replace(/_/g, ' ')})
                    </span>
                  </div>
                  <div 
                    className="flex-shrink-0 whitespace-nowrap"
                    style={{
                      color: '#06b6d4',
                    }}
                  >
                    {new Date(event.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>

      {/* Footer status */}
      <div 
        className="px-4 py-3 border-t"
        style={{
          backgroundColor: '#020208',
          borderColor: 'rgba(124,58,237,0.15)',
        }}
      >
        <span className="text-xs text-gray-400">
          {!currentExecution
            ? 'Enter a prompt below to start'
            : isStreaming
            ? 'Agents running…'
            : `Done — ${events.length} event${events.length !== 1 ? 's' : ''} captured`}
        </span>
      </div>
    </motion.div>
  );
}
