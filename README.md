# DataPulse — AI Data Analysis Dashboard

> Upload any CSV or Excel file. Get instant AI-powered analysis, charts, and actionable insights — powered by Claude.

## Live Demo

[datapulse-ai-mocha.vercel.app](https://datapulse-ai-mocha.vercel.app)

## Features

- 📂 Upload CSV or Excel files up to 10MB with drag-and-drop
- 🤖 Claude AI narrative analysis — plain-English insights about your data
- 📊 Auto-generated charts (bar, line, pie, doughnut) tailored to your dataset
- 📈 Key metrics extraction with trend arrows (↑↓→)
- 💡 4 actionable recommendations per analysis
- 💬 Ask follow-up questions about your data in natural language
- 📄 Downloadable executive summary report (.txt)
- 🗂️ Full analysis history dashboard with search and time filters
- ✨ One-click demo with a realistic sales dataset

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| AI Model | Claude Haiku 4.5 (Anthropic) |
| Database | Supabase (PostgreSQL) |
| Charts | Chart.js + react-chartjs-2 |
| CSV Parsing | papaparse |
| Excel Parsing | xlsx |
| Styling | Tailwind CSS v4 |
| Fonts | Geist + JetBrains Mono |
| Deploy | Vercel |

## Architecture

```mermaid
graph LR
  A["User uploads CSV/Excel"] --> B["/api/analyze"]
  B --> C["lib/parser.ts"]
  C --> D["Claude Haiku 4.5"]
  D --> E["dp_analyses (Supabase)"]
  E --> F["/analysis/id page"]
  F --> G["/api/qa chat"]
  F --> H["/api/report download"]
  I["/history page"] --> J["/api/analyses"]
```

## Local Setup

```bash
# 1. Clone the repo
git clone https://github.com/WarRinOP/datapulse-ai.git
cd datapulse-ai

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.local.example .env.local
# Fill in your Supabase + Anthropic API keys

# 4. Run dev server
npm run dev
# Open http://localhost:3000
```

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude |
| `DEMO_MODE` | Set to `true` to block analysis deletion |
| `ADMIN_SECRET` | Secret code for admin bypass (unlimited analyses) |

## Database Schema

Three tables with `dp_` prefix (shared Supabase instance):

```sql
dp_analyses      -- stores analysis results from Claude
dp_qa_messages   -- stores Q&A conversation history
dp_sessions      -- tracks session usage for rate limiting
```

## Deployment (Vercel)

1. Connect `github.com/WarRinOP/datapulse-ai` to Vercel
2. Add the 6 environment variables in Vercel dashboard
3. Deploy — no build configuration needed

---

Built by **Abrar Tajwar Khan** · Available for custom AI development on [Fiverr](https://fiverr.com)
