"""
FastAPI backend serving the knowledge graph and AI agents
Powered by Groq
"""

import json
import sys
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv

# Load backend .env first so GROQ_API_KEY is set before agents are imported
_backend_dir = Path(__file__).resolve().parent.parent
load_dotenv(_backend_dir / ".env")

import httpx

from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel

sys.path.insert(0, str(_backend_dir))

# Import triggers Groq LLM init for Shadow Council
from agents.shadow_council import query_shadow_council
from agents.critic_agent import run_critic_agent
from utils.voice_synthesis import generate_voice, transcribe_audio
from utils.data_loader import parse_csv_to_graph, fetch_graph_from_url

app = FastAPI(
    title="Aetheris API",
    description="AI-powered organizational intelligence system",
    version="1.0.0",
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

knowledge_graph: dict = {}
data_source: dict = {"source": "synthetic", "url": None}  # source: synthetic | csv | url


@app.on_event("startup")
async def load_data():
    """Load knowledge graph on API startup"""
    global knowledge_graph

    backend_dir = Path(__file__).resolve().parent.parent
    kg_path = backend_dir / "data" / "knowledge_graph.json"
    mock_path = backend_dir / "data" / "mock_data.json"

    try:
        path = kg_path if kg_path.exists() else mock_path
        with open(path, "r") as f:
            knowledge_graph = json.load(f)

        print("\n" + "=" * 60)
        print("✅ AETHERIS API STARTED")
        print("=" * 60)
        print("Knowledge graph loaded successfully")
        print(f"  Nodes: {len(knowledge_graph.get('nodes', []))}")
        print(f"  Edges: {len(knowledge_graph.get('edges', []))}")
        print(f"  Decisions: {len(knowledge_graph.get('decisions', []))}")
        print(f"  Conflicts: {len(knowledge_graph.get('conflicts', []))}")
        print("=" * 60)
        print("🚀 API ready at http://localhost:8000")
        print("📚 Docs at http://localhost:8000/docs")
        print("=" * 60 + "\n")

    except FileNotFoundError:
        print("\n⚠️  WARNING: Knowledge graph not found!")
        print("💡 Run 'python utils/knowledge_extractor.py' first to generate it")
        knowledge_graph = {
            "nodes": [],
            "edges": [],
            "decisions": [],
            "conflicts": [],
            "dependencies": [],
            "insights": [],
        }


# API Models
class VoiceQuery(BaseModel):
    question: str


class CouncilResponse(BaseModel):
    question: str
    optimist_view: str
    skeptic_view: str
    final_answer: str
    reasoning_trace: list


class HealthScore(BaseModel):
    score: int
    total_conflicts: int
    ongoing_conflicts: int
    high_severity_conflicts: int
    timestamp: str


# Root endpoint
@app.get("/")
async def root():
    """API status and info"""
    return {
        "status": "online",
        "service": "Aetheris Intelligence API",
        "version": "1.0.0",
        "powered_by": "Groq (default) / Gemini / OpenAI / Anthropic",
        "endpoints": {
            "graph": "/api/graph",
            "conflicts": "/api/conflicts",
            "decisions": "/api/decisions",
            "dependencies": "/api/dependencies",
            "insights": "/api/insights",
            "health": "/api/health",
            "council": "/api/council/query",
            "critic": "/api/critic/analyze",
            "suggestions": "GET /api/suggestions",
            "stats": "/api/stats",
            "audio": "/api/audio/{intro|processing|complete}",
            "audio_synthesize": "/api/audio/synthesize",
            "audio_transcribe": "/api/audio/transcribe",
            "audio_sfx": "/api/audio/sfx/click",
            "data_source": "GET/POST /api/data/source",
            "data_reset": "POST /api/data/reset",
            "data_upload": "POST /api/data/upload",
            "data_csv_format": "GET /api/data/csv-format",
        },
    }


def _build_suggestions_from_graph(kg: dict) -> dict:
    """
    Build Chief of Staff questions and Critic Agent example inputs from current graph.
    Varies by data source: CSV (teams, topics, conflicts) or URL (domains, links).
    """
    nodes = kg.get("nodes") or []
    edges = kg.get("edges") or []
    decisions = kg.get("decisions") or []
    conflicts = kg.get("conflicts") or []

    teams = list(dict.fromkeys(n.get("team") for n in nodes if isinstance(n, dict) and n.get("team")))
    topics = [n.get("label") for n in nodes if isinstance(n, dict) and n.get("type") == "topic" and n.get("label")]
    people = [n.get("label") for n in nodes if isinstance(n, dict) and n.get("type") == "person" and n.get("label")]
    conflict_pairs = [
        (c.get("team1"), c.get("team2"), c.get("topic"))
        for c in conflicts
        if isinstance(c, dict) and (c.get("team1") or c.get("team2"))
    ]
    decision_titles = [d.get("title") for d in decisions if isinstance(d, dict) and d.get("title")]

    # Detect URL-style graph (many "Outbound link" conflicts or domain-like labels)
    is_url_style = (
        len(conflicts) > 3
        and all(str(c.get("topic") or "").lower() == "outbound link" for c in conflicts[:3] if isinstance(c, dict))
    ) or (topics and any("/" in str(t) or "." in str(t) for t in topics[:5]))

    council_questions = []
    critic_examples = []

    if is_url_style:
        # Suggestions for URL/scraped data (pages, links)
        council_questions = [
            "What are the main themes or connections in this data?",
            "What might be the biggest risks or gaps here?",
            "How would you prioritize or summarize these links?",
            "What patterns or clusters do you see?",
            "What should we focus on first?",
        ]
        critic_examples = [
            "Someone said the main page has changed. Please verify.",
            "New info: one of the linked sites is down.",
            "Meeting note: we need to update the link list.",
            "Voice note: the homepage content was revised.",
        ]
    else:
        # Suggestions from org graph (teams, topics, conflicts, decisions)
        if topics:
            t = topics[0]
            council_questions.append(f"What are the biggest risks to {t}?")
            council_questions.append(f"What dependencies could block {t}?")
            critic_examples.append(f"The manager just said the deadline for {t} is Friday. Please update the team.")
        if len(topics) > 1:
            council_questions.append(f"Should we prioritize {topics[0]} or {topics[1]}?")
        if conflict_pairs:
            c1, c2, topic = conflict_pairs[0][0], conflict_pairs[0][1], conflict_pairs[0][2] or "this"
            council_questions.append(f"What conflicts should I be aware of between {c1} and {c2}?")
            critic_examples.append(f"Meeting summary: {c1} and {c2} agreed on {topic}. Please align records.")
        if teams:
            council_questions.append(f"Where do we have alignment gaps between {teams[0]}" + (f" and {teams[1]}?" if len(teams) > 1 else " and others?"))
            critic_examples.append(f"Voice note: {teams[0]} approved the budget. Update the graph.")
        if decision_titles:
            council_questions.append(f"What's the highest-impact decision we should make this week?")
            critic_examples.append(f"Meeting: {decision_titles[0]} confirmed. Author signed off.")
        if people:
            critic_examples.append(f"Heard from {people[0]}—timeline updated. Please check for contradictions.")

    # Ensure we always return at least 4 of each (fallbacks)
    default_council = [
        "What are the biggest risks right now?",
        "What conflicts should I be aware of?",
        "What dependencies could block progress?",
        "What's the highest-impact decision we should make this week?",
    ]
    default_critic = [
        "The manager just said the deadline is Friday. Please update the team.",
        "Voice note: Launch date confirmed in standup.",
        "Meeting summary: Budget approved. Please align records.",
        "New info: timeline changed. Check for contradictions.",
    ]
    council_questions = (council_questions + default_council)[:5]
    critic_examples = (critic_examples + default_critic)[:4]

    return {"council_questions": council_questions, "critic_examples": critic_examples}


@app.get("/api/suggestions")
async def get_suggestions():
    """
    Return suggested Chief of Staff questions and Critic Agent examples based on current data.
    Changes when you load a different CSV or URL.
    """
    return _build_suggestions_from_graph(knowledge_graph)


@app.get("/api/graph")
async def get_graph():
    """Return the knowledge graph nodes and edges"""
    return {
        "nodes": knowledge_graph.get("nodes", []),
        "edges": knowledge_graph.get("edges", []),
        "metadata": {
            "total_nodes": len(knowledge_graph.get("nodes", [])),
            "total_edges": len(knowledge_graph.get("edges", [])),
            "generated_at": datetime.now().isoformat(),
        },
    }


@app.get("/api/conflicts")
async def get_conflicts():
    """Return all organizational conflicts"""
    conflicts = knowledge_graph.get("conflicts", [])

    severity_order = {"high": 0, "medium": 1, "low": 2}
    conflicts.sort(
        key=lambda x: (
            severity_order.get(x.get("severity", "low"), 2),
            -x.get("decay", 0),
        )
    )

    return {
        "conflicts": conflicts,
        "summary": {
            "total": len(conflicts),
            "ongoing": len([c for c in conflicts if c.get("status") == "ongoing"]),
            "resolved": len([c for c in conflicts if c.get("status") == "resolved"]),
            "high_severity": len([c for c in conflicts if c.get("severity") == "high"]),
            "medium_severity": len([c for c in conflicts if c.get("severity") == "medium"]),
            "low_severity": len([c for c in conflicts if c.get("severity") == "low"]),
        },
    }


@app.get("/api/decisions")
async def get_decisions():
    """Return decision timeline"""
    decisions = knowledge_graph.get("decisions", [])

    decisions.sort(key=lambda x: x.get("timestamp", ""), reverse=True)

    return {
        "decisions": decisions,
        "summary": {
            "total": len(decisions),
            "recent": len([d for d in decisions if d.get("is_recent", False)]),
            "high_impact": len([d for d in decisions if d.get("impact") == "high"]),
            "medium_impact": len([d for d in decisions if d.get("impact") == "medium"]),
            "low_impact": len([d for d in decisions if d.get("impact") == "low"]),
        },
    }


@app.get("/api/dependencies")
async def get_dependencies():
    """Return all project/decision dependencies"""
    dependencies = knowledge_graph.get("dependencies", [])

    return {
        "dependencies": dependencies,
        "summary": {
            "total": len(dependencies),
            "high_risk": len([d for d in dependencies if d.get("risk_level") == "high"]),
            "medium_risk": len([d for d in dependencies if d.get("risk_level") == "medium"]),
            "low_risk": len([d for d in dependencies if d.get("risk_level") == "low"]),
        },
    }


# --- Dynamic data source (CSV upload / URL) ---
class DataSourceUrlRequest(BaseModel):
    url: str


@app.get("/api/data/source")
async def get_data_source():
    """Return current data source (synthetic, csv, or url) and optional URL."""
    return data_source


def _load_default_graph() -> dict:
    """Load the default knowledge graph from disk (same as startup)."""
    backend_dir = Path(__file__).resolve().parent.parent
    kg_path = backend_dir / "data" / "knowledge_graph.json"
    mock_path = backend_dir / "data" / "mock_data.json"
    path = kg_path if kg_path.exists() else mock_path
    with open(path, "r") as f:
        return json.load(f)


@app.post("/api/data/reset")
async def reset_to_default_data():
    """
    Reset the knowledge graph to the default/mock data (same as on server start).
    Use this to go back to synthetic data after loading a URL or CSV.
    """
    global knowledge_graph, data_source
    try:
        knowledge_graph = _load_default_graph()
    except FileNotFoundError:
        knowledge_graph = {
            "nodes": [],
            "edges": [],
            "decisions": [],
            "conflicts": [],
            "dependencies": [],
            "insights": [],
        }
    data_source = {"source": "synthetic", "url": None}
    return {
        "message": "Reset to default data",
        "nodes": len(knowledge_graph.get("nodes", [])),
        "edges": len(knowledge_graph.get("edges", [])),
        "decisions": len(knowledge_graph.get("decisions", [])),
        "conflicts": len(knowledge_graph.get("conflicts", [])),
        "dependencies": len(knowledge_graph.get("dependencies", [])),
    }


@app.post("/api/data/upload")
async def upload_data_csv(file: UploadFile = File(...)):
    """
    Upload any CSV to build the knowledge graph dynamically.
    Accepted formats: (1) record_type + entity columns; (2) source + target (edge list, nodes inferred);
    (3) id + label/name (node list). See /api/data/csv-format for full record_type column specs.
    """
    global knowledge_graph, data_source
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a .csv")
    try:
        content = (await file.read()).decode("utf-8", errors="replace")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {e}")
    try:
        new_graph = parse_csv_to_graph(content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    knowledge_graph = new_graph
    data_source = {"source": "csv", "url": None}
    return {
        "message": "Data updated from CSV",
        "nodes": len(knowledge_graph.get("nodes", [])),
        "edges": len(knowledge_graph.get("edges", [])),
        "decisions": len(knowledge_graph.get("decisions", [])),
        "conflicts": len(knowledge_graph.get("conflicts", [])),
        "dependencies": len(knowledge_graph.get("dependencies", [])),
    }


@app.post("/api/data/source")
async def set_data_source_url(req: DataSourceUrlRequest):
    """
    Set knowledge graph from any admin URL. Fetches JSON and normalizes to graph shape.
    Accepts nodes/edges/decisions/conflicts (or wrapped in data/result/graph, or aliases: vertices, links).
    """
    global knowledge_graph, data_source
    url = (req.url or "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
    if not url.startswith("http://") and not url.startswith("https://"):
        raise HTTPException(status_code=400, detail="URL must be http or https")
    try:
        new_graph = fetch_graph_from_url(url)
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch URL: {e}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    knowledge_graph = new_graph
    data_source = {"source": "url", "url": url}
    return {
        "message": "Data updated from URL",
        "nodes": len(knowledge_graph.get("nodes", [])),
        "edges": len(knowledge_graph.get("edges", [])),
        "decisions": len(knowledge_graph.get("decisions", [])),
        "conflicts": len(knowledge_graph.get("conflicts", [])),
        "dependencies": len(knowledge_graph.get("dependencies", [])),
    }


@app.get("/api/data/export")
async def export_graph():
    """Return full knowledge graph as JSON (same shape as URL source). Use as URL example: http://localhost:8000/api/data/export"""
    return {
        "nodes": knowledge_graph.get("nodes", []),
        "edges": knowledge_graph.get("edges", []),
        "decisions": knowledge_graph.get("decisions", []),
        "conflicts": knowledge_graph.get("conflicts", []),
        "dependencies": knowledge_graph.get("dependencies", []),
        "insights": knowledge_graph.get("insights", []),
    }


@app.get("/api/data/csv-format")
async def get_csv_format():
    """Return accepted CSV formats for upload. Any of these shapes is accepted."""
    return {
        "formats": [
            "record_type + entity columns (node | edge | decision | conflict | dependency)",
            "edge list: source + target (or from + to); optional type, strength/weight; nodes inferred",
            "node list: id + label (or name); optional type, status, team, role, centrality",
            "any 2 columns: first = node id, second = node label (e.g. name,department)",
            "single column: each value = one node (id and label = value)",
        ],
        "example_files_in_repo": [
            "data/full_tech_startup.csv",
            "data/full_retail_ops.csv",
            "data/full_healthcare_team.csv",
            "data/full_agency_projects.csv",
            "data/full_education_org.csv",
        ],
        "record_type_columns": {
            "node": "id, type (person|topic), label, status, team, role, centrality",
            "edge": "source, target, type (influences|depends_on|conflicts_with), strength, id",
            "decision": "title, author, change, reasoning, date, impact, is_recent, version, id",
            "conflict": "team1, team2, topic, severity, status, description, date, title, id",
            "dependency": "blocker, blocked, type, risk_level, description, date, id",
        },
    }


@app.get("/api/insights")
async def get_insights():
    """Return strategic insights discovered from the data"""
    insights = knowledge_graph.get("insights", [])

    severity_order = {"high": 0, "medium": 1, "low": 2}
    insights.sort(key=lambda x: severity_order.get(x.get("severity", "low"), 2))

    return {
        "insights": insights,
        "summary": {
            "total": len(insights),
            "trends": len([i for i in insights if i.get("type") == "trend"]),
            "risks": len([i for i in insights if i.get("type") == "risk"]),
            "opportunities": len([i for i in insights if i.get("type") == "opportunity"]),
        },
    }


@app.get("/api/health", response_model=HealthScore)
async def get_health_score():
    """Calculate organizational health score (100 = perfect, 0 = critical)"""
    conflicts = knowledge_graph.get("conflicts", [])

    severity_weights = {"low": 3, "medium": 7, "high": 15}

    total_penalty = sum(
        severity_weights.get(c.get("severity", "low"), 3)
        for c in conflicts
        if c.get("status") == "ongoing"
    )

    escalated_penalty = len([c for c in conflicts if c.get("status") == "escalated"]) * 10

    health_score = max(0, 100 - total_penalty - escalated_penalty)

    return HealthScore(
        score=health_score,
        total_conflicts=len(conflicts),
        ongoing_conflicts=len([c for c in conflicts if c.get("status") == "ongoing"]),
        high_severity_conflicts=len([c for c in conflicts if c.get("severity") == "high"]),
        timestamp=datetime.now().isoformat(),
    )


@app.post("/api/council/query", response_model=CouncilResponse)
async def query_council(query: VoiceQuery):
    """Query the Shadow Council (Optimist, Skeptic, Chief of Staff)"""

    if not query.question or len(query.question.strip()) < 5:
        raise HTTPException(
            status_code=400,
            detail="Question must be at least 5 characters",
        )

    try:
        print(f"\n🎙️  Received query: {query.question}")

        result = query_shadow_council(query.question, knowledge_graph)

        return CouncilResponse(
            question=result["question"],
            optimist_view=result["optimist_view"],
            skeptic_view=result["skeptic_view"],
            final_answer=result["final_answer"],
            reasoning_trace=result["reasoning_trace"],
        )

    except Exception as e:
        print(f"❌ Error in council query: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Shadow Council error. Check server logs for details.",
        )


# --- Critic Agent ---
class CriticAnalyzeRequest(BaseModel):
    text: str


@app.post("/api/critic/analyze")
async def critic_analyze(req: CriticAnalyzeRequest):
    """
    Cross-reference new input (voice note, meeting summary) with Knowledge Graph.
    Flags contradictions (e.g. Manager says Friday, Document says Wednesday)
    and suggests who to notify.
    """
    text = (req.text or "").strip()
    if len(text) < 5:
        raise HTTPException(
            status_code=400,
            detail="Text must be at least 5 characters",
        )

    try:
        result = run_critic_agent(text, knowledge_graph)
        return result
    except Exception as e:
        print(f"❌ Critic Agent error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Critic Agent error. Check server logs for details.",
        )


@app.get("/api/stats")
async def get_stats():
    """Return comprehensive system statistics"""
    health_data = await get_health_score()

    nodes = knowledge_graph.get("nodes", [])
    conflicts = knowledge_graph.get("conflicts", [])
    dependencies = knowledge_graph.get("dependencies", [])

    return {
        "nodes": {
            "total": len(nodes),
            "people": len([n for n in nodes if n.get("type") == "person"]),
            "topics": len([n for n in nodes if n.get("type") == "topic"]),
            "decisions": len([n for n in nodes if n.get("type") == "decision"]),
            "active": len([n for n in nodes if n.get("status") == "active"]),
            "stale": len([n for n in nodes if n.get("status") == "stale"]),
        },
        "edges": {"total": len(knowledge_graph.get("edges", []))},
        "decisions": {"total": len(knowledge_graph.get("decisions", []))},
        "conflicts": {
            "total": len(conflicts),
            "ongoing": len([c for c in conflicts if c.get("status") == "ongoing"]),
        },
        "dependencies": {
            "total": len(dependencies),
            "high_risk": len([d for d in dependencies if d.get("risk_level") == "high"]),
        },
        "health_score": health_data.score,
        "timestamp": datetime.now().isoformat(),
    }


# --- Voice / Audio endpoints ---
AUDIO_KEYS = {"intro", "processing", "complete"}


class SynthesizeRequest(BaseModel):
    text: str


@app.post("/api/audio/synthesize")
async def synthesize_speech(req: SynthesizeRequest):
    """Generate speech from text via ElevenLabs (on-demand)"""
    text = (req.text or "").strip()
    if len(text) < 3:
        raise HTTPException(status_code=400, detail="Text must be at least 3 characters")
    if len(text) > 1000:
        raise HTTPException(status_code=400, detail="Text must be under 1000 characters")

    audio = generate_voice(text)
    if audio is None:
        raise HTTPException(
            status_code=503,
            detail="Voice synthesis unavailable. Check ELEVENLABS_API_KEY and permissions.",
        )

    return Response(content=audio, media_type="audio/mpeg")


@app.post("/api/audio/transcribe")
async def transcribe_speech(file: UploadFile = File(...)):
    """Transcribe audio to text via ElevenLabs Speech-to-Text. Accepts audio file (e.g. webm, mp3, wav)."""
    if not file.content_type or not file.content_type.startswith("audio/"):
        raise HTTPException(
            status_code=400,
            detail="Upload must be an audio file (e.g. audio/webm, audio/mpeg)",
        )
    try:
        audio_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {e}")
    if len(audio_bytes) < 100:
        raise HTTPException(status_code=400, detail="Audio file too short")
    text = transcribe_audio(audio_bytes, content_type=file.content_type or "audio/webm")
    if text is None:
        raise HTTPException(
            status_code=503,
            detail="Transcription unavailable. Check ELEVENLABS_API_KEY and that the audio is valid.",
        )
    return {"text": text}


SFX_KEYS = {"click", "confirm", "tab", "soft"}


@app.get("/api/audio/sfx/{sfx_key}")
async def get_audio_sfx(sfx_key: str):
    """Serve pre-generated ElevenLabs sound effects (e.g. button click)"""
    if sfx_key not in SFX_KEYS:
        raise HTTPException(status_code=404, detail=f"Unknown sound effect: {sfx_key}")

    backend_dir = Path(__file__).resolve().parent.parent
    audio_path = backend_dir / "data" / "audio" / "sfx" / f"{sfx_key}.mp3"

    if not audio_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Sound effect not generated. Run: python utils/voice_synthesis.py",
        )

    return FileResponse(audio_path, media_type="audio/mpeg")


@app.get("/api/audio/{key}")
async def get_audio(key: str):
    """Serve pre-generated voice audio (intro, processing, complete)"""
    if key not in AUDIO_KEYS:
        raise HTTPException(status_code=404, detail=f"Unknown audio key: {key}")

    backend_dir = Path(__file__).resolve().parent.parent
    audio_path = backend_dir / "data" / "audio" / f"{key}.mp3"

    if not audio_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Audio not generated. Run: python utils/voice_synthesis.py",
        )

    return FileResponse(audio_path, media_type="audio/mpeg")


@app.get("/health")
async def health_check():
    """Simple health check for monitoring"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
    )