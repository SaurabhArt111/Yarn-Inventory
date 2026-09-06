# Yarn Inventory & Production Management System

A multi-tenant SaaS for yarn manufacturers: master data → stock entry → yarn
inventory (ledger-based) → beam production (atomic, transactional
consumption) → beam inventory → analytics → reports.

## Stack

- **Backend**: Node.js, Express, Mongoose/MongoDB, JWT (httpOnly cookies), zod validation, helmet, rate limiting
- **Frontend**: React 18, Vite, React Router, TanStack Query, Recharts

## Quick start

You need a MongoDB instance reachable from wherever you run the backend —
either **MongoDB Atlas** (free tier is fine, and is always a replica set,
which is required for the transactional guarantees described below) or a
**local MongoDB running as a single-node replica set**.

```bash
# 1. Start MongoDB (example: local replica set for full transaction support)
mongod --replSet rs0 --dbpath /path/to/data &
mongosh --eval "rs.initiate()"

# 2. Backend
cd server
cp .env.example .env        # edit MONGODB_URI if not using the default
npm install
npm run seed                # creates a dev tenant with realistic sample data
npm run dev                 # http://localhost:4000

# 3. Frontend (new terminal)
cd client
npm install
npm run dev                 # http://localhost:5173
```

Log in with the seeded accounts (all password `password123`):

| Email | Role |
|---|---|
| owner@dev-textiles.test | Owner |
| admin@dev-textiles.test | Admin |
| staff@dev-textiles.test | Staff |

Or register a brand-new workspace from `/register`.

## Verifying it end-to-end

```bash
cd server
npm test                                          # pure business-logic unit tests (no DB needed)
MONGODB_URI="mongodb://127.0.0.1:27017/yarn_erp_e2e" npm run test:e2e   # full workflow test against a real DB
```

`npm run test:e2e` exercises, against a real database, almost exactly the
workflows listed in the project brief: registration, stock → beam
consumption math (500 → 340 → 190 KG), the exact beam-weight example
(20,000 × 2,400 × 30 ÷ 9,000,000 = 160 KG), rejecting over-consumption,
**concurrent** beam creation against limited inventory (exactly one of two
racing requests must succeed), and **tenant isolation** (a manipulated
stock-entry id from another tenant is invisible and unusable).

## A note on how this was built

This project was built in a sandboxed environment with no real MongoDB
server available (no `mongod` binary, and the network policy blocks
downloading one). Everything here is real, working code written and
structurally verified in that sandbox:

- All business logic (beam weight formula, inventory ledger math, cones
  tracking, over-consumption guards) is unit tested and passing (`npm test`
  in `server/`, 17/17 passing).
- The Express server and the full Vite/React frontend both boot and were
  smoke-tested together (proxying, security headers, rate limiting, 401/404/503
  handling, validation) — see `npm run dev` in both `server/` and `client/`.
- The `server/scripts/e2e-smoke-test.js` script above was written and
  syntax-verified but **could not be executed** in that sandbox, since it
  needs a real MongoDB. Run it yourself the first time you have a database
  connected — that's the single most valuable verification step left.

If anything in that e2e run doesn't pass, that's the most useful signal for
what to fix next.

## Architecture notes

- **Multi-tenancy**: every collection has a `tenant` field; every query is
  scoped by `req.tenantId`, which comes only from the verified JWT — never
  from the client. See `server/src/middleware/auth.js`.
- **RBAC**: permission strings (e.g. `beam.create`), not hardcoded role
  checks. See `server/src/constants/permissions.js` and
  `server/src/middleware/authorize.js`.
- **Inventory**: append-only ledger (`InventoryTransaction`), never a
  mutable `remainingWeight` field. Balances (both **KG and cones**, tracked
  as two parallel dimensions) are always derived by replaying the ledger.
  See `server/src/services/inventoryService.js` and
  `server/src/utils/inventoryMath.js`.
- **Beam weight**: `(Ends × Meter × Final Denier) / 9,000,000`, calculated
  live client-side for UX and **always recalculated server-side** before
  persisting. See `calculateBeamWeightKg` in
  `server/src/utils/inventoryMath.js`, used from
  `server/src/services/beamService.js`.
- **Transactions**: beam creation + inventory consumption run inside a real
  MongoDB session/transaction (`runInTransaction` in `inventoryService.js`),
  with a logged fallback for standalone MongoDB without a replica set (dev
  convenience only — use a replica set or Atlas in production for the full
  atomicity/isolation guarantee under concurrent writes).
- **Reports**: real CSV (`json2csv`) and Excel (`exceljs`) generation, no
  screenshots or client-side hacks. See `server/src/services/reportService.js`.

## What's implemented vs. what's next

Implemented and wired end-to-end: auth/onboarding, RBAC, tenant isolation,
Quality+Shades/Party/Company masters, quality CSV/Excel import with
preview/validate/confirm, stock entries, beam production (with live weight
+ cones calculation and atomic backend consumption), beam inventory with
full traceability, dashboard, analytics (overview + quality/party/company
drill-down), reports with CSV/Excel export, staff + permissions
management, and audit logging.

Reasonable next steps if you continue building on this: password change /
account recovery flows, billing/subscription (the `Tenant.plan` field is
already there for it), email notifications for staff invites, and
splitting the frontend's single JS bundle (currently ~210KB gzipped — fine
to ship, but code-splitting by route would trim initial load further).
