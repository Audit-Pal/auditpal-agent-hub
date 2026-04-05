# AuditPal Backend — Implementation Plan

## Overview

Build a production-grade REST API back-end for the AuditPal security-research platform.
Stack: **Bun runtime · TypeScript · Hono (HTTP framework) · Drizzle ORM · PostgreSQL (Docker) · Zod**.

The API is designed to replace/back the current in-memory mock (`platformMock.ts`) and give the React front-end real persistence, auth, and filtering.

---

## Directory layout (new folder: `server/`)

```
server/
├── Dockerfile
├── package.json
├── tsconfig.json
├── .env.example
├── drizzle.config.ts
├── src/
│   ├── index.ts                  # Hono app entry
│   ├── db/
│   │   ├── connection.ts
│   │   ├── schema/
│   │   │   ├── users.ts
│   │   │   ├── programs.ts
│   │   │   ├── agents.ts
│   │   │   ├── reports.ts
│   │   │   └── index.ts
│   │   └── seed.ts
│   ├── schemas/                  # Zod validation schemas
│   │   ├── auth.schema.ts
│   │   ├── program.schema.ts
│   │   ├── agent.schema.ts
│   │   └── report.schema.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   └── errorHandler.ts
│   └── routes/
│       └── v1/
│           ├── index.ts
│           ├── auth.routes.ts
│           ├── programs.routes.ts
│           ├── agents.routes.ts
│           ├── reports.routes.ts
│           └── metrics.routes.ts
docker-compose.yml
```

---

## Database Schema (Drizzle + PostgreSQL)

### Core tables

| Table | Purpose |
|---|---|
| `users` | Platform accounts (researchers, program owners, admins) |
| `programs` | Bug bounty / audit programs |
| `program_categories` | M2M: program ↔ category enum |
| `program_platforms` | M2M: program ↔ blockchain platform |
| `program_languages` | M2M: program ↔ language |
| `scope_targets` | Each in-scope asset for a program |
| `reward_tiers` | Critical/High/Medium/Low reward rows per program |
| `triage_stages` | Ordered triage flow steps per program |
| `policy_sections` | Policy section text items per program |
| `linked_agents` | Many-to-many program ↔ agent (with purpose/trigger/output) |
| `agents` | AI triage agents |
| `agent_metrics` | KPIs per agent |
| `agent_tools` | Tool capabilities per agent |
| `agent_executions` | Recent execution snapshots |
| `reports` | Researcher vulnerability submissions |
| `report_evidence` | Evidence files/fields per report |

---

## API Routes — `/api/v1`

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Create researcher account |
| POST | `/api/v1/auth/login` | Issue JWT |
| GET | `/api/v1/auth/me` | Current user profile |

### Programs
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/programs` | List programs (filter: kind, category, platform, search; sort: bounty, recent, name) |
| GET | `/api/v1/programs/:id` | Full program detail |
| POST | `/api/v1/programs` | Create program (admin) |
| PATCH | `/api/v1/programs/:id` | Update program (admin) |

### Reports
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/reports` | List own reports (researcher) or all (admin) |
| GET | `/api/v1/reports/:id` | Report detail |
| POST | `/api/v1/reports` | Submit new report |
| PATCH | `/api/v1/reports/:id/status` | Update triage status (admin) |

### Agents
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/agents` | List agents (sort by rank) |
| GET | `/api/v1/agents/:id` | Agent detail |

### Metrics
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/metrics` | Platform-level stats (program count, total bounty, queue size) |

---

## Key Design Decisions

- **Hono** — ultra-light, Bun-native, typed routing
- **Drizzle ORM** — SQL-first, full TypeScript inference, no magic
- **Zod** — validation on all route inputs; returned types are inferred from DB schema
- **JWT auth** — `jose` library; access token only for now (stateless)
- **API versioning** — prefix-based `/api/v1/`; future `/api/v2/` can co-exist
- **Docker Compose** — two services: `postgres:16` and `auditpal-api` (Bun)
- **Seed script** — imports the existing `platformMock.ts` data and upserts it on first boot

---

## Verification Plan

### Automated (curl smoke tests after `docker compose up`)
```bash
# 1. Health check
curl http://localhost:3001/health

# 2. Register a user
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@auditpal.io","password":"Test1234!","name":"Researcher"}'

# 3. Login and grab token
TOKEN=$(curl -sX POST http://localhost:3001/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@auditpal.io","password":"Test1234!"}' | jq -r .token)

# 4. List programs (seeded)
curl http://localhost:3001/api/v1/programs -H "Authorization: Bearer $TOKEN"

# 5. Submit a report
curl -X POST http://localhost:3001/api/v1/reports \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "programId": "atlas-bridge-smart-contracts",
    "title": "Test finding",
    "severity": "Medium",
    "target": "atlas-router",
    "summary": "Test",
    "impact": "Minor",
    "proof": "Steps...",
    "reporter": "test@auditpal.io"
  }'

# 6. List own reports
curl http://localhost:3001/api/v1/reports -H "Authorization: Bearer $TOKEN"

# 7. Metrics
curl http://localhost:3001/api/v1/metrics -H "Authorization: Bearer $TOKEN"
```

> [!NOTE]
> `jq` must be installed for the token capture step.

### Validation failures (Zod)
```bash
# Should return 422 with field errors
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"not-an-email","password":"short"}'
```
