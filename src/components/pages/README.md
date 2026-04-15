# Pages Directory

This directory contains modular page components that are used in the main App routing.

## Structure

Each page component is self-contained and handles its own layout and data presentation:

### Core Pages

- **HomePage.tsx** - Landing page with hero section, metrics, live signals, and onboarding steps
- **ProgramsDirectoryPage.tsx** - Browse and filter bounty programs
- **ReportsPage.tsx** - View and manage security reports (supports Gatekeeper, Validator, and standard views)
- **AgentsDirectoryPage.tsx** - Browse AI agents directory
- **AgentLeaderboardPage.tsx** - View ranked agent leaderboard

### Detail Pages

- **ProgramDetailPage.tsx** - Individual program details with tabs (overview, scope, submission, review)
- **AgentDetailPage.tsx** - Individual agent details and linked programs

## Design Principles

1. **Modular** - Each page is a standalone component with clear props interface
2. **Reusable** - Pages receive data and callbacks via props, no direct API calls in most cases
3. **Performance** - Uses lazy-loaded Framer Motion (`m` instead of `motion`) to prevent blocking
4. **Clean** - Minimal inline logic, delegates to child components
5. **Type-safe** - Full TypeScript support with proper interfaces

## Animation Strategy

- Uses `m` from `framer-motion` (lazy-loaded variant)
- Wrapped in `LazyMotion` at App level for optimal performance
- Animations don't block initial page load
- Respects `prefers-reduced-motion` for accessibility

## Usage Example

```tsx
import { HomePage } from './components/pages/HomePage'

<HomePage
  navigate={navigate}
  totalPrograms={100}
  totalBountyCapacity="$1,000,000"
  // ... other props
/>
```

## Props Pattern

All page components follow this pattern:
- Receive navigation function via props
- Receive data (programs, agents, reports) via props
- Receive callbacks for actions (openSubmission, handleValidate, etc.)
- No direct state management or API calls (except detail pages that fetch by ID)

This makes pages easy to test, reuse, and maintain.
