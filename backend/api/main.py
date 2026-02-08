"""
FastAPI backend serving the knowledge graph and AI agents
Powered by Google Gemini + Anthropic Claude
"""

import json
import sys
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Import triggers LLM selection (OpenAI → Gemini → Anthropic) and prints mode at startup
from agents.shadow_council import query_shadow_council
from agents.critic_agent import run_critic_agent
from utils.voice_synthesis import generate_voice

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

knowledge_graph = {}


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
            "stats": "/api/stats",
            "audio": "/api/audio/{intro|processing|complete}",
            "audio_synthesize": "/api/audio/synthesize",
        },
    }


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
