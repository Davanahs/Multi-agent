'use client';

import { useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MiniMap,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useWorkflowStore } from '@/lib/store/workflow-store';
import { useDagLayout } from '@/hooks/use-dag-layout';
import { DagNode } from '@/components/workflow/dag-node';
import { DagEdge } from '@/components/workflow/dag-edge';

const nodeTypes = {
  custom: DagNode,
};

const edgeTypes = {
  smoothstep: DagEdge,
};

export function WorkflowCanvas() {
  const currentExecution = useWorkflowStore((state) => state.currentExecution);
  const { nodes: layoutNodes, edges: layoutEdges } = useDagLayout(
    currentExecution
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  // Update nodes and edges when execution changes
  useEffect(() => {
    setNodes(layoutNodes);
    setEdges(layoutEdges);
  }, [layoutNodes, layoutEdges, setNodes, setEdges]);

  return (
    <div 
      className="relative rounded-lg border backdrop-blur-sm overflow-hidden"
      style={{
        height: '400px',
        backgroundColor: '#04040a',
        borderColor: 'rgba(124,58,237,0.4)',
        boxShadow: '0 0 20px rgba(124,58,237,0.4), inset 0 0 10px rgba(124,58,237,0.2)',
        backgroundImage: 'radial-gradient(ellipse at center, rgba(124,58,237,0.1) 0%, transparent 70%)',
      }}
    >
      {currentExecution ? (
        <>
          <div className="absolute top-4 left-4 right-4 z-10 pointer-events-none">
            <div 
              className="px-4 py-2 rounded-lg border backdrop-blur-md inline-block max-w-[80%]"
              style={{
                backgroundColor: 'rgba(8, 8, 16, 0.8)',
                borderColor: 'rgba(124, 58, 237, 0.3)',
              }}
            >
              <p className="text-xs text-gray-400 mb-1">Current Task:</p>
              <p className="text-sm font-medium text-white truncate">
                {currentExecution.name}
              </p>
            </div>
          </div>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            panOnScroll={true}
            zoomOnScroll={false}
          >
            <Background color="#0a0a10" gap={12} size={1} />
            <Controls 
              style={{
                backgroundColor: '#06060e',
                borderColor: 'rgba(124,58,237,0.15)',
              }}
            />
            <MiniMap
              style={{
                backgroundColor: '#06060e',
                borderColor: 'rgba(124,58,237,0.15)',
              }}
              nodeColor="#7c3aed"
              nodeStrokeColor="#1e293b"
              nodeBorderRadius={8}
              maskColor="rgba(0, 0, 0, 0.4)"
            />
          </ReactFlow>
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center text-gray-400">
            <p className="font-medium">No workflow running</p>
            <p className="text-sm text-gray-500">
              Start a new workflow to see the DAG visualization
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
