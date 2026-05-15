'use client';

import { motion } from 'framer-motion';
import { useWorkflowStore } from '@/lib/store/workflow-store';
import { CheckCircle, Copy } from 'lucide-react';

export function ResultPanel() {
  const currentExecution = useWorkflowStore((state) => state.currentExecution);
  const result = currentExecution?.result;

  const handleCopyResult = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    }
  };

  if (!result) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="p-4 rounded-lg border backdrop-blur-sm"
        style={{
          backgroundColor: '#020208',
          borderColor: 'rgba(124,58,237,0.4)',
          boxShadow: '0 0 20px rgba(124,58,237,0.4), inset 0 0 10px rgba(124,58,237,0.2)',
        }}
      >
        <p className="text-center text-gray-500 text-sm">No results yet</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="p-4 rounded-lg border backdrop-blur-sm space-y-3"
      style={{
        backgroundColor: '#020208',
        borderColor: 'rgba(124,58,237,0.4)',
        boxShadow: '0 0 20px rgba(124,58,237,0.4), inset 0 0 10px rgba(124,58,237,0.2)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">JSON</h3>
        <button
          onClick={handleCopyResult}
          className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
          title="Copy result"
        >
          <Copy className="w-4 h-4" />
        </button>
      </div>

      {/* Result content */}
      <div 
        className="rounded p-3 text-xs font-mono overflow-auto max-h-32"
        style={{ backgroundColor: '#04040a' }}
      >
        <pre style={{ color: '#a78bfa', margin: 0 }}>{JSON.stringify(result, null, 2)}</pre>
      </div>
    </motion.div>
  );
}
