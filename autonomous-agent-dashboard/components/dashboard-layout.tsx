'use client';

import React from 'react';
import { Navbar } from '@/components/navbar';
import { Sidebar } from '@/components/sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div 
      className="min-h-screen relative overflow-hidden" 
      style={{ 
        backgroundColor: '#020205',
      }}
    >
      {/* Background Image Overlay */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.15] pointer-events-none"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=3000&auto=format&fit=crop')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          mixBlendMode: 'screen',
        }}
      />
      {/* Cinematic Glowing Gradients */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(124, 58, 237, 0.15) 0%, transparent 60%),
            radial-gradient(circle at 80% 20%, rgba(6, 182, 212, 0.1) 0%, transparent 40%),
            radial-gradient(circle at 20% 80%, rgba(124, 58, 237, 0.1) 0%, transparent 40%),
            linear-gradient(to bottom, transparent, #020205)
          `
        }}
      />

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />
        <div className="flex flex-1">
          <Sidebar />
        <main className="ml-64 mt-16 flex-1 overflow-auto">
          <div className="min-h-screen p-6">
            {children}
          </div>
        </main>
        </div>
      </div>
    </div>
  );
}
