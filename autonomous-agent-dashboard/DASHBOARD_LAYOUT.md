# Lumi Dashboard - Layout & Architecture

## Overview
The Lumi dashboard has been redesigned to match a professional workflow orchestration UI with a sophisticated dark theme and aggressive glow effects.

## Page Layout

### Header Section
- **Greeting**: "Good Evening, [Name]"
- **Subtitle**: "Welcome to your AI Operations Hub"
- **Metrics Bar**: 4 metric cards displaying:
  - Active Workflows
  - Completion Rate / Completed Workflows
  - Recent Errors / Failed Workflows
  - Total Agents / Average Execution Time

### Main Content Grid (3 Columns)

#### Left Column (2 columns wide)
1. **Workflow Canvas**
   - Interactive DAG visualization using ReactFlow
   - Shows task dependencies and execution flow
   - Custom nodes with status-based glow effects (purple, cyan, emerald, red)
   - Height: 400px
   - Features: Mini map, controls, background grid

2. **Result Display**
   - Shows JSON output from completed workflows
   - Compact design with copy functionality
   - Max height: 128px (scrollable)

3. **Active Agent Instances**
   - 3-column grid showing active agents
   - Each agent card displays:
     - Agent name and icon
     - Status (Active/Idle/Error) with glow indicator
     - Animated progress bar
   - Status-based colors: emerald (active), gray (idle), red (error)

#### Right Column (1 column wide)
- **Execution Panel**
  - Real-time event streaming log
  - Displays task events with timestamps
  - Compact event rows with left border accent
  - "Start Workflow" button in footer
  - Status indicator showing "demo mode"
  - Scrollable event list

### Bottom Section
- **Chat Input Bar**
  - Fixed position at bottom of viewport
  - "Ask Lumi anything..." placeholder
  - Voice input button
  - Send button with purple glow effect
  - Spans from left sidebar edge to right margin

## Visual Design System

### Color Palette
- **Background**: `#04040a` (deep black/near-black)
- **Panel**: `#080810` (slightly lighter panels)
- **Surface**: `#020208` (darkest surfaces)
- **Primary Accent**: Purple `#7c3aed`
- **Secondary Accent**: Cyan `#06b6d4`
- **Status Colors**:
  - Active/Running: Cyan `#06b6d4`
  - Completed: Emerald `#10b981`
  - Failed: Red `#ef4444`
  - Pending/Idle: Gray `#6b7280`

### Glow Effects
- **Borders**: `rgba(124,58,237,0.15)` (purple glow)
- **Box Shadows**:
  - Strong: `0 0 30px rgba(124,58,237,0.15)`
  - Medium: `0 0 20px rgba(124,58,237,0.08)`
  - Subtle: `0 0 15px rgba(124,58,237,0.08)`
- **Text Shadow**: `0 0 30px rgba(167,139,250,0.6)` on headings

### Typography
- **Headings**: Sans-serif, bold, with text-shadow glow
- **Subtitles**: Gray `#9ca3af` (600)
- **Body**: Gray `#d1d5db` (300)
- **Small Text**: Gray `#9ca3af` (400)
- **Labels**: Uppercase, small, gray `#6b7280`

### Components
- **Metric Cards**: 
  - Grid: `grid-cols-2 md:grid-cols-4 gap-3`
  - Padding: `p-3`
  - Min height for readability
  
- **Panels**:
  - Padding: `p-4`
  - Border radius: `rounded-lg`
  - Backdrop blur: `backdrop-blur-sm`
  
- **Buttons**:
  - Primary (Purple): `#7c3aed` with glow shadow
  - Secondary: Outline with purple border
  - Size variants: Standard, small (for footer)

## Responsive Behavior

### Desktop (lg breakpoint)
- 3-column grid layout active
- Left sidebar visible (264px fixed width)
- Full metric card display (4 columns)

### Tablet/Mobile
- Metrics stack to 2 columns
- Canvas may stack below execution panel
- Chat input adapts to smaller screen

## Interactive Elements

### Execution Panel
- Auto-updates with real-time events
- Events display as compact rows
- Timestamp in cyan with subtle glow
- Left border accent on event rows
- Status indicator in header (green dot = running)

### Agent Instances
- Animated progress bars
- Glow effects on status indicators
- Click to view details (future)
- Edit button to manage agents

### Workflow Canvas
- Zoom and pan controls
- Mini map for navigation
- ReactFlow handles layout
- Custom node colors based on task status

## Demo Mode

The dashboard runs in demo mode by default, which:
- Simulates a 5-task workflow execution
- Streams events with realistic delays
- Updates node statuses in real-time
- Generates sample JSON result

To connect to a real API backend:
1. Update `useDemoMode` in `execution-panel.tsx` to `false`
2. Ensure FastAPI backend is running on `http://localhost:8080`
3. Implement SSE streaming in your backend

## Component Files

- `/components/dashboard/welcome-section.tsx` - Greeting & metrics
- `/components/dashboard/workflow-canvas.tsx` - ReactFlow DAG
- `/components/dashboard/execution-panel.tsx` - Event log
- `/components/dashboard/result-panel.tsx` - JSON output
- `/components/dashboard/agent-instances.tsx` - Active agents
- `/components/dashboard/chat-input.tsx` - Bottom chat bar
- `/app/dashboard/page.tsx` - Main dashboard layout
