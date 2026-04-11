# GreenLIMS KSA Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains the GreenLIMS KSA SaaS frontend — a production-ready Laboratory Information Management System for Saudi Arabia.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5 (api-server, not used by frontend)
- **Database**: PostgreSQL + Drizzle ORM (provisioned but not used by frontend)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **Frontend**: React + Vite + TypeScript + Tailwind CSS v4 + shadcn/ui
- **Routing**: Wouter
- **Charts**: Recharts
- **State**: React Context (AppContext)
- **Theme**: next-themes (dark/light)
- **Animation**: framer-motion

## Artifacts

### GreenLIMS KSA (`artifacts/greenlims-ksa/`)
- **Type**: react-vite, served at `/`
- **Purpose**: Full SaaS LIMS frontend with mock data (no backend required)
- **Features**:
  - Role-based UI: Admin, Lab Manager, Analyst, Client, Accountant
  - Arabic (RTL) + English (LTR) language toggle
  - Dark + Light mode
  - All Saudi lab mock data (Al-Marai, Saudi Aramco, Ajmal Perfumes, etc.)

### Pages
- `/login` — Authentication with demo role selector
- `/register`, `/forgot-password`, `/otp-verify` — Auth flow
- `/dashboard` — Role-based KPI cards + Recharts
- `/samples` — Sample management table
- `/samples/:id` — Sample detail + Chain of Custody timeline
- `/workflow` — Kanban board (Received → Testing → Approved)
- `/clients` — Client management
- `/reports` + `/reports/:id` — COA (Certificate of Analysis)
- `/inventory` — Reagent management with alerts
- `/invoices` + `/invoices/:id` — ZATCA-ready tax invoices (SAR, 15% VAT)
- `/analytics` — Analytics dashboard
- `/admin` — SaaS Admin panel (Tenants, Plans, Feature Flags)
- `/client-portal` — Client-facing portal
- `/settings` — App settings

### Mock Data
Located in `artifacts/greenlims-ksa/src/mock-data/`:
- `clients.ts` — Saudi companies (Al-Marai, Aramco, Ajmal, etc.)
- `samples.ts` — 20 realistic lab samples
- `analysts.ts` — 5 analysts with Arabic names
- `invoices.ts` — ZATCA-ready invoices in SAR
- `reagents.ts` — Lab reagent inventory
- `reports.ts` — COA reports
- `tenants.ts` — Multi-tenant SaaS data
- `sampleTypes.ts` — Sample type + test mappings

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/greenlims-ksa run dev` — run frontend locally

## API Server (Not Used by Frontend)

The `api-server` artifact serves at `/api`. The frontend is 100% mock-data-driven and does not make API calls.
