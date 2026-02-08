# Aetheris / AxonAI

AI-powered organizational intelligence system with a knowledge graph, Shadow Council (multi-agent advisory), Critic Agent, and voice synthesis.

## Project Structure

```
Hack-nation-Hackathon/
├── backend/                    # FastAPI backend
│   ├── api/
│   │   └── main.py             # API routes, CORS, endpoints
│   ├── agents/
│   │   ├── shadow_council.py   # Multi-agent flow (Optimist → Skeptic → Chief of Staff)
│   │   └── critic_agent.py     # Cross-checks input vs knowledge graph
│   ├── data/
│   │   ├── audio/              # Pre-generated voice clips (intro, processing, complete)
│   │   ├── knowledge_graph.json
│   │   ├── mock_data.json
│   │   └── rich_knowledge_graph.json
│   ├── utils/
│   │   ├── knowledge_extractor.py
│   │   └── voice_synthesis.py  # ElevenLabs TTS
│   ├── .env.example
│   ├── .env                    # Your API keys (create from .env.example)
│   └── requirements.txt
│
├── frontend/                   # React + Vite + Tailwind
│   ├── src/
│   │   ├── components/
│   │   │   └── axon/           # Knowledge graph, Shadow Council, conflicts, etc.
│   │   ├── pages/              # Index, TeamPage, CriticAgentPage
│   │   └── lib/
│   │       └── api.ts          # API client
│   ├── package.json
│   └── vite.config.ts          # Proxies /api to backend:8000
│
└── README.md
```

## How to Run

### Prerequisites

- Python 3.10+
- Node.js 18+ (or npm/bun)
- (Optional) API keys for OpenAI, ElevenLabs, Gemini, or Anthropic

### 1. Backend

```bash
cd backend

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy env template and add your keys
cp .env.example .env
# Edit .env: OPENAI_API_KEY, ELEVENLABS_API_KEY, etc.

# Start API server (port 8000)
python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

The backend will load the knowledge graph and print which LLM is active (OpenAI, Gemini, Anthropic, or mock).

### 2. Frontend

In a **new terminal**:

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (port 8080)
npm run dev
```

The frontend proxies `/api` to `http://localhost:8000`, so both must be running.

### 3. Optional: Pre-generate voice clips

For intro/processing/complete audio (ElevenLabs):

```bash
cd backend
python utils/voice_synthesis.py
```

### URLs

- Frontend: http://localhost:8080
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

### API Keys

| Key | Purpose |
|-----|---------|
| `OPENAI_API_KEY` | Shadow Council (preferred LLM) |
| `GEMINI_API_KEY` | Fallback LLM |
| `ANTHROPIC_API_KEY` | Fallback LLM |
| `ELEVENLABS_API_KEY` | Voice synthesis for Chief of Staff |

If no LLM key is set or APIs fail, the backend uses mock data. The Critic Agent uses rule-based logic and does not require an API key.
