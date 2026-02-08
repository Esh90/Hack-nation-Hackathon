"""
FastAPI backend serving the knowledge graph and AI agents
Powered by Google Gemini + Anthropic Claude
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Import triggers LLM selection (OpenAI → Gemini → Anthropic) and prints mode at startup
from agents.shadow_council import query_shadow_council
from agents.critic_agent import run_critic_agent
from agents.entity_extractor import (
    extract_entities_from_text,
    entities_to_graph_updates,
    classify_admin_intent,
    answer_query_from_graph,
    parse_command,
    apply_command,
)
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
            "changes_today": "/api/changes/today",
            "brief": "/api/brief",
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
    """Query the Shadow Council (Optimist, Skeptic, Chief of Staff). Uses the current in-memory knowledge graph, so any updates from the Admin Live Knowledge Builder are included."""

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


@app.get("/api/changes/today")
async def get_changes_today():
    """
    What changed today: recent decisions, ongoing/new conflicts, and affected node/edge ids
    for visual delta and narrative. Used by "What changed today?" founder moment.
    """
    nodes = knowledge_graph.get("nodes", [])
    edges = knowledge_graph.get("edges", [])
    decisions = knowledge_graph.get("decisions", [])
    conflicts = knowledge_graph.get("conflicts", [])

    now = datetime.now()
    today_date = now.date()

    def parse_ts(ts):
        if not ts:
            return None
        try:
            if isinstance(ts, datetime):
                return ts
            dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            return dt
        except Exception:
            return None

    recent_decisions = []
    for d in decisions:
        ts = parse_ts(d.get("timestamp"))
        is_recent = d.get("is_recent", False)
        if is_recent or (ts is not None and ts.date() == today_date):
            recent_decisions.append(d)

    ongoing_conflicts = [c for c in conflicts if c.get("status") == "ongoing"]
    recent_conflicts = [c for c in conflicts if (lambda t: t is not None and t.date() == today_date)(parse_ts(c.get("timestamp")))]

    node_ids_affected = set()
    edge_ids_affected = set()
    for d in recent_decisions:
        title = d.get("title", "")
        for n in nodes:
            if title and (n.get("label") == title or n.get("id", "").lower() in title.lower().replace(" ", "_")):
                node_ids_affected.add(n.get("id"))
        for e in edges:
            if e.get("source") in node_ids_affected or e.get("target") in node_ids_affected:
                edge_ids_affected.add(e.get("id"))
    for c in ongoing_conflicts + recent_conflicts:
        t1, t2 = c.get("team1"), c.get("team2")
        for n in nodes:
            if n.get("label") == t1 or n.get("label") == t2 or n.get("team") == t1 or n.get("team") == t2:
                node_ids_affected.add(n.get("id"))
        for e in edges:
            if e.get("source") in node_ids_affected or e.get("target") in node_ids_affected:
                edge_ids_affected.add(e.get("id"))

    summary_parts = []
    if recent_decisions:
        summary_parts.append(f"{len(recent_decisions)} recent decision(s)")
    if ongoing_conflicts:
        summary_parts.append(f"{len(ongoing_conflicts)} ongoing conflict(s)")
    if recent_conflicts:
        summary_parts.append(f"{len(recent_conflicts)} new conflict(s) today")
    narrative_summary = "; ".join(summary_parts) if summary_parts else "No changes recorded today. Ask the Chief of Staff for a full brief."

    return {
        "narrative_summary": narrative_summary,
        "recent_decisions": recent_decisions[:20],
        "ongoing_conflicts": ongoing_conflicts,
        "recent_conflicts": recent_conflicts,
        "node_ids_affected": list(node_ids_affected),
        "edge_ids_affected": list(edge_ids_affected),
    }


@app.get("/api/brief")
async def get_brief():
    """
    Daily brief: summary + top conflicts + key decisions + who to talk to.
    For "My brief" / "What do I need to know?" one-tap.
    """
    nodes = knowledge_graph.get("nodes", [])
    conflicts = knowledge_graph.get("conflicts", [])
    decisions = knowledge_graph.get("decisions", [])

    ongoing = [c for c in conflicts if c.get("status") == "ongoing"]
    recent_decisions = sorted(
        [d for d in decisions if d.get("is_recent")],
        key=lambda x: x.get("timestamp", ""),
        reverse=True,
    )[:5]
    high_impact = [d for d in decisions if d.get("impact") == "high"][:3]

    summary_parts = []
    if ongoing:
        summary_parts.append(f"{len(ongoing)} ongoing conflict(s) need attention.")
    if recent_decisions:
        summary_parts.append(f"{len(recent_decisions)} recent decision(s) updated.")
    if high_impact:
        summary_parts.append(f"{len(high_impact)} high-impact decision(s) to track.")
    summary = " ".join(summary_parts) if summary_parts else "No major updates. Your org is in sync."

    conflict_titles = [f"{c.get('team1', '')} vs {c.get('team2', '')}: {c.get('topic', '')}" for c in ongoing[:3]]
    decision_titles = [d.get("title", "") for d in (recent_decisions or high_impact[:3]) if d.get("title")]

    talk_to = []
    for c in ongoing[:2]:
        if c.get("team1"):
            talk_to.append(c["team1"])
        if c.get("team2"):
            talk_to.append(c["team2"])
    talk_to = list(dict.fromkeys(talk_to))[:5]

    return {
        "summary": summary,
        "conflicts_summary": conflict_titles,
        "decisions_summary": decision_titles,
        "talk_to": talk_to,
    }


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


# --- Admin: Live Knowledge Graph Builder ---
ADMIN_PASSWORD = (os.getenv("ADMIN_PASSWORD") or os.getenv("AETHERIS_ADMIN_PASSWORD") or "aetheris2024").strip()
pending_admin_updates = {}


class AdminAuth(BaseModel):
    password: str


class AdminMessage(BaseModel):
    message: str
    session_id: str


class GraphUpdateConfirmation(BaseModel):
    nodes: list
    edges: list
    session_id: str


@app.post("/api/admin/auth")
async def admin_authenticate(auth: AdminAuth):
    """Simple admin authentication for live knowledge builder."""
    if auth.password == ADMIN_PASSWORD:
        session_id = f"session_{datetime.now().timestamp()}"
        print("\n🔐 Admin authenticated (Live Knowledge Builder)")
        return {"authenticated": True, "session_id": session_id}
    print("⚠️  Admin auth failed (invalid password)")
    raise HTTPException(status_code=401, detail="Invalid password")


@app.post("/api/admin/chat")
async def admin_chat(message: AdminMessage):
    """
    Process admin message: answer questions, run commands (e.g. resolve conflict), or propose graph updates.
    """
    global knowledge_graph
    backend_dir = Path(__file__).resolve().parent.parent
    kg_path = backend_dir / "data" / "knowledge_graph.json"
    msg = (message.message or "").strip()

    try:
        print(f"\n📩 Admin message: \"{msg[:80]}{'...' if len(msg) > 80 else ''}\"")
        intent = classify_admin_intent(msg)
        print(f"   Intent: {intent}")

        # QUESTION: answer from graph (read-only)
        if intent == "QUESTION":
            print("   Answering from knowledge graph...")
            answer = answer_query_from_graph(msg, knowledge_graph)
            print(f"   ✓ Answer: {answer[:80]}...")
            return {
                "detected": answer,
                "nodes_to_add": 0,
                "edges_to_add": 0,
                "preview": {"nodes": [], "edges": []},
                "entities": {},
                "requires_confirmation": False,
                "is_query": True,
                "answer": answer,
            }

        # COMMAND: resolve conflict, mark done, etc. (mutate graph and save)
        if intent == "COMMAND":
            print("   Parsing command...")
            cmd = parse_command(msg, knowledge_graph)
            if cmd:
                result_msg = apply_command(cmd, knowledge_graph)
                with open(kg_path, "w", encoding="utf-8") as f:
                    json.dump(knowledge_graph, f, indent=2)
                print(f"   ✓ Command applied: {result_msg}")
                return {
                    "detected": result_msg,
                    "nodes_to_add": 0,
                    "edges_to_add": 0,
                    "preview": {"nodes": [], "edges": []},
                    "entities": {},
                    "requires_confirmation": False,
                    "command_applied": True,
                    "message": result_msg,
                }
            # Fallback: treat as update or answer
            print("   Command not parsed, trying query...")
            answer = answer_query_from_graph(msg, knowledge_graph)
            return {
                "detected": answer,
                "nodes_to_add": 0,
                "edges_to_add": 0,
                "preview": {"nodes": [], "edges": []},
                "entities": {},
                "requires_confirmation": False,
                "is_query": True,
                "answer": answer,
            }

        # UPDATE: extract entities and propose graph updates
        print("   Extracting entities (Groq)...")
        entities = extract_entities_from_text(msg)
        graph_updates = entities_to_graph_updates(entities, msg)
        pending_admin_updates[message.session_id] = graph_updates
        n_nodes = len(graph_updates["nodes"])
        n_edges = len(graph_updates["edges"])
        print(f"   ✓ Extracted: {n_nodes} nodes, {n_edges} edges → {graph_updates['summary'][:60]}...")
        return {
            "detected": graph_updates["summary"],
            "nodes_to_add": n_nodes,
            "edges_to_add": n_edges,
            "preview": {
                "nodes": graph_updates["nodes"],
                "edges": graph_updates["edges"],
            },
            "entities": graph_updates["entities"],
            "requires_confirmation": True,
            "is_query": False,
            "command_applied": False,
        }
    except Exception as e:
        print(f"Admin chat error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to process message. Check server logs.",
        )


@app.post("/api/admin/confirm")
async def confirm_graph_update(confirmation: GraphUpdateConfirmation):
    """
    Admin confirmed the update: merge nodes/edges into the knowledge graph and persist to disk.
    """
    global knowledge_graph
    backend_dir = Path(__file__).resolve().parent.parent
    kg_path = backend_dir / "data" / "knowledge_graph.json"

    try:
        nodes = knowledge_graph.get("nodes", [])
        edges_list = knowledge_graph.get("edges", [])
        existing_ids = {n["id"] for n in nodes}
        existing_edge_ids = {e["id"] for e in edges_list}

        new_nodes = [n for n in confirmation.nodes if n.get("id") and n["id"] not in existing_ids]
        new_edges = [e for e in confirmation.edges if e.get("id") and e["id"] not in existing_edge_ids]

        for n in new_nodes:
            if "decay" not in n:
                n["decay"] = 1.0
            if "centrality" not in n:
                n["centrality"] = 0.7
        knowledge_graph["nodes"] = nodes + new_nodes
        knowledge_graph["edges"] = edges_list + new_edges

        # Append to decisions list for new decision nodes
        decisions = knowledge_graph.get("decisions", [])
        for node in new_nodes:
            if node.get("type") == "decision":
                decisions.append({
                    "id": node["id"],
                    "title": node.get("label", ""),
                    "version": 1,
                    "author": "Admin",
                    "timestamp": node.get("last_mentioned", datetime.now().isoformat()),
                    "change": node.get("reasoning", ""),
                    "reasoning": node.get("reasoning", ""),
                    "status": "new",
                    "is_recent": True,
                    "impact": "medium",
                })
        knowledge_graph["decisions"] = decisions

        # Add conflict entries for conflicts_with edges
        conflicts = knowledge_graph.get("conflicts", [])
        for edge in new_edges:
            if edge.get("type") == "conflicts_with":
                src_label = next((n.get("label", edge["source"]) for n in knowledge_graph["nodes"] if n.get("id") == edge["source"]), edge["source"])
                tgt_label = next((n.get("label", edge["target"]) for n in knowledge_graph["nodes"] if n.get("id") == edge["target"]), edge["target"])
                conflicts.append({
                    "id": edge["id"],
                    "team1": src_label,
                    "team2": tgt_label,
                    "topic": "Live update from admin",
                    "severity": "medium",
                    "status": "ongoing",
                    "timestamp": datetime.now().isoformat(),
                    "description": f"Conflict between {src_label} and {tgt_label} (added via admin chat).",
                })
        knowledge_graph["conflicts"] = conflicts

        with open(kg_path, "w", encoding="utf-8") as f:
            json.dump(knowledge_graph, f, indent=2)

        print(f"\n✅ Admin confirmed: graph updated live — +{len(new_nodes)} nodes, +{len(new_edges)} edges")
        print(f"   Saved to {kg_path.name} (total nodes: {len(knowledge_graph['nodes'])}, edges: {len(knowledge_graph['edges'])})")
        return {
            "success": True,
            "nodes_added": len(new_nodes),
            "edges_added": len(new_edges),
            "message": "Knowledge graph updated successfully",
        }
    except Exception as e:
        print(f"Confirm graph update error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update graph. Check server logs.")


@app.post("/api/admin/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    """
    Upload CSV of company communications. Expected columns: sender, content, timestamp.
    Extracts entities from each row and returns preview of nodes/edges.
    """
    try:
        import io
        import pandas as pd
    except ImportError:
        raise HTTPException(status_code=503, detail="pandas required for CSV upload. pip install pandas")

    try:
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
        required = ["content"]
        if not all(c in df.columns for c in required):
            raise HTTPException(status_code=400, detail=f"CSV must contain columns: {required}")

        all_nodes = []
        all_edges = []
        for _, row in df.iterrows():
            content = str(row.get("content", ""))
            if len(content) < 5:
                continue
            entities = extract_entities_from_text(content)
            updates = entities_to_graph_updates(entities, content)
            all_nodes.extend(updates["nodes"])
            all_edges.extend(updates["edges"])

        seen_nodes = {n["id"]: n for n in all_nodes}
        seen_edges = {e["id"]: e for e in all_edges}
        return {
            "success": True,
            "rows_processed": len(df),
            "nodes_extracted": len(seen_nodes),
            "edges_extracted": len(seen_edges),
            "preview": {
                "nodes": list(seen_nodes.values())[:10],
                "edges": list(seen_edges.values())[:10],
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"CSV upload error: {e}")
        raise HTTPException(status_code=500, detail="Failed to process CSV. Check server logs.")


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
