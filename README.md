# DataPulse — AI Data Analysis Dashboard

> Upload CSV or Excel → Claude AI analyzes → instant charts, narrative insights, and executive summary report.

Built by **Abrar Tajwar Khan** as a Fiverr portfolio project demonstrating full-stack AI integration.

---

## What It Does

1. **Upload** any CSV or Excel file (up to 10MB)
2. **Claude AI** reads and analyzes the data — identifying trends, anomalies, and key metrics
3. **Auto-Charts** render automatically based on what Claude recommends
4. **Q&A Panel** — ask follow-up questions in plain English
5. **Download** an executive summary report as `.txt`
6. **History** — every analysis saved with full history dashboard

## Demo Scenario

Upload a sales CSV (date, region, product, units, revenue, returns) → Claude identifies performance drops and highlights → bar + line charts render → download report → ask "which region performed best in Q1?"

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Supabase (PostgreSQL) |
| AI | Claude API (claude-3-5-haiku-latest) |
| Charts | Chart.js + react-chartjs-2 |
| CSV Parsing | papaparse |
| Excel Parsing | xlsx |
| Deployment | Vercel |

## Architecture

```mermaid
graph LR
    A[User uploads CSV/Excel] --> B[/api/analyze]
    B --> C[parser.ts - parse + stats]
    C --> D[claude.ts - AI analysis]
    D --> E[Supabase dp_analyses]
    E --> F[Dashboard renders]
    F --> G[Q&A via /api/qa]
    F --> H[Report via /api/report]
```

## Database Tables

All tables use `dp_` prefix (shared Supabase project):

- **dp_analyses** — stores parsed data, Claude's analysis, chart configs
- **dp_qa_messages** — Q&A chat history per analysis

## Setup

```bash
# Clone and install
git clone https://github.com/abrartajwar/datapulse-ai.git
cd datapulse-ai
npm install

# Set environment variables
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, 
# SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY

# Run dev server
npm run dev
```

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key |

## Build Phases

- [x] **Phase 1** — Foundation (scaffold, libs, tables, base UI)
- [ ] **Phase 2** — Analysis Engine (API routes)
- [ ] **Phase 3** — Main UI (upload → analyze → charts)
- [ ] **Phase 4** — History Dashboard
- [ ] **Phase 5** — Polish + Deploy

---

*DataPulse is a portfolio project by Abrar Tajwar Khan.*
