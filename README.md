# AxonAI

AI-powered organizational intelligence system: knowledge graph, **Shadow Council** (multi-agent advisory), **Critic Agent**, and voice synthesis. Built for hackathons with a **free-first** LLM stack (Groq default).

---

## Features

- **Knowledge graph** – Nodes (people, decisions, topics), edges, conflicts, dependencies, insights. Resizable dashboard with minimap and zoom.
- **Shadow Council** – Multi-agent flow: **Optimist** → **Skeptic** → **Chief of Staff**. Uses Groq (default), Gemini, OpenAI, or Anthropic; falls back to mock if no key or API failure.
- **Critic Agent** – Cross-checks new input (e.g. voice notes) against the knowledge graph; flags contradictions and suggests who to notify.
- **Voice** – ElevenLabs TTS for Chief of Staff responses; stop button, no overlap. Optional pre-generated clips (intro, processing, complete).
- **Responsive UI** – Works on desktop and mobile; scrollable, resizable panels; dark theme with backdrop blur (Safari-compatible).

---

## Project structure
```
Hackathon/
├── backend/                    # FastAPI backend
│   ├── api/
│   │   └── main.py             # API routes, CORS, endpoints
│   ├── agents/
│   │   ├── shadow_council.py   # Multi-agent (Groq/Gemini/OpenAI/Anthropic or mock)
│   │   └── critic_agent.py     # Cross-checks input vs knowledge graph
│   ├── data/
│   │   ├── audio/              # Pre-generated voice clips (optional)
│   │   ├── knowledge_graph.json
│   │   ├── mock_data.json
│   │   └── rich_knowledge_graph.json
│   ├── utils/
│   │   ├── knowledge_extractor.py  # Builds graph (uses Gemini)
│   │   ├── voice_synthesis.py      # ElevenLabs TTS
│   │   └── data_loader.py          # CSV / URL → knowledge graph
│   ├── .env.example            # Template – copy to .env and add keys
│   ├── .env                    # Your API keys (gitignored – do not commit)
│   └── requirements.txt
│
├── frontend/                   # React + Vite + Tailwind
│   ├── src/
│   │   ├── components/axon/    # Knowledge graph, Shadow Council, TopBar, etc.
│   │   ├── pages/              # Index (dashboard), etc.
│   │   └── lib/                # api.ts, audioController
│   ├── package.json
│   └── vite.config.ts          # Proxies /api to backend:8000
│
└── README.md
```

---

## How to run

### Prerequisites

- **Python 3.10+** (3.13 can have numpy build issues; 3.10 recommended)
- **Node.js 18+** (npm or bun)
- At least one LLM API key (Groq recommended – free tier, no card required)

### 1. Backend
```bash
cd backend

# Virtual environment (recommended)
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Environment: copy template and add your keys
cp .env.example .env
# Edit .env (see "API keys" below). Never commit .env.

# Start API (port 8000)
python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

On startup the backend prints which LLM is active (e.g. `Using Groq (GROQ_API_KEY) [default]`) or that it is using mock data.

### 2. Frontend

In a **new terminal**:
```bash
cd frontend

npm install
npm run dev
```

The frontend proxies `/api` to `http://localhost:8000`, so backend and frontend must both be running.

### 3. Optional: Pre-generate voice clips and sound effects

For intro/processing/complete audio and button-click sound effects (ElevenLabs):
```bash
cd backend
python utils/voice_synthesis.py
```

This creates `data/audio/*.mp3` (intro, processing, complete) and `data/audio/sfx/*.mp3` (UI sounds).

### 4. Dynamic data: any admin URL or any CSV

The app uses **synthetic** data by default. You can use **any admin URL** or **any CSV**; the backend processes it and builds the graph, and the dashboard updates automatically.

- **Data source** (Top Bar) → **Upload CSV**: Accepts (1) **record_type** + columns (node, edge, decision, conflict, dependency); (2) **edge list**: `source` + `target` (or `from`/`to`); (3) **node list**: `id` + `label` or `name`; (4) **any 2 columns** (first = id, second = label); (5) **single column** (each value = one node). Example full CSVs (nodes with team/role, edges, decisions, conflicts): `backend/data/full_tech_startup.csv`, `full_retail_ops.csv`, `full_healthcare_team.csv`, `full_agency_projects.csv`, `full_education_org.csv`. See `GET /api/data/csv-format` for details.
- **Admin page URL**: Paste **any** URL. If it returns JSON (nodes/edges or wrapped), the backend normalizes it. If it's **any website** (e.g. `https://nstp.pk`), the backend fetches the HTML and builds a graph from the page title and all outbound links (page → linked URLs). The graph and dashboard then use the new data.

**Where do I get the URL? (and how)**

| Source | Where | How |
|--------|--------|-----|
| **This dashboard's backend** | Your running API | 1. Start the backend (`uvicorn` on port 8000). 2. Use URL: `http://localhost:8000/api/data/export`. 3. In the app: **Data source** → paste that URL → click Load. This reloads the current graph (useful to test the flow). |
| **Your own admin API** | Another service you run or host | 1. Expose an HTTP GET endpoint that returns JSON with `nodes`, `edges`, `decisions`, `conflicts` (see `GET /api/data/export` response shape). 2. Use that endpoint's full URL (e.g. `https://your-api.com/graph`). 3. In the app: **Data source** → paste URL → Load. |
| **Static JSON file** | Any URL that serves JSON | 1. Create a `.json` file in the same shape (nodes, edges, decisions, conflicts, etc.). 2. Host it somewhere reachable (e.g. GitHub raw, S3, or a simple static server). 3. Use the file's public URL in **Data source** → Load. |

**Quick test:** With the backend running, open **Data source** in the Top Bar, paste `http://localhost:8000/api/data/export`, click the link button. The dashboard will refetch and show the same data.

**Websites you can use to get a URL** (host your own JSON in the dashboard's format):

| Website | URL | How to get a URL |
|--------|-----|-------------------|
| **GitHub Gist** | https://gist.github.com | 1. Copy your graph JSON (e.g. from `GET http://localhost:8000/api/data/export`). 2. New Gist → paste JSON, name file `graph.json`. 3. Create public gist → click "Raw" → copy that URL. Use that raw URL in Data source. |
| **JSONBin.io** | https://jsonbin.io | 1. Sign up (free). 2. Create a new bin, paste JSON from `/api/data/export`. 3. Save and use the bin's API URL (e.g. `https://api.jsonbin.io/v3/b/<bin-id>`) in Data source. |
| **Pastebin** | https://pastebin.com | 1. Paste your JSON. 2. Set expiration (e.g. 1 month). 3. Create paste → use **raw** URL (e.g. `https://pastebin.com/raw/xxxxx`) in Data source. |
| **GitHub repo (raw)** | https://github.com | 1. Put a `graph.json` (or any name) in a repo. 2. Use raw URL: `https://raw.githubusercontent.com/<user>/<repo>/<branch>/graph.json`. |
| **Netlify / Vercel** | https://netlify.com or https://vercel.com | Deploy a static site with a `graph.json` file; your URL is `https://your-site.com/graph.json`. |
| **This backend (local)** | — | `http://localhost:8000/api/data/export` (backend must be running). |
| **This backend (deployed)** | Your host | Same path on your deployed API, e.g. `https://your-api.onrender.com/api/data/export`. |

The backend normalizes responses (unwrap `data`/`result`/`graph`, map `vertices`→nodes, `links`→edges). Ideal shape: top-level `nodes`, `edges`, `decisions`, `conflicts` (see `GET /api/data/export`).

After you upload a CSV or load from a URL, the dashboard refreshes automatically and all panels (graph, conflicts, decisions, health) show the new data.

### URLs

| What        | URL                        |
|------------|----------------------------|
| Frontend   | http://localhost:8080      |
| Backend API| http://localhost:8000       |
| API docs   | http://localhost:8000/docs |

---

## API keys

All keys are read from **`backend/.env`**. The repo includes **`.env.example`** with placeholders only. **Never commit real keys.**

| Variable             | Purpose |
|----------------------|--------|
| **`GROQ_API_KEY`**   | **Default** LLM for Shadow Council (Groq – Llama 3.3 70B). Free tier: 500 RPM, no card required. [Get key](https://console.groq.com/) |
| `GEMINI_API_KEY`     | Fallback LLM (Google Gemini) |
| `OPENAI_API_KEY`     | Fallback LLM (OpenAI) |
| `ANTHROPIC_API_KEY`  | Fallback LLM (Anthropic Claude) |
| `ELEVENLABS_API_KEY` | Voice synthesis for Chief of Staff |

**LLM order:** Groq → Gemini → OpenAI → Anthropic. The first key that is set and valid is used. If none are set or all fail, the backend uses **mock data** for the Shadow Council. The Critic Agent is rule-based and does not need an API key.

---

## Groq (default LLM)

- **Why Groq:** Free tier (e.g. 500 RPM, 14,400 requests/day), very fast inference, Llama 3.3 70B, no credit card.
- **Setup:** Sign up at [console.groq.com](https://console.groq.com/) → API Keys → Create key. Add `GROQ_API_KEY=gsk_...` to `backend/.env`.
- **Implementation:** The backend uses the official **`groq`** SDK (no `langchain-groq`) to avoid dependency conflicts with `langchain-core` 0.3.x. A small wrapper in `shadow_council.py` adapts Groq to the existing LangChain-style `invoke(messages)` interface.

---

## Security

- **Secrets:** All API keys live in **environment variables** (loaded from `backend/.env` via `python-dotenv`). No keys are hardcoded or returned by any API.
- **`.env`:** Listed in `.gitignore`. Do not commit `.env` or put real keys in `.env.example`.
- **API:** Error responses do not expose stack traces or internal paths; details are logged server-side only.
- **CORS:** Configured for localhost origins (e.g. 5173, 8080). For production, restrict `allow_origins` to your frontend domain (e.g. via env).
- **Production:** Use HTTPS, set CORS from env, consider rate limiting and auth for sensitive endpoints.

---

## Changelog (summary)

- **Shadow Council:** Groq as default LLM (Llama 3.3 70B); fallback order Groq → Gemini → OpenAI → Anthropic; mock data when no key or API failure.
- **Voice:** Centralized audio controller; stop button; no overlap; only synthesized speech after council response.
- **Dashboard:** Resizable panels; scrollable main area; responsive layout (mobile and desktop).
- **Knowledge graph:** Node status box; minimap (small, bottom-right); zoom controls; fitView padding; dark theme; Safari `-webkit-backdrop-filter` for blur.
- **APIs:** Optional `backend/verify_apis.py` to check keys and hit council + synthesize endpoints.
- **Env:** Workspace setting `python.terminal.useEnvFile` and `python.envFile` (`.vscode/settings.json`) so the terminal can use `backend/.env` in Cursor/VS Code.

---

## License

See repository defaults.