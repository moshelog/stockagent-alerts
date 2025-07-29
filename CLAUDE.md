# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **full-stack StockAgent platform** consisting of a Next.js 15 trading dashboard and Node.js backend service. StockAgent processes TradingView webhook alerts and evaluates multi-condition trading strategies in real-time. The frontend displays market signals, manages strategies, and shows scoring data, while the backend handles webhook ingestion, strategy evaluation, and data persistence via Supabase.

## Development Commands

### Frontend (Next.js Dashboard)
```bash
# In project root
pnpm dev          # Start development server at http://localhost:3000
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint (Note: builds ignore lint errors via next.config.mjs)
```

### Backend (Node.js API)
```bash
# In /backend directory
npm install       # Install dependencies
npm run dev       # Start development server at http://localhost:3001
npm start         # Start production server
npm run init-db   # Initialize database schema (run init-schema.sql manually)
```

**Important**: 
- The Next.js config ignores TypeScript and ESLint errors during builds (`ignoreDuringBuilds: true`)
- Backend requires Supabase setup with environment variables in `/backend/.env`
- Database schema must be initialized manually in Supabase SQL editor

## Architecture Overview

### Core Application Structure

**App Router Layout**: Uses Next.js 15 app directory with the main dashboard at `/app/page.tsx` and settings at `/app/settings/page.tsx`.

**Data Flow Architecture**:
- **TradingView Alerts**: Webhooks sent to `POST /webhook` → stored in Supabase → strategy evaluation
- **Strategy Evaluation**: Backend checks if alert combinations complete strategies within timeframes
- **Real-time Updates**: Frontend polls `/api/score` and `/api/alerts` for live data
- **Configuration**: Strategy and alert management via REST API with Supabase persistence
- **Fallback**: Frontend includes mock data generation for development/demo purposes

### Key Data Models

**Strategy Interface** (`hooks/useConfig.ts:11-31`):
```typescript
interface Strategy {
  id: string
  name: string
  summary: string        // Display description
  rule: string          // Logic description  
  enabled: boolean
  threshold: number     // Buy/sell trigger threshold
  timeframe?: string    // Optional timeframe (e.g., "15m")
  components: Record<string, number>  // Alert weights
  performance: { netPL: number; winRate: number; maxDrawdown: number }
  alertDetails?: Array<{  // Detailed alert configuration
    id: string; name: string; weight: number; indicator: string
  }>
  ruleGroups?: any[]    // Advanced rule groups for complex strategies
}
```

**Alert System**: Four main indicator categories with weighted scoring:
- **Nautilus™**: Divergences, signals, volume indicators (16 alerts)
- **Market Core Pro™**: Order blocks, structure breaks, Fair Value Gaps (26 alerts) 
- **Market Waves Pro™**: Buy/sell signals, trend indicators (25 alerts)
- **Extreme Zones**: Premium/discount/equilibrium zones (3 alerts)

### Component Architecture

**Main Dashboard** (`app/page.tsx`):
- **Layout**: 4-column responsive grid (2 cols left, 2 cols right)
- **Left Side**: Recent alerts table + strategy manager panel
- **Right Side**: Live scoring system + available alerts panel
- **Mobile**: Accordion-based alerts panel

**Key Components**:
- `EnhancedAlertsTable`: Real-time alerts display with weight visualization
- `StrategyManagerPanel`: Strategy CRUD with manual strategy creation
- `CompactLiveScoring`: Ticker scoring and action recommendations  
- `AvailableAlertsPanel`: Alert configuration with weight adjustments

### State Management Patterns

**Configuration State**: Centralized in `useConfig` hook with optimistic updates
**Local State**: Component-level state for UI interactions and temporary data
**Data Synchronization**: Mock data generation that maintains consistency between alerts, ticker scores, and strategy completion

## Styling & Design System

**Design Tokens** (`tailwind.config.ts`):
- **Theme**: Dark mode trading interface
- **Colors**: Custom background (`#0A0F1E`, `#1E2538`), accent colors for buy/sell actions
- **Components**: shadcn/ui component system with Radix UI primitives

**Key Design Principles**:
- Professional trading interface aesthetics
- High contrast for data readability  
- Color-coded financial data (green=bullish, red=bearish)
- Responsive design with mobile-first approach

## Development Guidelines

### Adding New Features

**Strategy System**: When modifying strategies, ensure both `components` and `alertDetails` are updated synchronously. The system supports both legacy flat structures and new `ruleGroups` for complex logic.

**Alert System**: Alert weights are defined in multiple places - maintain consistency between:
- `alertConfig` state in main dashboard
- Static definitions in `handleCreateManualStrategy`  
- Configuration in `public/config.json`

**Data Generation**: Mock data in `generateSynchronizedData()` must remain synchronized - ticker alerts, scoring, and strategy completion must be mathematically consistent.

### Component Patterns

**Animation**: Framer Motion is used extensively - follow existing motion patterns for new components
**Form Handling**: React Hook Form with Zod validation (dependencies available)
**State Updates**: Use immutable update patterns for complex state objects
**Error Handling**: Graceful degradation with loading states and error boundaries

### File Organization

**Frontend Structure**:
- `/app/*` - Next.js app router pages
- `/components/*` - Reusable React components  
- `/components/ui/*` - shadcn/ui base components
- `/hooks/*` - Custom React hooks
- `/lib/*` - Utility functions
- `/public/*` - Static assets and configuration

**Backend Structure** (`/backend/`):
- `/config/database.js` - Supabase client configuration
- `/services/strategyEvaluator.js` - Strategy evaluation logic
- `/scripts/init-schema.sql` - Database schema and seed data
- `/server.js` - Express application with all endpoints

## Technical Notes

**TypeScript**: Strict mode enabled but build errors ignored in production
**Path Mapping**: `@/*` resolves to project root
**Package Manager**: Uses pnpm (lockfile present)
**Styling**: Tailwind CSS with custom design tokens and shadcn/ui integration
**Charts**: Recharts library available for data visualization
**Icons**: Lucide React for consistent iconography

## Configuration

### Frontend Configuration
**Runtime Config**: Loads from `/public/config.json` - modify this file to change alert weights, default strategies, and UI visibility settings.

### Backend Configuration  
**Environment Variables** (`/backend/.env`):
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous/public key  
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)

**Database Setup**: Run `/backend/scripts/init-schema.sql` in Supabase SQL editor to create tables and seed default alert configurations.

## Backend API Integration

**Key Endpoints**:
- `POST /webhook` - TradingView webhook receiver
- `GET /api/alerts` - Recent alerts for dashboard  
- `GET /api/score` - Latest actions and ticker scores
- `GET /api/strategies` - Strategy management
- `GET /api/health` - System health check

**Strategy Evaluation Logic**: When alerts arrive via webhook, the backend automatically evaluates all enabled strategies by checking if required alert combinations exist within the strategy timeframe. Complete strategies trigger BUY/SELL actions based on threshold values.