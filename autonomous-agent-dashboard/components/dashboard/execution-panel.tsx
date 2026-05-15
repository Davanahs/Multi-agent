'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkflowStore } from '@/lib/store/workflow-store';
import { useWorkflowExecution } from '@/hooks/use-workflow-execution';
import { useWorkflowStream } from '@/hooks/use-workflow-stream';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle,
  AlertCircle,
  Clock,
  PlayCircle,
  Zap,
} from 'lucide-react';
import { createDemoExecution, simulateDemoStream } from '@/lib/demo-data';

export function ExecutionPanel() {
  const currentExecution = useWorkflowStore((state) => state.currentExecution);
  const events = useWorkflowStore((state) => state.currentExecution?.events) || [];
  const isStreaming = useWorkflowStore((state) => state.isStreaming);
  const setCurrentExecution = useWorkflowStore((state) => state.setCurrentExecution);
  const addExecutionEvent = useWorkflowStore((state) => state.addExecutionEvent);
  const updateTaskStatus = useWorkflowStore((state) => state.updateTaskStatus);
  const updateExecutionResult = useWorkflowStore((state) => state.updateExecutionResult);
  const setIsStreaming = useWorkflowStore((state) => state.setIsStreaming);

  const { startExecution } = useWorkflowExecution();
  const { startStream } = useWorkflowStream(currentExecution?.id || null);
  const [useDemoMode] = useState(true); // Set to false when backend API is ready

  const handleStartWorkflow = async () => {
    if (useDemoMode) {
      // Demo mode: simulate workflow execution
      const demoExecution = createDemoExecution();
      setCurrentExecution(demoExecution);
      setIsStreaming(true);

      // Simulate SSE stream
      simulateDemoStream(
        (event) => {
          addExecutionEvent(event);
          if (event.type === 'task_start') {
            updateTaskStatus(event.taskId, 'running');
          } else if (event.type === 'task_complete') {
            updateTaskStatus(event.taskId, 'completed');
          } else if (event.type === 'task_error') {
            updateTaskStatus(event.taskId, 'failed');
          }
        },
        (result) => {
          updateExecutionResult(result);
          setIsStreaming(false);
        },
        (error) => {
          console.error('[v0] Demo stream error:', error);
          setIsStreaming(false);
        }
      );
    } else {
      // Real API mode
      const execution = await startExecution('sample-workflow-1');
      if (execution) {
        startStream();
      }
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'task_start':
        return <Clock className="w-4 h-4 text-cyan-400" />;
      case 'task_complete':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'task_error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'workflow_complete':
        return <Zap className="w-4 h-4 text-purple-400" />;
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
          <h3 className="text-sm font-semibold text-white">Execution Panel</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">demo mode</span>
            <div 
              className="w-2 h-2 rounded-full bg-emerald-400"
              style={{ boxShadow: '0 0 8px rgba(16,185,129,0.8)' }}
            />
          </div>
        </div>
        <p className="text-xs text-gray-400">Real-time event streaming log</p>
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

      {/* Footer with action */}
      <div 
        className="px-4 py-3 border-t flex items-center justify-between"
        style={{
          backgroundColor: '#020208',
          borderColor: 'rgba(124,58,237,0.15)',
        }}
      >
        <span className="text-xs text-gray-400">
          {!currentExecution ? 'Ready to start' : isStreaming ? 'Running...' : 'Complete'}
        </span>
        {!currentExecution && (
          <Button
            onClick={handleStartWorkflow}
            className="text-white text-xs h-8 px-3"
            style={{
              backgroundColor: '#7c3aed',
              boxShadow: '0 0 15px rgba(124,58,237,0.5)',
            }}
          >
            Start
          </Button>
        )}
      </div>
    </motion.div>
  );
}
