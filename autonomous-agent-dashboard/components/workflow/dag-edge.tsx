'use client';

import { memo } from 'react';
import {
  EdgeProps,
  getSmoothStepPath,
  BaseEdge,
  MarkerType,
} from 'reactflow';

function DagEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        stroke: 'rgba(124,58,237,0.6)',
        strokeWidth: 2,
        opacity: 0.8,
        filter: 'drop-shadow(0 0 4px rgba(124,58,237,0.4))',
      }}
      markerEnd={MarkerType.ArrowClosed}
    />
  );
}

export const DagEdge = memo(DagEdgeComponent);
