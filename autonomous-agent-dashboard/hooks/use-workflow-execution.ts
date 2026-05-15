import { useState, useCallback } from 'react';
import { useWorkflowStore } from '@/lib/store/workflow-store';
import { workflowClient } from '@/lib/api/workflow-client';
import { WorkflowExecution } from '@/lib/types/workflow';

interface UseWorkflowExecutionResult {
  execution: WorkflowExecution | null;
  isLoading: boolean;
  error: string | null;
  startExecution: (workflowId: string) => Promise<WorkflowExecution | null>;
  getExecution: (executionId: string) => Promise<WorkflowExecution | null>;
  clearError: () => void;
}

export function useWorkflowExecution(): UseWorkflowExecutionResult {
  const setCurrentExecution = useWorkflowStore((state) => state.setCurrentExecution);
  const currentExecution = useWorkflowStore((state) => state.currentExecution);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startExecution = useCallback(
    async (workflowId: string): Promise<WorkflowExecution | null> => {
      try {
        setIsLoading(true);
        setError(null);

        console.log('[v0] Starting workflow execution for:', workflowId);

        const execution = await workflowClient.startWorkflow(workflowId);

        // Initialize execution with default structure
        const initialExecution: WorkflowExecution = {
          ...execution,
          tasks: execution.tasks || {},
          edges: execution.edges || [],
          events: [],
          status: 'running',
          startedAt: Date.now(),
        };

        setCurrentExecution(initialExecution);
        console.log('[v0] Execution started:', initialExecution.id);

        return initialExecution;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error('[v0] Failed to start execution:', errorMsg);
        setError(errorMsg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [setCurrentExecution]
  );

  const getExecution = useCallback(
    async (executionId: string): Promise<WorkflowExecution | null> => {
      try {
        setIsLoading(true);
        setError(null);

        const execution = await workflowClient.getExecution(executionId);
        setCurrentExecution(execution);

        return execution;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error('[v0] Failed to fetch execution:', errorMsg);
        setError(errorMsg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [setCurrentExecution]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    execution: currentExecution,
    isLoading,
    error,
    startExecution,
    getExecution,
    clearError,
  };
}
