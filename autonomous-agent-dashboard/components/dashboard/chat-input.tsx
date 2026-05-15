'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ChatInput() {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSend = () => {
    if (message.trim()) {
      console.log('[v0] Sending message:', message);
      setMessage('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="fixed bottom-6 z-40"
      style={{
        left: '320px',
        right: '24px',
      }}
    >
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
          placeholder="Ask Lumi anything..."
          className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm"
        />

        <Button
          size="sm"
          variant="ghost"
          className="text-gray-400 hover:text-gray-200"
        >
          <Mic className="w-4 h-4" />
        </Button>

        <Button
          size="sm"
          onClick={handleSend}
          className="text-white"
          style={{
            backgroundColor: '#7c3aed',
            boxShadow: '0 0 15px rgba(124,58,237,0.5)',
          }}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}
