'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronRight, Zap } from 'lucide-react';
import { AgentVisualizer } from '@/components/landing/agent-visualizer';

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950 px-4 sm:px-6 lg:px-8 pt-20">
      
      {/* Full Screen Animated Background (Agent Visualizer) */}
      <div className="absolute inset-0 z-0">
        <AgentVisualizer />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto text-center mt-12">
        <div className="flex flex-col items-center justify-center space-y-8">
          
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-900/40 backdrop-blur-md"
          >
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-gray-200">
              Next-Gen AI Orchestration
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white drop-shadow-2xl"
            style={{ textShadow: '0 4px 30px rgba(0,0,0,0.5)' }}
          >
            Orchestrate <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">AI Workflows</span> <br className="hidden sm:block" /> in Real-Time
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl text-gray-300 leading-relaxed max-w-2xl drop-shadow-lg"
          >
            Visualize, manage, and execute complex AI agent workflows with
            real-time monitoring. Build intelligent automation that scales.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 pt-8"
          >
            <Link
              href="/dashboard"
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-semibold hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] transition-all text-lg"
            >
              Launch Dashboard
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>

            <button className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full border-2 border-purple-500/50 text-white font-semibold hover:bg-purple-900/30 backdrop-blur-sm transition-all text-lg shadow-[0_0_20px_rgba(168,85,247,0.15)] hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]">
              Learn More
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
