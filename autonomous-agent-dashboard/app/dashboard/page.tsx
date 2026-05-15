'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { WelcomeSection } from '@/components/dashboard/welcome-section';
import { WorkflowCanvas } from '@/components/dashboard/workflow-canvas';
import { ExecutionPanel } from '@/components/dashboard/execution-panel';
import { ResultPanel } from '@/components/dashboard/result-panel';
import { AgentInstances } from '@/components/dashboard/agent-instances';
import { ChatInput } from '@/components/dashboard/chat-input';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6 pb-32">
        {/* Welcome with metrics */}
        <WelcomeSection />

        {/* Main content grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left side - Workflow Canvas (2 columns) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Workflow Canvas */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Workflow Canvas</h2>
              <p className="text-gray-400 text-sm mb-3">Complex Research & Report for: DAG</p>
              <WorkflowCanvas />
            </div>

            {/* Result Display */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Result Display</h2>
              <ResultPanel />
            </div>

            {/* Agent Instances */}
            <AgentInstances />
          </div>

          {/* Right side - Execution Panel (1 column) */}
          <div>
            <ExecutionPanel />
          </div>
        </div>
      </div>

      {/* Chat Input at bottom */}
      <ChatInput />
    </DashboardLayout>
  );
}
