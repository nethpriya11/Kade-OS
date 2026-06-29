# Kadé OS

Restaurant management system built with React, TypeScript, Supabase, and Vite.

## Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS, Zustand, Recharts, Framer Motion
- **Backend:** Supabase (PostgreSQL, Auth, Realtime), Vercel Serverless Functions
- **AI:** Gemini API via Vercel Serverless proxy
- **Tooling:** Vite, ESLint, Vitest, Testing Library
- **PWA:** vite-plugin-pwa with Workbox (offline support, Supabase API caching)

## Setup

### Prerequisites

- Node.js 18+
- npm
- Supabase project (free tier works)
- Google Gemini API key (free tier available)

### Environment

Copy `.env.example` to `.env` and fill in:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

> **Security:** The Gemini API key lives server-side in the Vercel Serverless Function at `api/kitchen-assistant.js`. Never expose it to the client.

### Install & Run

```bash
npm install
npm run dev        # dev server at http://localhost:5173
npm run build      # production build
npm run lint       # ESLint
npm run test       # Vitest
npm run test:watch # Vitest watch mode
npm run preview    # preview production build
```

For Vercel deployment, the `vercel.json` rewrites `/api/(.*)` to the Serverless Function.

## Project Structure

```
api/
  kitchen-assistant.js     # Gemini API proxy (Vercel Serverless)
src/
  components/              # React components (all TypeScript)
  lib/
    supabase.ts            # Typed Supabase client
    gemini.ts              # Gemini API client
  pages/                   # Route pages (all TypeScript)
  store/                   # Zustand stores (all TypeScript)
  test/                    # Vitest test files
  utils/                   # Utility functions
  vite-env.d.ts
schema.sql                 # Database schema (single source of truth)
enable_rls_policies.sql    # Row-level security policies
vercel.json                # Vercel deployment config
```

## Database

`schema.sql` is the single source of truth. It contains all tables, functions, triggers, default data, and seed data.

### Key tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles linked to Supabase Auth |
| `menu_items` | Restaurant menu |
| `orders` | Customer orders |
| `order_items` | Line items within orders |
| `inventory` | Ingredient stock |
| `inventory_logs` | Inventory change tracking |
| `suppliers` | Ingredient suppliers |
| `shifts` | Staff shifts |
| `expenses` | Business expenses |
| `tables` | Table management |
| `procurement_orders` | Procurement requests |
| `wastage_records` | Waste tracking |
| `notifications` | System notifications |

### Versioning

Schema version is tracked via `public.schema_version`. Run migrations in order.

## Features

- **POS System**: Create and manage orders with a point-of-sale interface
- **Inventory Management**: Track ingredient stock, automated low-stock alerts
- **Kitchen Display**: Realtime order display for kitchen staff
- **AI Assistant**: Gemini-powered kitchen assistant and ingredient category prediction
- **Procurement**: Generate procurement orders based on inventory thresholds
- **Analytics & Reports**: Revenue, profit/loss, inventory analytics with Recharts
- **Staff Management**: Role-based access control (admin, chef, cashier, etc.)
- **Offline Support**: PWA with offline queue for orders
- **Notifications**: Realtime notifications via Supabase Realtime
- **Shift Management**: Staff shift scheduling and tracking
- **Wastage Tracking**: Record and analyze ingredient waste

## Testing

Tests use Vitest with Testing Library and jsdom:

```bash
npm run test
```

Test files mirror the source structure under `src/test/`.

## Deployment

1. Push to GitHub (or your Git provider)
2. Import into Vercel
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel environment variables
4. Set `GEMINI_API_KEY` in Vercel environment variables (for the Serverless Function)
5. Deploy — the `vercel.json` handles API rewrites automatically

## Development

All components and pages use TypeScript. The project was incrementally migrated from JavaScript.

### Code style

- No comments in production code
- Tailwind CSS for styling
- Zustand for state management
- Lucide React for icons
- sonner for toast notifications
