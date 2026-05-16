'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { workflowClient } from '@/lib/api/workflow-client';
import { useWorkflowStore } from '@/lib/store/workflow-store';

export function ChatInput() {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const cleanupRef = useRef<(() => void) | null>(null);

  const setCurrentExecution = useWorkflowStore((s) => s.setCurrentExecution);
  const addExecutionEvent   = useWorkflowStore((s) => s.addExecutionEvent);
  const updateTaskStatus    = useWorkflowStore((s) => s.updateTaskStatus);
  const updateExecutionResult = useWorkflowStore((s) => s.updateExecutionResult);
  const updateExecutionError  = useWorkflowStore((s) => s.updateExecutionError);
  const setIsStreaming      = useWorkflowStore((s) => s.setIsStreaming);

  const handleSend = async () => {
    const prompt = message.trim();
    if (!prompt || isLoading) return;

    // Clear input immediately
    setMessage('');
    setIsLoading(true);
    setStatusMsg('Creating workflow…');

    // Close any previous stream
    cleanupRef.current?.();
    cleanupRef.current = null;

    try {
      // 1. Create the workflow on the backend
      const execution = await workflowClient.startWorkflow(prompt);
      setCurrentExecution(execution);
      setStatusMsg('Planning tasks…');

      // 2. Open the SSE stream — backend emits events as it plans + executes
      setIsStreaming(true);
      cleanupRef.current = workflowClient.streamExecutionEvents(
        execution.id,

        // onEvent — each SSE event
        (event) => {
          addExecutionEvent(event);

          if (event.type === 'workflow_start' && event.data?.tasks) {
            setStatusMsg('Executing wave plan…');
            const newTasks: Record<string, any> = {};
            const newEdges: any[] = [];
            event.data.tasks.forEach((t: any) => {
              newTasks[t.task_id] = {
                id: t.task_id,
                label: t.task,
                status: 'pending',
                type: t.type,
              };
              if (t.depends_on && Array.isArray(t.depends_on)) {
                t.depends_on.forEach((dep: string) => {
                  newEdges.push({
                    id: `${dep}-${t.task_id}`,
                    source: dep,
                    target: t.task_id,
                  });
                });
              }
            });
            useWorkflowStore.getState().setTasksAndEdges(newTasks, newEdges);
          } else if (event.type === 'task_start') {
            setStatusMsg(`Running: ${event.taskLabel || 'task'}…`);
            updateTaskStatus(event.taskId, 'running', event.taskLabel, event.data?.type);
          } else if (event.type === 'task_complete') {
            updateTaskStatus(event.taskId, 'completed', event.taskLabel, event.data?.type);
          } else if (event.type === 'task_error') {
            updateTaskStatus(event.taskId, 'failed', event.taskLabel, event.data?.type);
          }
        },

        // onComplete — workflow finished
        (result) => {
          // result = { merged: string | null, raw: {...} }
          const display = result?.merged ?? result;
          updateExecutionResult(typeof display === 'string' ? display : JSON.stringify(display, null, 2));
          setIsStreaming(false);
          setIsLoading(false);
          setStatusMsg('Done! ✓');
          setTimeout(() => setStatusMsg(''), 3000);
          cleanupRef.current = null;
        },

        // onError — stream error
        (error) => {
          updateExecutionError(error);
          setIsStreaming(false);
          setIsLoading(false);
          setStatusMsg(`Error: ${error}`);
          setTimeout(() => setStatusMsg(''), 5000);
          cleanupRef.current = null;
        }
      );
    } catch (err: any) {
      const msg = err?.message || String(err);
      updateExecutionError(msg);
      setIsStreaming(false);
      setIsLoading(false);
      setStatusMsg(`Error: ${msg}`);
      setTimeout(() => setStatusMsg(''), 5000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="fixed bottom-6 z-40"
      style={{ left: '320px', right: '24px' }}
    >
      {/* Status message */}
      {statusMsg && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-purple-300 mb-2 pl-4"
        >
          {statusMsg}
        </motion.p>
      )}

      <div
        className="flex items-center gap-2 px-4 py-3 rounded-full border backdrop-blur-sm transition-all"
        style={{
          backgroundColor: isFocused ? '#0a0a10' : '#080810',
          borderColor: isFocused ? 'rgba(124,58,237,0.6)' : 'rgba(124,58,237,0.4)',
          boxShadow: isFocused
            ? '0 0 30px rgba(124,58,237,0.5), inset 0 0 10px rgba(124,58,237,0.3)'
            : '0 0 20px rgba(124,58,237,0.4), inset 0 0 10px rgba(124,58,237,0.2)',
        }}
      >
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={isLoading ? 'Processing…' : 'Enter a prompt for the AI agents…'}
          disabled={isLoading}
          className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm disabled:opacity-60"
        />

        <Button
          size="sm"
          onClick={handleSend}
          disabled={isLoading || !message.trim()}
          className="text-white"
          style={{
            backgroundColor: '#7c3aed',
            boxShadow: '0 0 15px rgba(124,58,237,0.5)',
          }}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </motion.div>
  );
}
