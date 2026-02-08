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
│   │   └── voice_synthesis.py     # ElevenLabs TTS
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

### 3. Optional: pre-generated voice clips

For intro/processing/complete audio (ElevenLabs):

```bash
cd backend
python utils/voice_synthesis.py
```

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
