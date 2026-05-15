import { useEffect, useCallback, useRef } from 'react';
import { useWorkflowStore } from '@/lib/store/workflow-store';
import { workflowClient } from '@/lib/api/workflow-client';
import { ExecutionEvent } from '@/lib/types/workflow';

interface UseWorkflowStreamOptions {
  autoStart?: boolean;
  onStreamStart?: () => void;
  onEvent?: (event: ExecutionEvent) => void;
  onComplete?: (result: Record<string, any>) => void;
  onError?: (error: string) => void;
}

export function useWorkflowStream(
  executionId: string | null,
  options: UseWorkflowStreamOptions = {}
) {
  const {
    autoStart = true,
    onStreamStart,
    onEvent,
    onComplete,
    onError,
  } = options;

  const setIsStreaming = useWorkflowStore((state) => state.setIsStreaming);
  const addExecutionEvent = useWorkflowStore((state) => state.addExecutionEvent);
  const updateTaskStatus = useWorkflowStore((state) => state.updateTaskStatus);
  const updateExecutionResult = useWorkflowStore((state) => state.updateExecutionResult);
  const updateExecutionError = useWorkflowStore((state) => state.updateExecutionError);
  const cleanupRef = useRef<(() => void) | null>(null);

  const startStream = useCallback(() => {
    if (!executionId) {
      console.error('[v0] No execution ID provided');
      return;
    }

    try {
      console.log('[v0] Starting workflow stream for execution:', executionId);
      onStreamStart?.();
      setIsStreaming(true);

      cleanupRef.current = workflowClient.streamExecutionEvents(
        executionId,
        (event) => {
          console.log('[v0] Received event:', event.type, event.taskId);

          // Update store
          addExecutionEvent(event);

          // Update task status
          if (event.type === 'task_start') {
            updateTaskStatus(event.taskId, 'running');
          } else if (event.type === 'task_complete') {
            updateTaskStatus(event.taskId, 'completed');
          } else if (event.type === 'task_error') {
            updateTaskStatus(event.taskId, 'failed');
          }

          // Call user callback
          onEvent?.(event);
        },
        (result) => {
          console.log('[v0] Workflow completed with result');
          updateExecutionResult(result);
          setIsStreaming(false);
          onComplete?.(result);
        },
        (error) => {
          console.error('[v0] Stream error:', error);
          updateExecutionError(error);
          setIsStreaming(false);
          onError?.(error);
        }
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[v0] Failed to start stream:', errorMsg);
      setIsStreaming(false);
      onError?.(errorMsg);
    }
  }, [
    executionId,
    onStreamStart,
    onEvent,
    onComplete,
    onError,
    setIsStreaming,
    addExecutionEvent,
    updateTaskStatus,
    updateExecutionResult,
    updateExecutionError,
  ]);

  // Auto-start stream when execution ID changes
  useEffect(() => {
    if (autoStart && executionId) {
      startStream();
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [executionId, autoStart, startStream]);

  return { startStream };
}
