# Lumi - AI Workflow Orchestration Platform

A production-ready dashboard for orchestrating and visualizing complex AI agent workflows in real-time.

## Overview

Lumi consists of two main parts:

1. **Landing Page** (`/`) - Marketing site showcasing the platform with animated agent visualization
2. **Dashboard** (`/dashboard`) - Real-time workflow visualization and execution monitoring

## Architecture

### Frontend Stack
- **Framework**: Next.js 16 with App Router
- **Styling**: Tailwind CSS with custom dark theme
- **Animations**: Framer Motion
- **State Management**: Zustand
- **Visualization**: ReactFlow (DAG/workflow visualization)
- **UI Components**: shadcn/ui

### Technology Details
- **Type Safety**: TypeScript
- **Real-time Updates**: Server-Sent Events (SSE)
- **Icons**: Lucide React

## Project Structure

```
/app
  /layout.tsx           # Root layout with metadata
  /page.tsx             # Landing page
  /dashboard
    /page.tsx           # Dashboard page

/components
  /landing              # Landing page components
    - hero-section.tsx
    - agent-visualizer.tsx
    - feature-cards.tsx
    - cta-section.tsx
  /dashboard            # Dashboard components
    - welcome-section.tsx
    - workflow-canvas.tsx
    - execution-panel.tsx
    - result-panel.tsx
  - navbar.tsx          # Top navigation bar
  - sidebar.tsx         # Left sidebar
  - dashboard-layout.tsx # Dashboard wrapper layout

/hooks
  - use-workflow-stream.ts    # SSE streaming hook
  - use-workflow-execution.ts # Workflow execution hook
  - use-dag-layout.ts         # DAG layout algorithm

/lib
  /api
    - workflow-client.ts      # API client for backend
  /store
    - workflow-store.ts       # Zustand state management
  /types
    - workflow.ts             # TypeScript type definitions
  - utils.ts                  # Shared utilities

/components/ui              # shadcn/ui components
/hooks/use-*.ts            # Custom React hooks
```

## Setup Instructions

### 1. Install Dependencies

All dependencies are already installed, including:
- `framer-motion` - Smooth animations
- `reactflow` - DAG visualization
- `zustand` - State management

### 2. Environment Variables

The application works with a FastAPI backend. Set the API base URL:

```bash
# .env.local
NEXT_PUBLIC_API_BASE=http://localhost:8080
```

### 3. Running the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Key Features

### Landing Page
- **Hero Section**: Animated agent visualizer with glowing effects
- **Feature Showcase**: 6 key features highlighting the platform's capabilities
- **Call-to-Action**: Multiple CTAs to launch the dashboard
- **Animations**: Smooth entrance animations and interactive elements

### Dashboard
- **Real-time Monitoring**: Live event streaming via SSE
- **Workflow Visualization**: Interactive DAG rendering with ReactFlow
- **Task Status Tracking**: Visual indicators for pending, running, completed, and failed tasks
- **Execution Events**: Scrollable event log with timestamps
- **Performance Metrics**: Key metrics display (active workflows, completion rate, etc.)
- **Result Display**: JSON result viewer with copy functionality

## Color Scheme

The application uses a sophisticated dark theme with accent colors:
- **Primary**: Dark slate (#0f172a, #1e293b)
- **Accent 1**: Purple (#7c3aed, #a78bfa)
- **Accent 2**: Cyan (#06b6d4, #22d3ee)
- **Accent 3**: Emerald (for success states)
- **Accent 4**: Red (for error states)

## API Integration

The frontend expects the following endpoints from your FastAPI backend:

### Start Workflow
```
POST /api/workflows
Body: { "workflow_id": "string" }
Response: WorkflowExecution
```

### Stream Events
```
GET /api/workflows/{execution_id}/stream
Response: Server-Sent Events (SSE)
  - task_start
  - task_complete
  - task_error
  - workflow_complete
```

### Get Result
```
GET /api/workflows/{execution_id}/result
Response: { result: Record<string, any> }
```

### Get Execution History
```
GET /api/workflows?limit=50
Response: WorkflowExecution[]
```

## Component Documentation

### DagNode
Represents a task in the workflow DAG with status-based styling and animations.

Props:
- `label` (string): Task name
- `status` (TaskStatus): pending | running | completed | failed

### ExecutionPanel
Displays live event stream from workflow execution with scrollable event log.

### WorkflowCanvas
ReactFlow-based DAG visualization with automatic layout algorithm.

### WelcomeSection
Displays greeting, key metrics, and action buttons.

## State Management (Zustand Store)

The `useWorkflowStore` provides:
- `currentExecution` - Active workflow execution
- `executionHistory` - Recent executions (last 50)
- `isStreaming` - Stream status flag
- `metrics` - Dashboard metrics

Actions:
- `setCurrentExecution(execution)` - Set active workflow
- `updateTaskStatus(taskId, status)` - Update task status
- `addExecutionEvent(event)` - Add event to log
- `completeExecution()` - Mark workflow complete

## Styling Guidelines

### Animations
- Use `framer-motion` for complex animations
- Tailwind classes for simple transitions
- Keep animations under 600-800ms for responsiveness

### Layout
- Flexbox for 1D layouts
- CSS Grid for 2D layouts
- Mobile-first responsive design

### Components
- Use `motion.div` from framer-motion for animated containers
- Apply className directly for styling
- Use Tailwind's responsive prefixes (sm:, md:, lg:)

## Development Tips

1. **Add Logging**: Use `console.log("[v0] ...")` for debugging
2. **Test Streaming**: Use browser DevTools Network tab to inspect SSE events
3. **ReactFlow Tips**: Use Controls and Background components for better UX
4. **State Debugging**: Browser DevTools Redux extension supports Zustand via middleware

## Future Enhancements

- [ ] User authentication & authorization
- [ ] Workflow versioning and history
- [ ] Advanced filtering and search
- [ ] Custom notifications
- [ ] Workflow templates
- [ ] Multi-user collaboration
- [ ] Advanced analytics and insights
- [ ] Mobile app version

## Troubleshooting

### API Connection Issues
- Ensure FastAPI backend is running on `http://localhost:8080`
- Check `NEXT_PUBLIC_API_BASE` environment variable
- Verify CORS settings in backend

### Animations Not Playing
- Check Framer Motion version matches (12.38.0+)
- Verify GPU acceleration is enabled
- Check browser devtools for CSS errors

### ReactFlow Issues
- Ensure nodes have unique IDs
- Verify node positions are valid numbers
- Check that edges reference existing nodes

## License

Proprietary - Lumi Platform
