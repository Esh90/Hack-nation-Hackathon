"""
Load knowledge graph from CSV upload or URL (admin API).
Updates the in-memory graph so all endpoints use the new data.
Accepts any URL: JSON (with nodes/edges) or any website (HTML → graph from title + links).
"""

import csv
import io
import json
import re
from typing import Any
from urllib.parse import urljoin, urlparse

import httpx


def _str(val: Any) -> str:
    if val is None: return ""
    s = str(val).strip()
    return s if s else ""


def _num(val: Any, default: float = 0) -> float:
    if val is None or val == "": return default
    try: return float(val)
    except ValueError: return default


def _bool(val: Any) -> bool:
    if val is None: return False
    s = str(val).strip().lower()
    return s in ("1", "true", "yes", "on")


def _parse_csv_edge_list(reader: csv.DictReader) -> dict[str, Any]:
    """Parse CSV as edge list: rows with source+target (or from+to). Nodes inferred from unique ids."""
    nodes: list[dict] = []
    edges: list[dict] = []
    seen: set[str] = set()
    fieldnames = [f.strip().lower() for f in (reader.fieldnames or [])]
    src_key = "source" if "source" in fieldnames else "from"
    tgt_key = "target" if "target" in fieldnames else "to"
    type_key = "type" if "type" in fieldnames else None
    for i, row in enumerate(reader):
        src = _str(row.get(src_key) or row.get("source") or row.get("from"))
        tgt = _str(row.get(tgt_key) or row.get("target") or row.get("to"))
        if not src or not tgt:
            continue
        for nid in (src, tgt):
            if nid not in seen:
                seen.add(nid)
                nodes.append({
                    "id": nid,
                    "type": "topic",
                    "label": nid.replace("_", " ").title(),
                    "status": "active",
                    "team": None,
                    "role": None,
                    "centrality": 0.5,
                })
        edge_type = _str(row.get(type_key or "type") or row.get("relationship")) or "influences"
        strength = _num(row.get("strength") or row.get("weight"), 0.8)
        edges.append({
            "id": f"e{len(edges) + 1}",
            "source": src,
            "target": tgt,
            "type": edge_type if edge_type in ("influences", "depends_on", "conflicts_with") else "influences",
            "strength": strength,
        })
    return {
        "nodes": nodes,
        "edges": edges,
        "decisions": [],
        "conflicts": [],
        "dependencies": [],
        "insights": [],
    }


def _parse_csv_node_list(reader: csv.DictReader) -> dict[str, Any]:
    """Parse CSV as node list: rows with id + (label or name). No edges."""
    nodes: list[dict] = []
    fieldnames = [f.strip().lower() for f in (reader.fieldnames or [])]
    label_key = "label" if "label" in fieldnames else "name" if "name" in fieldnames else None
    type_key = "type" if "type" in fieldnames else None
    for i, row in enumerate(reader):
        nid = _str(row.get("id"))
        if not nid:
            continue
        label = _str(row.get(label_key or "label") or row.get("name") or nid)
        node_type = _str(row.get(type_key or "type") or row.get("node_type")) or "topic"
        if node_type not in ("person", "topic", "decision"):
            node_type = "topic"
        nodes.append({
            "id": nid,
            "type": node_type,
            "label": label,
            "status": _str(row.get("status")) or "active",
            "team": _str(row.get("team")) or None,
            "role": _str(row.get("role")) or None,
            "centrality": _num(row.get("centrality"), 0.5),
        })
    return {
        "nodes": nodes,
        "edges": [],
        "decisions": [],
        "conflicts": [],
        "dependencies": [],
        "insights": [],
    }


def _parse_csv_two_columns(reader: csv.DictReader) -> dict[str, Any]:
    """Parse CSV with exactly 2 columns as node list: col1 = id, col2 = label."""
    nodes: list[dict] = []
    keys = list(reader.fieldnames or [])
    if len(keys) < 2:
        return {"nodes": [], "edges": [], "decisions": [], "conflicts": [], "dependencies": [], "insights": []}
    k1, k2 = keys[0], keys[1]
    for i, row in enumerate(reader):
        nid = _str(row.get(k1))
        label = _str(row.get(k2))
        if not nid and not label:
            continue
        nid = nid or f"node_{i + 1}"
        label = label or nid
        nodes.append({
            "id": nid,
            "type": "topic",
            "label": label,
            "status": "active",
            "team": None,
            "role": None,
            "centrality": 0.5,
        })
    return {
        "nodes": nodes,
        "edges": [],
        "decisions": [],
        "conflicts": [],
        "dependencies": [],
        "insights": [],
    }


def _parse_csv_single_column(reader: csv.DictReader) -> dict[str, Any]:
    """Parse CSV with a single column as node list: value = id and label."""
    nodes: list[dict] = []
    keys = list(reader.fieldnames or [])
    if not keys:
        return {"nodes": [], "edges": [], "decisions": [], "conflicts": [], "dependencies": [], "insights": []}
    k = keys[0]
    for i, row in enumerate(reader):
        val = _str(row.get(k))
        if not val:
            continue
        nodes.append({
            "id": val,
            "type": "topic",
            "label": val,
            "status": "active",
            "team": None,
            "role": None,
            "centrality": 0.5,
        })
    return {
        "nodes": nodes,
        "edges": [],
        "decisions": [],
        "conflicts": [],
        "dependencies": [],
        "insights": [],
    }


def parse_csv_to_graph(csv_content: str) -> dict[str, Any]:
    """
    Parse any CSV into a graph.
    - If header has 'record_type': full format (node | edge | decision | conflict | dependency).
    - Else if header has source+target (or from+to): edge list; nodes inferred.
    - Else if header has id + (label or name): node list only.
    """
    raw = io.StringIO(csv_content)
    reader = csv.DictReader(raw)
    fieldnames = list(reader.fieldnames or [])
    norm = [f.strip().lower() for f in fieldnames]
    if "record_type" not in norm:
        if ("source" in norm or "from" in norm) and ("target" in norm or "to" in norm):
            raw.seek(0)
            reader = csv.DictReader(raw)
            return _parse_csv_edge_list(reader)
        if "id" in norm and ("label" in norm or "name" in norm):
            raw.seek(0)
            reader = csv.DictReader(raw)
            return _parse_csv_node_list(reader)
        if len(norm) == 2:
            raw.seek(0)
            reader = csv.DictReader(raw)
            return _parse_csv_two_columns(reader)
        if len(norm) == 1:
            raw.seek(0)
            reader = csv.DictReader(raw)
            return _parse_csv_single_column(reader)
        raise ValueError(
            "CSV format not recognized. Use one of: "
            "(1) record_type + columns for node/edge/decision/conflict/dependency; "
            "(2) source + target (or from + to) for edge list; "
            "(3) id + label or name for node list; "
            "(4) any 2 columns (first=id, second=label); "
            "(5) a single column (each value = one node). "
            f"Your header has: {fieldnames!r}. See backend/data/full_*.csv for examples."
        )
    nodes: list[dict] = []
    edges: list[dict] = []
    decisions: list[dict] = []
    conflicts: list[dict] = []
    dependencies: list[dict] = []
    insights: list[dict] = []

    for i, row in enumerate(reader):
        rt = _str(row.get("record_type")).lower()
        if not rt:
            continue
        if rt == "node":
            nodes.append({
                "id": _str(row.get("id")) or f"node_{i}",
                "type": _str(row.get("type")) or "topic",
                "label": _str(row.get("label")) or "Unnamed",
                "status": _str(row.get("status")) or "active",
                "team": _str(row.get("team")) or None,
                "role": _str(row.get("role")) or None,
                "centrality": _num(row.get("centrality"), 0.5),
            })
        elif rt == "edge":
            src, tgt = _str(row.get("source")), _str(row.get("target"))
            if src and tgt:
                edges.append({
                    "id": _str(row.get("id")) or f"e{len(edges)+1}",
                    "source": src,
                    "target": tgt,
                    "type": _str(row.get("type")) or "influences",
                    "strength": _num(row.get("strength"), 0.8),
                })
        elif rt == "decision":
            title = _str(row.get("title"))
            if title:
                decisions.append({
                    "id": _str(row.get("id")) or f"dec_{len(decisions)+1:03d}",
                    "title": title,
                    "author": _str(row.get("author")) or "",
                    "version": int(_num(row.get("version"), 1)),
                    "impact": _str(row.get("impact")) or "medium",
                    "is_recent": _bool(row.get("is_recent")),
                    "date": _str(row.get("date")) or None,
                    "change": _str(row.get("change")) or "",
                    "reasoning": _str(row.get("reasoning")) or "",
                })
        elif rt == "conflict":
            team1, team2 = _str(row.get("team1")), _str(row.get("team2"))
            if team1 or team2:
                conflicts.append({
                    "id": _str(row.get("id")) or f"conf_{len(conflicts)+1:03d}",
                    "title": _str(row.get("title")) or _str(row.get("topic")) or "Conflict",
                    "team1": team1 or "Unknown",
                    "team2": team2 or "Unknown",
                    "topic": _str(row.get("topic")) or "",
                    "severity": _str(row.get("severity")) or "medium",
                    "status": _str(row.get("status")) or "ongoing",
                    "date": _str(row.get("date")) or None,
                    "description": _str(row.get("description")) or "",
                })
        elif rt == "dependency":
            blocker, blocked = _str(row.get("blocker")), _str(row.get("blocked"))
            if blocker and blocked:
                dependencies.append({
                    "id": _str(row.get("id")) or f"dep_{len(dependencies)+1:03d}",
                    "blocker": blocker,
                    "blocked": blocked,
                    "type": _str(row.get("type")) or "hard_dependency",
                    "risk_level": _str(row.get("risk_level")) or "medium",
                    "date": _str(row.get("date")) or None,
                    "description": _str(row.get("description")) or "",
                })

    graph = {
        "nodes": nodes,
        "edges": edges,
        "decisions": decisions,
        "conflicts": conflicts,
        "dependencies": dependencies,
        "insights": insights,
    }
    return _merge_inferred_conflicts(graph)


def _node_label_by_id(nodes: list[dict], nid: str) -> str:
    """Return label for node id, or the id itself if not found."""
    for n in nodes:
        if isinstance(n, dict) and str(n.get("id")) == str(nid):
            return _str(n.get("label") or n.get("name")) or str(nid)
    return str(nid)


def _infer_conflicts_from_edges(nodes: list[dict], edges: list[dict]) -> list[dict]:
    """
    Build conflict records from edges with type conflicts_with.
    So the dashboard can show conflicts when the graph only has edges (no explicit conflicts array).
    """
    conflicts: list[dict] = []
    for i, e in enumerate(edges):
        if not isinstance(e, dict):
            continue
        if _str(e.get("type")).lower() != "conflicts_with":
            continue
        src = _str(e.get("source"))
        tgt = _str(e.get("target"))
        if not src or not tgt:
            continue
        team1 = _node_label_by_id(nodes, src)
        team2 = _node_label_by_id(nodes, tgt)
        conflicts.append({
            "id": _str(e.get("id")) or f"conf_inferred_{i + 1:03d}",
            "title": _str(e.get("title")) or f"{team1} vs {team2}",
            "team1": team1,
            "team2": team2,
            "topic": _str(e.get("topic")) or "Graph conflict",
            "severity": _str(e.get("severity")) or "medium",
            "status": "ongoing",
            "date": None,
            "description": _str(e.get("description")) or "Inferred from conflicts_with edge.",
        })
    return conflicts


def _merge_inferred_conflicts(graph: dict[str, Any]) -> dict[str, Any]:
    """Add conflicts inferred from edges (type=conflicts_with) into graph.conflicts, then return graph."""
    nodes = graph.get("nodes") or []
    edges = graph.get("edges") or []
    existing = list(graph.get("conflicts") or [])
    if not isinstance(existing, list):
        existing = []
    inferred = _infer_conflicts_from_edges(nodes, edges)
    # Merge: existing first, then inferred (avoid duplicate team1/team2 pairs)
    seen_pairs: set[tuple[str, str]] = set()
    merged = []
    for c in existing:
        if not isinstance(c, dict):
            continue
        pair = (str(c.get("team1") or ""), str(c.get("team2") or ""))
        if pair not in seen_pairs:
            seen_pairs.add(pair)
            merged.append(c)
    for c in inferred:
        pair = (str(c.get("team1") or ""), str(c.get("team2") or ""))
        if pair not in seen_pairs:
            seen_pairs.add(pair)
            merged.append(c)
    graph["conflicts"] = merged
    return graph


def _normalize_graph_payload(data: dict[str, Any]) -> dict[str, Any]:
    """
    Normalize any admin API response into our graph shape.
    - Unwraps data / result / graph if present.
    - Accepts key aliases: vertices -> nodes, links / relationships -> edges.
    - Infers conflicts from edges with type conflicts_with.
    """
    if not isinstance(data, dict):
        return {"nodes": [], "edges": [], "decisions": [], "conflicts": [], "dependencies": [], "insights": []}
    # Unwrap common API shapes
    for key in ("data", "result", "graph", "payload"):
        if isinstance(data.get(key), dict):
            data = data[key]
            break
    # Key aliases
    nodes = data.get("nodes") or data.get("vertices") or []
    edges = data.get("edges") or data.get("links") or data.get("relationships") or []
    if not isinstance(nodes, list):
        nodes = []
    if not isinstance(edges, list):
        edges = []
    graph = {
        "nodes": nodes,
        "edges": edges,
        "decisions": data.get("decisions", []) if isinstance(data.get("decisions"), list) else [],
        "conflicts": data.get("conflicts", []) if isinstance(data.get("conflicts"), list) else [],
        "dependencies": data.get("dependencies", []) if isinstance(data.get("dependencies"), list) else [],
        "insights": data.get("insights", []) if isinstance(data.get("insights"), list) else [],
    }
    return _merge_inferred_conflicts(graph)


def _graph_from_html(html: str, base_url: str) -> dict[str, Any]:
    """
    Build a graph from any HTML page: one node for the page, one per outbound link, edges page→link.
    Uses title as page label and link URL/path as target node labels.
    """
    nodes: list[dict] = []
    edges: list[dict] = []
    seen_nodes: set[str] = set()

    # Page title (strip whitespace and truncate)
    title_match = re.search(r"<title[^>]*>([^<]+)</title>", html, re.I | re.S)
    page_label = (title_match.group(1).strip() if title_match else urlparse(base_url).netloc or base_url)
    if len(page_label) > 80:
        page_label = page_label[:77] + "..."

    def node_label(u: str) -> str:
        p = urlparse(u)
        if p.netloc:
            return p.netloc + (p.path.rstrip("/") or "")
        return (p.path or u)[:60]

    # Current page as node (canonical id: strip trailing slash)
    page_id = base_url.rstrip("/") or base_url
    if page_id not in seen_nodes:
        seen_nodes.add(page_id)
        nodes.append({
            "id": page_id,
            "type": "topic",
            "label": page_label,
            "status": "active",
            "team": None,
            "role": None,
            "centrality": 0.9,
        })

    # All <a href="..."> (allow single or double quotes, skip javascript:, mailto:, #)
    for m in re.finditer(r'<a\s+[^>]*href\s*=\s*["\']([^"\']+)["\']', html, re.I):
        raw_href = m.group(1).strip()
        if not raw_href or raw_href.startswith("#") or raw_href.lower().startswith(("javascript:", "mailto:", "tel:")):
            continue
        try:
            full_url = urljoin(base_url, raw_href)
        except Exception:
            continue
        parsed = urlparse(full_url)
        if not parsed.scheme or parsed.scheme not in ("http", "https"):
            continue
        target_id = full_url
        if target_id not in seen_nodes:
            seen_nodes.add(target_id)
            nodes.append({
                "id": target_id,
                "type": "topic",
                "label": node_label(full_url),
                "status": "active",
                "team": None,
                "role": None,
                "centrality": 0.5,
            })
        edges.append({
            "id": f"e{len(edges) + 1}",
            "source": page_id,
            "target": target_id,
            "type": "influences",
            "strength": 0.8,
        })

    # Infer "conflicts" from outbound links — one per unique (source, target). Use short page label so list rows don't all show the same long title.
    domain = urlparse(base_url).netloc or "Page"
    short_page_label = domain if domain else "Page"
    seen_link_pairs: set[tuple[str, str]] = set()
    conflicts = []
    for i, e in enumerate(edges):
        src_id = e.get("source")
        tgt_id = e.get("target")
        pair = (str(src_id or ""), str(tgt_id or ""))
        if not pair[0] or not pair[1] or pair in seen_link_pairs:
            continue
        seen_link_pairs.add(pair)
        team1 = short_page_label  # so UI shows "nstp.pk vs /about" not the full page title repeated
        team2 = _node_label_by_id(nodes, tgt_id)
        conflicts.append({
            "id": f"conf_link_{len(conflicts) + 1:03d}",
            "title": f"Link: {short_page_label} → {team2}",
            "team1": team1,
            "team2": team2,
            "topic": "Outbound link",
            "severity": "low",
            "status": "ongoing",
            "date": None,
            "description": f"Inferred from page link (any website).",
        })

    return {
        "nodes": nodes,
        "edges": edges,
        "decisions": [],
        "conflicts": conflicts,
        "dependencies": [],
        "insights": [],
    }


def fetch_graph_from_url(url: str) -> dict[str, Any]:
    """
    Fetch any URL and build a graph.
    - If the response is JSON (nodes/edges or wrapped in data/result/graph): normalize and return.
    - If the response is HTML (any website): scrape title and links, build graph from page + outbound links.
    """
    with httpx.Client(timeout=30.0, follow_redirects=True) as client:
        r = client.get(url)
        r.raise_for_status()
        text = r.text
        content_type = (r.headers.get("content-type") or "").lower()
        final_url = str(r.url)

    # Try JSON first
    if "application/json" in content_type or text.strip().startswith("{"):
        try:
            data = json.loads(text)
            if isinstance(data, dict):
                return _normalize_graph_payload(data)
        except json.JSONDecodeError:
            pass

    # Treat as HTML (any website)
    if "<" in text and ("<html" in text.lower() or "<title" in text.lower() or "<a " in text.lower()):
        return _graph_from_html(text, final_url)

    raise ValueError(
        "URL did not return JSON (nodes/edges) or HTML. "
        "Use an API that returns JSON, or a normal website URL (e.g. https://example.com)."
    )
