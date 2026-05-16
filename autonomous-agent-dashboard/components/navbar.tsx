'use client';

import Link from 'next/link';
import { Bell, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Navbar() {
  return (
    <nav 
      className="sticky top-0 z-40 backdrop-blur-xl border-b"
      style={{
        backgroundColor: '#04040a',
        borderColor: 'rgba(124, 58, 237, 0.15)',
      }}
    >
      <div className="flex items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="relative">
            <span 
              className="font-bold text-lg px-3 py-2"
              style={{
                textShadow: '0 0 20px rgba(124,58,237,0.8)',
                color: '#a78bfa',
              }}
            >
              Lumi
            </span>
          </div>
          <span className="hidden sm:inline text-gray-400 font-medium text-sm">
            Workflow Orchestration
          </span>
        </Link>

        {/* Center Navigation - Only show on dashboard */}
        <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          <Link
            href="/dashboard"
            className="px-4 py-2 text-sm text-gray-300 rounded-lg hover:bg-purple-900/20 transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/"
            className="px-4 py-2 text-sm text-gray-300 rounded-lg hover:bg-purple-900/20 transition-colors"
          >
            Home
          </Link>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          <button className="relative p-2 text-gray-400 hover:text-gray-200 transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-cyan-400 rounded-full" />
          </button>

          <button className="p-2 text-gray-400 hover:text-gray-200 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </nav>
  );
}
