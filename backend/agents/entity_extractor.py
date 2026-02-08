"""
Natural language entity extraction for live knowledge graph updates.
Uses Groq (same as Shadow Council) for consistency. Extracts people, decisions,
dates, conflicts, topics from admin chat and returns graph node/edge updates.
"""

import os
import json
import re
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv

_backend_dir = Path(__file__).resolve().parent.parent
load_dotenv(_backend_dir / ".env")

# Prefer Groq (default in this project)
_groq_key = (os.getenv("GROQ_API_KEY") or "").strip()
_openai_key = (os.getenv("OPENAI_API_KEY") or "").strip()

_client = None
_MODEL = "llama-3.3-70b-versatile"
_USE_GROQ = True

if _groq_key and _groq_key.startswith("gsk_"):
    try:
        from groq import Groq
        _client = Groq(api_key=_groq_key)
        _USE_GROQ = True
        _MODEL = "llama-3.3-70b-versatile"
    except Exception:
        pass

if _client is None and _openai_key and (_openai_key.startswith("sk-") or _openai_key.startswith("sk-proj-")):
    try:
        from openai import OpenAI
        _client = OpenAI(api_key=_openai_key)
        _USE_GROQ = False
        _MODEL = "gpt-4o-mini"
    except Exception:
        pass


def _call_llm(prompt: str, system: str) -> str:
    if _client is None:
        raise RuntimeError("No LLM configured. Set GROQ_API_KEY or OPENAI_API_KEY in backend/.env")
    if _USE_GROQ:
        r = _client.chat.completions.create(
            model=_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            max_tokens=2000,
        )
        return r.choices[0].message.content or ""
    else:
        r = _client.chat.completions.create(
            model=_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            max_tokens=2000,
        )
        return r.choices[0].message.content or ""


def extract_entities_from_text(user_input: str) -> dict:
    """
    Extract structured entities from natural language admin input.
    Returns a dict with decision, date, people, conflict, topic, sentiment.
    """
    prompt = f'''You are analyzing a company update from an admin. Extract ALL relevant information.

Admin message: "{user_input}"

Extract and return a JSON object with:
{{
  "decision": {{
    "detected": true or false,
    "title": "short title",
    "description": "what was decided",
    "confidence": 0.0 to 1.0
  }},
  "date": {{
    "detected": true or false,
    "value": "YYYY-MM-DD",
    "is_past": true or false,
    "days_ago": number or null,
    "original_text": "what user said",
    "confidence": 0.0 to 1.0
  }},
  "people": [
    {{
      "name": "person or team name",
      "role": "owner or stakeholder or mentioned",
      "team": "team name if mentioned",
      "confidence": 0.0 to 1.0
    }}
  ],
  "conflict": {{
    "detected": true or false,
    "teams": ["team1", "team2"],
    "topic": "what the conflict is about",
    "severity": "low or medium or high",
    "confidence": 0.0 to 1.0
  }},
  "topic": {{
    "detected": true or false,
    "name": "main topic",
    "category": "product or engineering or marketing or sales or finance or other",
    "confidence": 0.0 to 1.0
  }},
  "sentiment": {{
    "overall": "positive or neutral or negative",
    "urgency": "low or medium or high",
    "confidence": 0.0 to 1.0
  }}
}}

Rules:
- If user says "5 days ago" or "last week", set is_past=true and estimate days_ago.
- If user says "will" or future tense, date is future.
- Conflicts indicated by words like: but, concerned, disagree, vs, conflict.
- Be precise but confident. Return ONLY valid JSON, no markdown.'''

    system = "You are an expert entity extractor. Always return valid JSON only, no code fences or explanation."
    content = _call_llm(prompt, system)

    # Strip markdown code blocks if present
    content = content.strip()
    if "```json" in content:
        content = content.split("```json")[1].split("```")[0]
    elif "```" in content:
        content = content.split("```")[1].split("```")[0]
    content = content.strip()

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return _empty_entities()


def _empty_entities() -> dict:
    return {
        "decision": {"detected": False, "title": "", "description": "", "confidence": 0},
        "date": {"detected": False, "value": "", "is_past": False, "days_ago": None, "original_text": "", "confidence": 0},
        "people": [],
        "conflict": {"detected": False, "teams": [], "topic": "", "severity": "medium", "confidence": 0},
        "topic": {"detected": False, "name": "", "category": "other", "confidence": 0},
        "sentiment": {"overall": "neutral", "urgency": "low", "confidence": 0},
    }


def _slug(s: str) -> str:
    return re.sub(r"[^\w]+", "_", (s or "").strip()).strip("_").lower() or "item"


def entities_to_graph_updates(entities: dict, user_input: str) -> dict:
    """
    Convert extracted entities into graph node/edge updates compatible with
    the existing knowledge graph schema (nodes with id, type, label, status, decay, centrality, etc.).
    """
    nodes_to_create = []
    edges_to_create = []
    ts = datetime.now().timestamp()
    decision_id = f"decision_{ts}"

    # Decision node
    if entities.get("decision", {}).get("detected"):
        dec = entities["decision"]
        status = "active"
        decay = 1.0
        if entities.get("date", {}).get("is_past"):
            days_ago = entities["date"].get("days_ago") or 0
            decay = max(0.3, 1.0 - (days_ago / 7.0))
            status = "aging" if decay < 0.5 else "active"
            if decay < 0.3:
                status = "stale"
        nodes_to_create.append({
            "id": decision_id,
            "type": "decision",
            "label": dec.get("title") or "New decision",
            "status": status,
            "decay": decay,
            "centrality": 0.8,
            "reasoning": dec.get("description") or "",
            "last_mentioned": datetime.now().isoformat(),
        })

    # Person/team nodes
    for person in entities.get("people", []):
        name = (person.get("name") or "").strip()
        if not name:
            continue
        node_id = f"person_{_slug(name)}"
        nodes_to_create.append({
            "id": node_id,
            "type": "person",
            "label": name,
            "status": "active",
            "decay": 1.0,
            "centrality": 0.7,
            "team": person.get("team") or "Unknown",
            "reasoning": f"Mentioned as {person.get('role', 'mentioned')}",
            "last_mentioned": datetime.now().isoformat(),
        })

    # Topic node
    if entities.get("topic", {}).get("detected"):
        topic = entities["topic"]
        name = (topic.get("name") or "").strip()
        if name:
            node_id = f"topic_{_slug(name)}"
            nodes_to_create.append({
                "id": node_id,
                "type": "topic",
                "label": name,
                "status": "active",
                "decay": 1.0,
                "centrality": 0.75,
                "reasoning": f"Category: {topic.get('category', 'other')}",
                "last_mentioned": datetime.now().isoformat(),
            })

    # Edges: decision <-> people
    if entities.get("decision", {}).get("detected"):
        for person in entities.get("people", []):
            name = (person.get("name") or "").strip()
            if not name:
                continue
            person_id = f"person_{_slug(name)}"
            edge_type = "influences" if (person.get("role") == "owner") else "depends_on"
            edges_to_create.append({
                "id": f"edge_{person_id}_{decision_id}",
                "source": person_id,
                "target": decision_id,
                "type": edge_type,
                "strength": 0.8,
            })

    # Conflict edges
    if entities.get("conflict", {}).get("detected"):
        teams = entities["conflict"].get("teams") or []
        for i in range(len(teams) - 1):
            t1, t2 = teams[i].strip(), teams[i + 1].strip()
            if not t1 or not t2:
                continue
            id1, id2 = f"person_{_slug(t1)}", f"person_{_slug(t2)}"
            edges_to_create.append({
                "id": f"conflict_{id1}_{id2}",
                "source": id1,
                "target": id2,
                "type": "conflicts_with",
                "strength": 0.7,
            })

    # Summary
    parts = []
    if entities.get("decision", {}).get("detected"):
        parts.append(f"New decision: {entities['decision'].get('title', '')}")
    if entities.get("date", {}).get("detected"):
        d = entities["date"]
        parts.append(f"({d.get('original_text', '')})")
    if entities.get("people"):
        names = [p.get("name", "") for p in entities["people"][:3] if p.get("name")]
        if names:
            parts.append(f"Involves: {', '.join(names)}")
    if entities.get("conflict", {}).get("detected"):
        parts.append(f"Conflict: {' and '.join(entities['conflict'].get('teams', []))}")
    summary = " | ".join(parts) if parts else "Update detected"

    return {
        "nodes": nodes_to_create,
        "edges": edges_to_create,
        "summary": summary,
        "entities": entities,
        "original_input": user_input,
    }


def _graph_to_context_text(kg: dict) -> str:
    """Build a readable summary of the knowledge graph for LLM context."""
    nodes = kg.get("nodes", [])
    decisions = kg.get("decisions", [])
    conflicts = kg.get("conflicts", [])
    dependencies = kg.get("dependencies", [])
    edges = kg.get("edges", [])

    lines = [
        "=== KNOWLEDGE GRAPH (current state) ===",
        f"NODES ({len(nodes)}):",
    ]
    for n in nodes[:40]:
        lines.append(f"  - [{n.get('type')}] {n.get('label')} (status={n.get('status')}, id={n.get('id')})")
    if len(nodes) > 40:
        lines.append(f"  ... and {len(nodes) - 40} more")

    lines.append(f"\nDECISIONS ({len(decisions)}):")
    for d in decisions[:15]:
        lines.append(f"  - {d.get('title')} | author={d.get('author')} | status={d.get('status')} | {d.get('reasoning', '')[:80]}")
    if len(decisions) > 15:
        lines.append(f"  ... and {len(decisions) - 15} more")

    lines.append(f"\nCONFLICTS ({len(conflicts)}):")
    for c in conflicts[:15]:
        lines.append(f"  - {c.get('team1')} vs {c.get('team2')} | topic={c.get('topic')} | severity={c.get('severity')} | status={c.get('status')}")
    if len(conflicts) > 15:
        lines.append(f"  ... and {len(conflicts) - 15} more")

    lines.append(f"\nDEPENDENCIES ({len(dependencies)}):")
    for d in dependencies[:10]:
        lines.append(f"  - {d.get('blocker')} -> {d.get('blocked')} | risk={d.get('risk_level')}")
    lines.append(f"\nEDGES: {len(edges)} connections (influences, depends_on, conflicts_with)")
    return "\n".join(lines)


def classify_admin_intent(message: str) -> str:
    """
    Classify admin message: QUESTION (want to know something), UPDATE (add news), or COMMAND (resolve/close something).
    Returns "QUESTION" | "UPDATE" | "COMMAND".
    """
    msg = (message or "").strip().lower()
    if not msg:
        return "UPDATE"
    # Question cues
    if any(msg.startswith(x) for x in ("what", "which", "how many", "list", "tell me", "show me", "describe", "summarize", "current", "ongoing", "who is", "who are")):
        return "QUESTION"
    if "?" in message or " what " in msg or " which " in msg or " how " in msg:
        return "QUESTION"
    if "current conflicts" in msg or "current decisions" in msg or "ongoing conflicts" in msg:
        return "QUESTION"
    # Command cues: resolve, mark as, close, done, deprecated
    if any(x in msg for x in ("resolve", "resolved", "mark as resolved", "close the conflict", "mark as done", "deprecate", "close conflict", "that one was resolved")):
        return "COMMAND"
    if " is resolved" in msg or " was resolved" in msg or " has been resolved" in msg:
        return "COMMAND"
    return "UPDATE"


def answer_query_from_graph(question: str, knowledge_graph: dict) -> str:
    """
    Answer the admin's question using the current knowledge graph. Full read access.
    """
    context = _graph_to_context_text(knowledge_graph)
    prompt = f"""You are the Chief of Staff assistant with full access to the organization's knowledge graph.

Use ONLY the data below to answer the admin's question. Be concise but complete. If listing conflicts or decisions, name them clearly.

{context}

Admin question: "{question}"

Answer in 2-5 sentences. If the graph has no relevant data, say so."""

    system = "You answer questions about the organization using only the provided knowledge graph data. Be accurate and concise."
    return _call_llm(prompt, system).strip()


def parse_command(message: str, knowledge_graph: dict) -> dict | None:
    """
    Parse admin command (e.g. resolve conflict, mark decision done). Returns action dict or None.
    """
    context = _graph_to_context_text(knowledge_graph)
    prompt = f"""The admin wants to UPDATE EXISTING data in the knowledge graph (e.g. mark a conflict as resolved).

Knowledge graph:
{context[:3000]}

Admin message: "{message}"

Reply with a JSON object (only valid JSON, no markdown):
- If they want to RESOLVE a conflict: {{ "action": "resolve_conflict", "team1": "exact team1 from graph", "team2": "exact team2 from graph" }}
- If they want to mark a decision/topic as done/deprecated: {{ "action": "mark_done", "title": "exact title from graph" }}
- If you cannot identify a single clear target: {{ "action": null }}

Use exact team names and titles from the graph. If multiple conflicts match, pick the most relevant one. Reply only JSON."""

    system = "You output only valid JSON. Extract action and exact identifiers from the graph."
    raw = _call_llm(prompt, system).strip()
    # Strip code blocks
    if "```" in raw:
        raw = raw.split("```")[1].replace("json", "").strip()
    try:
        out = json.loads(raw)
        if out.get("action"):
            return out
        return None
    except json.JSONDecodeError:
        return None


def apply_command(command: dict, knowledge_graph: dict) -> str:
    """
    Apply a parsed command to the knowledge graph (mutates in place). Returns human-readable message.
    """
    action = command.get("action")
    if action == "resolve_conflict":
        team1 = (command.get("team1") or "").strip()
        team2 = (command.get("team2") or "").strip()
        conflicts = knowledge_graph.get("conflicts", [])
        for c in conflicts:
            t1, t2 = (c.get("team1") or "").strip(), (c.get("team2") or "").strip()
            if (t1 == team1 and t2 == team2) or (t1 == team2 and t2 == team1):
                c["status"] = "resolved"
                return f"Conflict between {t1} and {t2} marked as resolved."
        return f"No conflict found between '{team1}' and '{team2}'."
    if action == "mark_done":
        title = (command.get("title") or "").strip()
        decisions = knowledge_graph.get("decisions", [])
        for d in decisions:
            if (d.get("title") or "").strip() == title:
                d["status"] = "old"
                d["is_recent"] = False
                return f"Decision '{title}' marked as done."
        nodes = knowledge_graph.get("nodes", [])
        for n in nodes:
            if (n.get("label") or "").strip() == title and n.get("type") in ("decision", "topic"):
                n["status"] = "stale"
                n["decay"] = 0.3
                return f"'{title}' marked as done/deprecated."
        return f"No decision or topic found with title '{title}'."
    return "Unknown command."
