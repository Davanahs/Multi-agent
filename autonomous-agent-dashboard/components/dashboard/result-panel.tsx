'use client';

import { motion } from 'framer-motion';
import { useWorkflowStore } from '@/lib/store/workflow-store';
import { Copy } from 'lucide-react';

export function ResultPanel() {
  const currentExecution = useWorkflowStore((state) => state.currentExecution);
  const result = currentExecution?.result;

  const handleCopyResult = () => {
    if (result) {
      const text = typeof result === 'string'
        ? result
        : JSON.stringify(result, null, 2);
      navigator.clipboard.writeText(text);
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
          minHeight: '80px',
        }}
      >
        <p className="text-center text-gray-500 text-sm mt-4">
          Result will appear here when the workflow completes.
        </p>
      </motion.div>
    );
  }

  const isString = typeof result === 'string';
  const displayText = isString ? result : JSON.stringify(result, null, 2);

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
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Result</h3>
        <button
          onClick={handleCopyResult}
          className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
          title="Copy result"
        >
          <Copy className="w-4 h-4" />
        </button>
      </div>

      <div
        className="rounded p-3 text-xs font-mono overflow-auto max-h-64"
        style={{ backgroundColor: '#04040a' }}
      >
        <pre style={{ color: isString ? '#e2e8f0' : '#a78bfa', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {displayText}
        </pre>
      </div>
    </motion.div>
  );
}
