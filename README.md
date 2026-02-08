# AxonAI

AI-powered organizational intelligence system: knowledge graph, **Shadow Council** (multi-agent advisory), **Critic Agent**, **Admin Chat**, crisis simulation, and voice synthesis. Built for hackathons with a **free-first** LLM stack (Groq default).

---

## Features

### Core

- **Knowledge graph** – Nodes (people, decisions, topics), edges, conflicts, dependencies, insights. **Dagre** layout, minimap, zoom, fit-view. Theme-aware (dark/light). Highlight nodes from “What changed today.” Crisis mode: nodes pulse and show conflicted state.
- **Shadow Council** – Multi-agent flow: **Optimist** → **Skeptic** → **Chief of Staff**. Uses **Groq** (default, Llama 3.3 70B), Gemini, OpenAI, or Anthropic; falls back to mock if no key or API failure. Voice synthesis (ElevenLabs) for Chief of Staff answers; stop button, no overlap.
- **Critic Agent** – Cross-checks new input (text or **voice notes**) against the knowledge graph; flags contradictions and suggests who to notify. Backend transcription for voice input.
- **Voice** – ElevenLabs TTS for Chief of Staff; optional pre-generated clips (intro, processing, complete) and UI sound effects. Centralized audio controller.

### Data & admin

- **Data source** – **CSV upload** (record types, edge list, node list, or freeform) or **any URL**: JSON (normalized to graph) or **any website** (HTML → graph from title + outbound links). Reset to default. Dashboard refreshes automatically.
- **Admin Chat** – Password-protected **Live Knowledge Builder**. Natural-language updates: ask questions, give updates (“We’re launching X on March 20”), or **commands** (“Mark conflict between Engineering and Marketing as resolved”). **Entity extractor** (Groq) parses intent and returns graph updates; confirm to apply. Session-based auth.

### Dashboard & UX

- **What changed today** – Narrative summary, recent decisions, ongoing/recent conflicts, affected node/edge IDs; graph highlights affected nodes.
- **My brief** – “What do I need to know?” summary: conflicts, recent decisions, who to talk to.
- **Crisis mode** – **Crisis Simulator** toggles a demo crisis; **Crisis Toast** and graph nodes (pulse, conflicted styling) reflect state. Health score can show crisis value. **Zustand** store for global crisis state.
- **Guided demo** – **Demo overlay** (e.g. 2‑minute walkthrough).
- **Context page** – Person detail view (`/context/:personId`) from graph node click.
- **Responsive UI** – Desktop and mobile; resizable panels (React Resizable Panels), scrollable areas; **dark theme** (next-themes) with optional backdrop blur.

---

## Tech stack

### Backend

| Layer | Tech |
|-------|------|
| **Runtime** | Python 3.10+ |
| **API** | FastAPI, Uvicorn, Pydantic |
| **LLM / agents** | LangChain, LangGraph, **langchain-groq** (Groq), langchain-google-genai (Gemini), langchain-openai (OpenAI); Groq SDK (entity extractor); Llama 3.3 70B (Groq default) |
| **Vector / embeddings** | ChromaDB, sentence-transformers (local, free) |
| **Data** | pandas, numpy, python-dateutil; **networkx** (graph); httpx (HTTP client) |
| **Voice** | ElevenLabs (TTS, optional transcription) |
| **Config** | python-dotenv, .env for API keys |

### Frontend

| Layer | Tech |
|-------|------|
| **Language** | TypeScript |
| **Framework** | React 18 |
| **Build** | Vite 5 |
| **Styling** | Tailwind CSS, tailwindcss-animate |
| **UI** | Radix UI (shadcn/ui), Lucide React |
| **Routing** | React Router v6 |
| **Data / state** | TanStack Query (React Query), **Zustand** (crisis mode) |
| **Graph** | **React Flow**, **dagre** (layout) |
| **Charts / viz** | Recharts (e.g. health heartbeat) |
| **Motion** | Framer Motion |
| **Theme** | next-themes (dark/light) |
| **Forms / validation** | React Hook Form, Zod, @hookform/resolvers |
| **Other** | date-fns, sonner (toast), react-resizable-panels |

### APIs & integrations

- **LLM:** Groq (default), Google Gemini, OpenAI, Anthropic (fallback order; mock if none).
- **Voice:** ElevenLabs (TTS; optional).
- **Data:** CSV upload, URL (JSON or HTML), reset; export and CSV format endpoints.

---

## Project structure

```
Hack-nation-Hackathon/
├── backend/                         # FastAPI backend
│   ├── api/
│   │   └── main.py                  # Routes, CORS, all endpoints
│   ├── agents/
│   │   ├── shadow_council.py        # Multi-agent (Groq/Gemini/OpenAI/Anthropic or mock)
│   │   ├── critic_agent.py          # Cross-checks input vs knowledge graph
│   │   └── entity_extractor.py     # NL entity extraction for Admin Chat (Groq)
│   ├── data/
│   │   ├── audio/                  # Pre-generated voice clips (optional)
│   │   ├── knowledge_graph.json
│   │   ├── mock_data.json
│   │   └── *.csv                   # Sample CSVs
│   ├── utils/
│   │   ├── knowledge_extractor.py  # Email → graph (Groq)
│   │   ├── voice_synthesis.py      # ElevenLabs TTS
│   │   └── data_loader.py           # CSV / URL → knowledge graph
│   ├── .env.example
│   ├── .env                        # API keys (gitignored)
│   └── requirements.txt
│
├── frontend/                        # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/
│   │   │   ├── axon/                # KnowledgeGraph, ShadowCouncil, TopBar,
│   │   │   │                       # ConflictList, DecisionStream, AdminChat,
│   │   │   │                       # CrisisSimulator, CrisisToast, DataSourceSheet,
│   │   │   │                       # DemoOverlay, HealthDisplay, etc.
│   │   │   └── ui/                 # shadcn/ui primitives
│   │   ├── hooks/                   # useCrisisMode, useSpeechRecognition, use-mobile
│   │   ├── lib/                     # api.ts, audioController, utils
│   │   └── pages/                   # Index, CriticAgentPage, ContextPage, TeamPage
│   ├── package.json
│   └── vite.config.ts               # Proxies /api to backend:8000
│
└── README.md
```

---

## How to run

### Prerequisites

- **Python 3.10+** (3.13 can have numpy build issues; 3.10 recommended)
- **Node.js 18+** (npm or bun)
- At least one LLM API key (**Groq** recommended – free tier, no card)

### 1. Backend

```bash
cd backend

python -m venv venv
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env (see "API keys" below). Never commit .env.

python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

On startup the backend prints which LLM is active (e.g. `Using Groq (GROQ_API_KEY)`) or that it is using mock data.

### 2. Frontend

In a **new terminal**:

```bash
cd frontend
npm install
npm run dev
```

The frontend proxies `/api` to `http://localhost:8000`; backend and frontend must both be running.

### 3. Optional: Pre-generate voice clips and sound effects

```bash
cd backend
python utils/voice_synthesis.py
```

Creates `data/audio/*.mp3` and `data/audio/sfx/*.mp3` (intro, processing, complete, UI sounds).

### 4. Dynamic data: CSV or URL

- **Data source** (Top Bar) → **Upload CSV** or paste **any URL**. Backend accepts:
  - **JSON** with `nodes`, `edges`, `decisions`, `conflicts` (or wrapped in `data`/`result`/`graph`; `vertices`→nodes, `links`→edges).
  - **Any website URL** → backend fetches HTML and builds a graph from the page title and all outbound links.
  - **CSV:** (1) record_type + columns (node, edge, decision, conflict, dependency), (2) edge list `source`/`target`, (3) node list `id`/`label`, (4) two-column (id, label), or (5) single column (one node per row). See `GET /api/data/csv-format` and sample CSVs in `backend/data/`.
- **Quick test:** Data source → paste `http://localhost:8000/api/data/export` → Load (backend must be running).

### URLs

| What         | URL                         |
|-------------|-----------------------------|
| Frontend    | http://localhost:8080       |
| Backend API | http://localhost:8000       |
| API docs    | http://localhost:8000/docs  |

---

## API keys

All keys are read from **`backend/.env`**. Use **`.env.example`** as a template. **Never commit real keys.**

| Variable              | Purpose |
|-----------------------|--------|
| **`GROQ_API_KEY`**    | **Default** LLM: Shadow Council + entity extractor (Groq, Llama 3.3 70B). [Get key](https://console.groq.com/) |
| `GEMINI_API_KEY`      | Fallback LLM (Google Gemini) |
| `OPENAI_API_KEY`      | Fallback LLM (OpenAI) |
| `ANTHROPIC_API_KEY`   | Fallback LLM (Anthropic Claude) |
| `ELEVENLABS_API_KEY`  | Voice synthesis (Chief of Staff) and optional SFX |
| `ADMIN_PASSWORD`      | Optional; Admin Chat password (default demo: see .env.example) |

**LLM order:** Groq → Gemini → OpenAI → Anthropic. First set-and-valid key is used. If none or all fail, Shadow Council uses **mock data**. Critic Agent is rule-based and does not require an API key.

---

## Groq (default LLM)

- **Why Groq:** Free tier (e.g. 500 RPM, 14,400 requests/day), fast inference, Llama 3.3 70B, no credit card.
- **Setup:** [console.groq.com](https://console.groq.com/) → API Keys → Create. Add `GROQ_API_KEY=gsk_...` to `backend/.env`.
- **Usage:** Shadow Council and entity extractor use **langchain-groq** (and Groq SDK where needed) with model `llama-3.3-70b-versatile`.

---

## Security

- **Secrets:** API keys only in **environment variables** (from `backend/.env` via python-dotenv). Not hardcoded or returned by the API.
- **`.env`:** In `.gitignore`. Do not commit `.env` or put real keys in `.env.example`.
- **API:** Errors do not expose stack traces or internal paths in responses.
- **CORS:** Set for localhost origins (e.g. 5173, 8080). For production, restrict `allow_origins` to your frontend domain (e.g. via env).
- **Production:** Use HTTPS, CORS from env, and consider rate limiting and auth for sensitive endpoints.

---

## Changelog (summary)

- **Features:** Knowledge graph (dagre, theme, crisis highlight), Shadow Council (Groq default), Critic Agent (voice + text), Admin Chat + entity extractor, Crisis mode (simulator + toast), What changed today, My brief, Data source (CSV/URL), Demo overlay, Context page, Voice (ElevenLabs, stop, no overlap).
- **Tech:** LangChain + LangGraph + langchain-groq; React Flow + dagre; Zustand (crisis); next-themes; resizable panels; optional `verify_apis.py` and workspace env settings for Cursor/VS Code.

---

## License

See repository defaults.
