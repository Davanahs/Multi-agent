'use client';

import { motion } from 'framer-motion';
import {
  Zap,
  BarChart3,
  Shield,
  Clock,
  GitBranch,
  Cpu,
} from 'lucide-react';
import { SpotlightCard } from '@/components/ui/spotlight-card';

const features = [
  {
    icon: Zap,
    title: 'Real-Time Execution',
    description:
      'Monitor AI agent workflows as they execute with live event streaming and instant status updates.',
  },
  {
    icon: BarChart3,
    title: 'Visual Workflow DAG',
    description:
      'Visualize complex task dependencies and execution flows with interactive directed acyclic graphs.',
  },
  {
    icon: Shield,
    title: 'Robust Error Handling',
    description:
      'Built-in retry logic, error tracking, and detailed failure diagnostics for production reliability.',
  },
  {
    icon: Clock,
    title: 'Performance Analytics',
    description:
      'Track execution times, throughput, and success rates with comprehensive metrics and insights.',
  },
  {
    icon: GitBranch,
    title: 'Workflow Versioning',
    description:
      'Version your workflows, compare changes, and roll back to previous versions with ease.',
  },
  {
    icon: Cpu,
    title: 'Scalable Architecture',
    description:
      'Handle millions of tasks with distributed processing and automatic resource optimization.',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
};

export function FeatureCards() {
  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-slate-950 overflow-hidden">
      {/* Section background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl -translate-x-1/2" />
        <div className="absolute top-1/2 right-0 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl translate-x-1/2" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            <span className="text-white">Powerful Features for </span>
            <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Modern Workflows
            </span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Everything you need to build, deploy, and manage complex AI agent
            orchestration systems.
          </p>
        </motion.div>

        {/* Feature Grid */}
        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                variants={itemVariants}
                className="group relative h-full"
              >
                <SpotlightCard className="h-full p-6 rounded-lg border border-purple-900/20 bg-gradient-to-br from-slate-900/40 to-slate-900/20 backdrop-blur-xl hover:border-purple-500/40 transition-all">
                  {/* Hover glow effect */}
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-600/0 to-cyan-400/0 group-hover:from-purple-600/10 group-hover:to-cyan-400/10 transition-all duration-300 pointer-events-none" />

                  {/* Content */}
                  <div className="relative z-10">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-600/20 to-cyan-400/20 flex items-center justify-center mb-4 group-hover:from-purple-600/30 group-hover:to-cyan-400/30 transition-all">
                      <Icon className="w-6 h-6 text-cyan-400" />
                    </div>

                    <h3 className="text-lg font-semibold text-white mb-2">
                      {feature.title}
                    </h3>

                    <p className="text-gray-400 text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </div>

                  {/* Border gradient animation */}
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none" />
                </SpotlightCard>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
