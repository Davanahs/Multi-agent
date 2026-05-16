'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export function CTASection() {
  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-950 to-purple-900/20 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute top-1/2 left-1/2 w-96 h-96 bg-gradient-to-r from-purple-600/20 to-cyan-400/20 rounded-full blur-3xl"
          animate={{
            x: [0, 50, 0],
            y: [-50, 0, -50],
          }}
          transition={{ duration: 8, repeat: Infinity }}
          style={{ transform: 'translate(-50%, -50%)' }}
        />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto">
        <motion.div
          className="text-center space-y-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
            <span className="text-white">Ready to </span>
            <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Transform Your Workflows
            </span>
            <span className="text-white">?</span>
          </h2>

          <p className="text-gray-400 text-lg leading-relaxed">
            Join teams using Lumi to orchestrate complex AI agent workflows at
            scale. Start building today.
          </p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center pt-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <Link
              href="/dashboard"
              className="group inline-flex items-center justify-center gap-2 px-8 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all"
            >
              Start Building Now
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <button className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-lg border border-purple-500/30 text-gray-300 font-semibold hover:border-purple-400/50 hover:bg-purple-900/10 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] transition-all">
              View Documentation
            </button>
          </motion.div>
        </motion.div>

        {/* Stats section */}
        <motion.div
          className="grid grid-cols-3 gap-4 mt-16 pt-16 border-t border-purple-900/20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          {[
            { number: '99.9%', label: 'Uptime SLA' },
            { number: '< 100ms', label: 'Latency' },
            { number: '10M+', label: 'Tasks/Day' },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                {stat.number}
              </div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
