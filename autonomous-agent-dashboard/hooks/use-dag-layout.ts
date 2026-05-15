import { useMemo } from 'react';
import { Node, Edge } from 'reactflow';
import { WorkflowExecution, WorkflowNode, WorkflowEdge } from '@/lib/types/workflow';

const NODE_WIDTH = 150;
const NODE_HEIGHT = 80;
const LAYER_HEIGHT = 150;
const LAYER_WIDTH = 250;

interface UseDagLayoutResult {
  nodes: Node[];
  edges: Edge[];
}

/**
 * Convert workflow execution to ReactFlow nodes and edges
 * Arranges nodes in horizontal layers (wave visualization)
 */
export function useDagLayout(
  execution: WorkflowExecution | null
): UseDagLayoutResult {
  return useMemo(() => {
    if (!execution) {
      return { nodes: [], edges: [] };
    }

    const { tasks, edges: workflowEdges } = execution;

    // Build adjacency list to determine layers
    const adjacencyList: Record<string, string[]> = {};
    const inDegree: Record<string, number> = {};

    Object.keys(tasks).forEach((taskId) => {
      adjacencyList[taskId] = [];
      inDegree[taskId] = 0;
    });

    workflowEdges.forEach((edge) => {
      adjacencyList[edge.source]?.push(edge.target);
      inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
    });

    // Topological sort to assign layers
    const layers: Record<number, string[]> = {};
    const taskLayers: Record<string, number> = {};
    const queue: string[] = [];

    // Find all source nodes (no incoming edges)
    Object.keys(tasks).forEach((taskId) => {
      if (inDegree[taskId] === 0) {
        queue.push(taskId);
        layers[0] = layers[0] || [];
        layers[0].push(taskId);
        taskLayers[taskId] = 0;
      }
    });

    // BFS to assign layers
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;

      const currentLayer = taskLayers[current];

      (adjacencyList[current] || []).forEach((neighbor) => {
        inDegree[neighbor]--;

        if (inDegree[neighbor] === 0) {
          const nextLayer = currentLayer + 1;
          layers[nextLayer] = layers[nextLayer] || [];
          layers[nextLayer].push(neighbor);
          taskLayers[neighbor] = nextLayer;
          queue.push(neighbor);
        }
      });
    }

    // Convert to ReactFlow nodes with positions
    const nodes: Node[] = [];
    Object.entries(layers).forEach(([layerStr, layerTasks]) => {
      const layer = parseInt(layerStr);
      const x = layer * LAYER_WIDTH;

      layerTasks.forEach((taskId, index) => {
        const task = tasks[taskId];
        const y = index * LAYER_HEIGHT - (layerTasks.length - 1) * (LAYER_HEIGHT / 2);

        nodes.push({
          id: taskId,
          data: {
            label: task.label,
            status: task.status,
          },
          position: { x, y },
          type: 'default',
        });
      });
    });

    // Convert to ReactFlow edges
    const edges: Edge[] = workflowEdges.map((edge) => ({
      id: `${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep',
    }));

    return { nodes, edges };
  }, [execution]);
}
