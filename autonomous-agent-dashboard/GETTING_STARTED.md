# Getting Started with Lumi

Welcome to Lumi, your AI workflow orchestration platform! This guide will help you get up and running in minutes.

## Quick Start (5 minutes)

### 1. Start the Development Server

```bash
cd /vercel/share/v0-project
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Explore the Landing Page

You should see the beautiful landing page with:
- Animated hero section with agent visualization
- Feature showcase cards
- Call-to-action buttons

Click "**Launch Dashboard**" to enter the workflow orchestration interface.

### 3. Test the Dashboard

The dashboard starts in **demo mode** showing:
- Welcome greeting with metrics
- Workflow visualization canvas
- Execution events panel
- Demo workflow with 5 tasks

Click "**Start Workflow**" in the Execution Events panel to simulate a workflow running.

Watch as:
- Tasks transition from pending → running → completed
- Events appear in real-time in the event log
- Task nodes animate with status colors
- Final result displays when complete

## File Locations

| Feature | File |
|---------|------|
| Landing Page | `/app/page.tsx` |
| Dashboard Main | `/app/dashboard/page.tsx` |
| Workflows Page | `/app/dashboard/workflows/page.tsx` |
| Analytics Page | `/app/dashboard/analytics/page.tsx` |
| Settings Page | `/app/dashboard/settings/page.tsx` |

## Key URLs

| URL | Description |
|-----|-------------|
| http://localhost:3000 | Landing page |
| http://localhost:3000/dashboard | Main dashboard |
| http://localhost:3000/dashboard/workflows | Workflow history & templates |
| http://localhost:3000/dashboard/analytics | Performance metrics |
| http://localhost:3000/dashboard/settings | Configuration |

## Understanding the Components

### Landing Page Structure
```
/components/landing/
├── hero-section.tsx       # Hero with agent visualizer
├── agent-visualizer.tsx   # Animated 3D agent
├── feature-cards.tsx      # Feature showcase
└── cta-section.tsx        # Call-to-action
```

### Dashboard Structure
```
/components/dashboard/
├── welcome-section.tsx    # Greeting & metrics
├── workflow-canvas.tsx    # DAG visualization
├── execution-panel.tsx    # Real-time events
└── result-panel.tsx       # Final results
```

### Navigation
```
/components/
├── navbar.tsx             # Top navigation bar
├── sidebar.tsx            # Left sidebar menu
└── dashboard-layout.tsx   # Layout wrapper
```

## How It Works

### State Management (Zustand)

The app uses Zustand for state. Access it like:

```typescript
import { useWorkflowStore } from '@/lib/store/workflow-store';

export function MyComponent() {
  const currentExecution = useWorkflowStore((state) => state.currentExecution);
  const isStreaming = useWorkflowStore((state) => state.isStreaming);
  
  // Use the data...
}
```

### API Integration

The app is configured to connect to a FastAPI backend. Currently using demo mode:

**Current**: Demo mode (simulated events)
**To enable real API**: See [API_INTEGRATION.md](./API_INTEGRATION.md)

### Real-Time Events

When a workflow runs, events flow through the system:

```
Backend (SSE) → API Client → Zustand Store → Components → UI Update
```

## Customizing the App

### Change Colors

Edit `/app/globals.css` to modify the color scheme:

```css
:root {
  --primary: #7c3aed;      /* purple */
  --secondary: #06b6d4;    /* cyan */
  --background: #0f172a;   /* dark */
}
```

Then use in components:
```jsx
<div className="bg-gradient-to-r from-purple-600 to-cyan-500">
  Custom gradient
</div>
```

### Add a New Page

1. Create file: `/app/dashboard/my-page/page.tsx`
2. Wrap with DashboardLayout:
```tsx
import { DashboardLayout } from '@/components/dashboard-layout';

export default function MyPage() {
  return (
    <DashboardLayout>
      {/* Your content */}
    </DashboardLayout>
  );
}
```

### Add to Sidebar Menu

Edit `/components/sidebar.tsx`:

```typescript
const menuItems = [
  // ... existing items
  { icon: MyIcon, label: 'My Page', href: '/dashboard/my-page' },
];
```

## Connecting to Your Backend

### 1. Set API Base URL

Create or update `.env.local`:

```bash
NEXT_PUBLIC_API_BASE=http://localhost:8080
```

### 2. Implement Backend Endpoints

Your FastAPI backend needs:

- `POST /api/workflows` - Start workflow
- `GET /api/workflows/{id}/stream` - SSE events
- `GET /api/workflows/{id}/result` - Get result
- `GET /api/workflows` - Get history

See detailed API spec in [API_INTEGRATION.md](./API_INTEGRATION.md)

### 3. Disable Demo Mode

Edit `/components/dashboard/execution-panel.tsx`:

```typescript
// Change:
const [useDemoMode] = useState(true);

// To:
const [useDemoMode] = useState(false);
```

### 4. Restart Dev Server

```bash
# Ctrl+C to stop
# Then start again:
pnpm dev
```

## Debugging Tips

### View Console Logs

The app uses debug logs with `[v0]` prefix:

```typescript
console.log('[v0] Debug message:', data);
```

Open browser DevTools (F12) → Console tab to see logs.

### Check Store State

In browser console:

```javascript
// Install Redux DevTools extension first (optional)
// Or manually inspect:
window.localStorage.getItem('workflow-store') // if persisting
```

### Test API Endpoint

```bash
# Test your backend API
curl http://localhost:8080/api/workflows

# View SSE stream
curl -N http://localhost:8080/api/workflows/{execution_id}/stream
```

### Common Issues

**Issue**: Page shows "Too many re-renders"
- **Solution**: Check for infinite loops in useEffect dependencies

**Issue**: Workflow canvas doesn't show
- **Solution**: Make sure useDemoMode is true or backend is returning data

**Issue**: Events not appearing
- **Solution**: Check browser console for errors, verify SSE connection

## Project Structure Overview

```
/app                    # Next.js pages
/components             # React components
/hooks                  # Custom React hooks
/lib
  /api                  # API client
  /store                # Zustand state
  /types                # TypeScript definitions
  demo-data.ts          # Demo mode data
/public                 # Static assets
/components/ui          # shadcn/ui components
```

## Performance Optimization

The app is already optimized with:

- **Code Splitting**: Automatic by Next.js
- **Image Optimization**: Using next/image
- **Component Memoization**: React.memo on expensive components
- **Lazy Loading**: Components load on demand
- **CSS**: Tailwind JIT compilation

## Browser DevTools

### React DevTools
Install: [React DevTools Extension](https://react-devtools-tutorial.vercel.app/)

View component tree and state:
- Components tab → Navigate to component
- Inspect component state and props

### Network Tab
Monitor API calls:
- Open DevTools → Network tab
- Start workflow to see API requests
- Click request → Headers/Response to inspect

## Deployment

### To Vercel (Recommended)

```bash
# Push to GitHub
git add .
git commit -m "Initial commit"
git push origin main

# Then:
# 1. Go to vercel.com
# 2. Import your GitHub repo
# 3. Set NEXT_PUBLIC_API_BASE env var
# 4. Deploy!
```

### To Self-Hosted Server

```bash
# Build
pnpm build

# Deploy the .next folder and package.json
# Then run:
NODE_ENV=production node .next/standalone/server.js
```

## Need Help?

### Documentation Files

- **[SETUP.md](./SETUP.md)** - Complete setup guide
- **[API_INTEGRATION.md](./API_INTEGRATION.md)** - Backend API specification
- **[PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)** - Technical overview

### Code References

- **Type definitions**: `/lib/types/workflow.ts`
- **API client**: `/lib/api/workflow-client.ts`
- **State management**: `/lib/store/workflow-store.ts`
- **Custom hooks**: `/hooks/*.ts`

## Next Steps

1. **Explore the code** - Read through components to understand structure
2. **Modify the landing page** - Customize hero section and features
3. **Customize dashboard** - Change colors, layout, components
4. **Connect your API** - Follow API_INTEGRATION.md
5. **Deploy** - Push to Vercel or self-hosted server

---

Happy building! If you have questions, refer to the documentation files or check the inline code comments.
