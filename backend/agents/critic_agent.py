"""
Critic Agent: Cross-references new information (voice notes, meeting summaries)
with the Knowledge Graph to detect contradictions.

Example: Manager says "Deadline is Friday" but Document says "Deadline is Wednesday"
→ Flags contradiction and suggests notifying both parties.
"""

import re
from typing import Any


# Weekday patterns for date extraction
WEEKDAYS = {
    "monday": 0, "mon": 0,
    "tuesday": 1, "tue": 1, "tues": 1,
    "wednesday": 2, "wed": 2,
    "thursday": 3, "thu": 3, "thur": 3, "thurs": 3,
    "friday": 4, "fri": 4,
    "saturday": 5, "sat": 5,
    "sunday": 6, "sun": 6,
}

# Date patterns: "March 1", "Feb 15", "April 15th", "Feb 28"
MONTHS = {
    "january": 1, "jan": 1, "february": 2, "feb": 2, "march": 3, "mar": 3,
    "april": 4, "apr": 4, "may": 5, "june": 6, "jun": 6, "july": 7, "jul": 7,
    "august": 8, "aug": 8, "september": 9, "sep": 9, "sept": 9,
    "october": 10, "oct": 10, "november": 11, "nov": 11, "december": 12, "dec": 12,
}


def extract_deadlines_from_text(text: str | None) -> list[dict[str, Any]]:
    """Extract deadline/date mentions from any user input using regex."""
    text_lower = (text or "").lower()
    findings = []
    seen = set()

    def add_weekday(value: str):
        key = ("weekday", value.lower())
        if key not in seen:
            seen.add(key)
            findings.append({"type": "weekday", "value": value.title(), "context": "mentioned in text"})

    def add_date(value: str):
        key = ("date", value.lower())
        if key not in seen:
            seen.add(key)
            findings.append({"type": "date", "value": value, "context": "mentioned in text"})

    # Weekday patterns – flexible for any natural input:
    # "deadline is Friday", "due Friday", "by Wednesday", "on Monday", "for Tuesday"
    # "launch Friday", "ship Wednesday", "meeting Friday", "delivery Monday"
    # "Friday is the deadline", "Wednesday works", "next Friday", "this Monday"
    weekday_triggers = (
        r"(deadline|due|by|on|for|target|launch|meeting|ship|delivery|scheduled|planned|set|push|move|shift)"
        r"\s+(?:is\s+|for\s+|to\s+)?(?:next\s+|this\s+)?"
    )
    for day_name in WEEKDAYS:
        # Trigger + weekday: "deadline Friday", "due by Wednesday"
        if re.search(rf"\b{weekday_triggers}{day_name}\b", text_lower, re.I):
            add_weekday(day_name)
        # Weekday + trigger: "Friday is the deadline", "Wednesday we launch"
        if re.search(rf"\b(?:next\s+|this\s+)?{day_name}\s+(?:is\s+)?(?:the\s+)?(deadline|due|date|launch|meeting|ship)\b", text_lower, re.I):
            add_weekday(day_name)
        # Preposition + weekday: "on Friday", "by Wednesday", "for Monday"
        if re.search(rf"\b(?:on|by|for)\s+(?:next\s+|this\s+)?{day_name}\b", text_lower, re.I):
            add_weekday(day_name)
        # Standalone weekday in date context (near deadline/launch/etc):
        if re.search(rf"\b(?:deadline|launch|due|meeting|ship|delivery)[^.]*?\b{day_name}\b", text_lower, re.I):
            add_weekday(day_name)
        # "Friday" or "Wednesday" alone when text mentions dates/deadlines
        if re.search(rf"\b{day_name}\b", text_lower) and re.search(r"\b(deadline|due|launch|meeting|date|schedule|timeline)\b", text_lower, re.I):
            add_weekday(day_name)

    # Month + day: "March 1", "Feb 15th", "April 15", "15 March", "15th of March"
    for pattern in [
        r"\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?\b",
        r"\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\b",
    ]:
        for m in re.finditer(pattern, text_lower, re.I):
            groups = m.groups()
            month = groups[0] if groups[0].isalpha() else groups[1]
            day = groups[1] if groups[1].isdigit() else groups[0]
            if month in MONTHS:
                add_date(f"{month.title()} {day}")

    # Numeric: "3/15", "3-15", "15/3", "2025-03-15"
    for m in re.finditer(r"\b(\d{1,2})[/\-](\d{1,2})(?:[/\-](\d{2,4}))?\b", text_lower):
        add_date(f"{m.group(1)}/{m.group(2)}")

    return findings


def _safe_str(x: Any) -> str:
    """Return non-None string for KG fields that may be None (e.g. from URL/CSV)."""
    if x is None:
        return ""
    return str(x).strip()


def _normalize_date_for_compare(value: str | None) -> str:
    """Normalize 'March 1, 2025', 'March 1', 'Mar 1' to 'march 1' for comparison."""
    v = _safe_str(value).lower()
    # Strip year (e.g. ", 2025")
    v = re.sub(r",\s*\d{4}\b", "", v)
    # Expand month abbreviations so "feb 15" matches "february 15"
    full_months = [
        ("jan", "january"), ("feb", "february"), ("mar", "march"), ("apr", "april"),
        ("jun", "june"), ("jul", "july"), ("aug", "august"), ("sep", "september"),
        ("oct", "october"), ("nov", "november"), ("dec", "december"),
    ]
    for short, full in full_months:
        v = re.sub(rf"\b{short}\b", full, v)
    v = re.sub(r"\s+", " ", v).strip()
    return v


def extract_deadlines_from_kg(knowledge_graph: dict | None) -> list[dict[str, Any]]:
    """
    One canonical date per KG item (day + year). Prefer "date" field; fallback to regex in text.
    Each finding has: value (display with year), value_normalized (for compare), source, topic, author/teams.
    """
    findings = []
    if not knowledge_graph or not isinstance(knowledge_graph, dict):
        return findings

    for d in knowledge_graph.get("decisions") or []:
        if not isinstance(d, dict):
            continue
        title = _safe_str(d.get("title"))
        author = _safe_str(d.get("author"))
        canonical = _safe_str(d.get("date"))
        if canonical:
            findings.append({
                "type": "date",
                "value": canonical,
                "value_normalized": _normalize_date_for_compare(canonical),
                "source": f"Decision: {title}",
                "topic": title,
                "author": author,
                "teams": [],
            })
            continue
        reasoning = _safe_str(d.get("reasoning")) + " " + _safe_str(d.get("change"))
        for month in MONTHS:
            match = re.search(rf"\b{month}\s+(\d{{1,2}})(?:st|nd|rd|th)?(?:\s*,\s*\d{{4}})?\b", reasoning.lower())
            if match:
                raw = match.group(0).title()
                findings.append({
                    "type": "date",
                    "value": raw,
                    "value_normalized": _normalize_date_for_compare(raw),
                    "source": f"Decision: {title}",
                    "topic": title,
                    "author": author,
                    "teams": [],
                })
                break

    for dep in knowledge_graph.get("dependencies") or []:
        if not isinstance(dep, dict):
            continue
        blocker = _safe_str(dep.get("blocker"))
        blocked = _safe_str(dep.get("blocked"))
        source_label = f"Dependency: {blocker} → {blocked}"
        canonical = _safe_str(dep.get("date"))
        if canonical:
            findings.append({
                "type": "date",
                "value": canonical,
                "value_normalized": _normalize_date_for_compare(canonical),
                "source": source_label,
                "topic": f"{blocker} {blocked}",
                "author": "",
                "teams": [],
            })
            continue
        desc = _safe_str(dep.get("description"))
        for month in MONTHS:
            match = re.search(rf"\b{month}\s+(\d{{1,2}})(?:st|nd|rd|th)?(?:\s*,\s*\d{{4}})?\b", desc.lower())
            if match:
                raw = match.group(0).title()
                findings.append({
                    "type": "date",
                    "value": raw,
                    "value_normalized": _normalize_date_for_compare(raw),
                    "source": source_label,
                    "topic": f"{blocker} {blocked}",
                    "author": "",
                    "teams": [],
                })
                break

    for c in knowledge_graph.get("conflicts") or []:
        if not isinstance(c, dict):
            continue
        title = _safe_str(c.get("title"))
        topic = _safe_str(c.get("topic")) or title
        team1 = _safe_str(c.get("team1"))
        team2 = _safe_str(c.get("team2"))
        canonical = _safe_str(c.get("date"))
        if canonical:
            findings.append({
                "type": "date",
                "value": canonical,
                "value_normalized": _normalize_date_for_compare(canonical),
                "source": f"Conflict: {title}",
                "topic": f"{title} {topic}",
                "author": "",
                "teams": [team1, team2] if team1 or team2 else [],
            })

    return findings


def _topic_matches(user_text: str, kg_topic: str | None) -> bool:
    """True if user text likely refers to the same topic as the KG item (e.g. meeting, Q1 launch)."""
    if not kg_topic:
        return False
    u = (user_text or "").lower()
    t = (kg_topic or "").lower()
    # Extract meaningful tokens from KG topic (e.g. "Q1 Product Launch Date" -> q1, product, launch, date)
    kg_tokens = set(re.findall(r"[a-z0-9]+", t))
    kg_tokens.discard("the")
    kg_tokens.discard("and")
    if not kg_tokens:
        return False
    # User text mentions at least one of these (e.g. "meeting on march 1" + "Q1 Product Launch" -> launch)
    overlap = [w for w in kg_tokens if len(w) > 1 and w in u]
    if overlap:
        return True
    # Or user said "meeting" / "launch" / "deadline" and topic has "launch" etc.
    generic = {"meeting", "launch", "deadline", "date", "q1", "api", "pricing", "feb", "march", "february"}
    return bool(generic & kg_tokens and any(g in u for g in generic))


def find_contradictions(
    new_input: str | None, knowledge_graph: dict | None
) -> list[dict[str, Any]]:
    """
    Cross-reference new input with KG. Only flag when the same topic has a different date.
    KG has one canonical date (day + year) per item. Safe for any graph shape (URL/CSV/synthetic).
    """
    contradictions = []
    new_input = new_input or ""
    kg = knowledge_graph if isinstance(knowledge_graph, dict) else {}

    input_deadlines = extract_deadlines_from_text(new_input)
    kg_deadlines = extract_deadlines_from_kg(kg)
    input_lower = new_input.lower()

    # Only flag if user's date does NOT match ANY topic-matching KG item (KG never "changes" – we only flag real mismatches)
    for inv in input_deadlines:
        inv_val = inv.get("value")
        inv_normalized = _normalize_date_for_compare(inv_val)
        matching_kg = [kg for kg in kg_deadlines if _topic_matches(input_lower, kg.get("topic"))]
        # If any topic-matching item has the same date, user is aligned with the graph – no contradiction
        if any(
            inv_normalized == (kg.get("value_normalized") or _normalize_date_for_compare(kg.get("value")))
            for kg in matching_kg
        ):
            continue
        # User's date matches no topic-matching item – flag only the first mismatch (one per user date)
        if not matching_kg:
            continue
        kg = matching_kg[0]
        parties = []
        if kg.get("author"):
            parties.append(kg["author"])
        parties.extend(kg.get("teams", []))
        parties = list(dict.fromkeys(parties))[:5]
        contradictions.append({
            "type": "date_conflict",
            "source_new": "New input (voice note / meeting)",
            "source_kg": kg.get("source", "Knowledge Graph"),
            "new_value": inv["value"],
            "kg_value": kg["value"],
            "description": f"Date mismatch: you said '{inv['value']}' but Knowledge Graph has {kg['source']} on {kg['value']}.",
            "parties_to_notify": parties,
            "suggestion": "Align on the correct date and update the Knowledge Graph if needed.",
        })

    # Semantic check: different numbers for same topic (budget, headcount, dates, etc.)
    input_lower = new_input.lower()
    topic_words = [
        "budget", "launch", "deadline", "headcount", "hiring", "cost", "price",
        "timeline", "q1", "q2", "q3", "q4", "million", "thousand", "sprint",
        "revenue", "target", "goal", "team", "people", "engineers", "api",
        "week", "month", "year", "percent", "%", "approved", "confirmed",
    ]
    for d in kg.get("decisions") or []:
        if not isinstance(d, dict):
            continue
        title = _safe_str(d.get("title"))
        reasoning = (_safe_str(d.get("reasoning")) + " " + _safe_str(d.get("change"))).lower()
        input_nums = set(re.findall(r"\b(\d+)\b", input_lower))
        kg_nums = set(re.findall(r"\b(\d+)\b", reasoning))
        # Both mention same topic and have different numbers
        if any(t in input_lower for t in topic_words) and any(t in reasoning for t in topic_words):
            conflicting = input_nums - kg_nums
            if conflicting and kg_nums:
                contradictions.append({
                    "type": "semantic_conflict",
                    "source_new": "New input",
                    "source_kg": f"Decision: {title}",
                    "new_value": f"Numbers mentioned: {', '.join(sorted(conflicting)[:5])}",
                    "kg_value": f"Numbers on record: {', '.join(sorted(kg_nums)[:5])}",
                    "description": f"Potential mismatch between new input and recorded decision '{title}'. Different figures may indicate a contradiction.",
                    "parties_to_notify": [_safe_str(d.get("author"))] if d.get("author") else [],
                    "suggestion": "Verify with the decision author that the new information aligns with the approved decision.",
                })
                break  # One semantic conflict per decision is enough

    return contradictions


def run_critic_agent(new_input: str, knowledge_graph: dict | None) -> dict:
    """
    Main entry: analyze new input against current KG and return contradictions + analysis.
    Works with any graph shape (from URL, CSV, or synthetic); safely handles None/missing fields.
    """
    kg = knowledge_graph if isinstance(knowledge_graph, dict) else {}
    contradictions = find_contradictions(new_input or "", kg)

    summary = (new_input or "")[:200] + ("..." if len(new_input or "") > 200 else "")
    return {
        "input_summary": summary,
        "contradictions": contradictions,
        "contradiction_count": len(contradictions),
        "has_contradictions": len(contradictions) > 0,
        "recommendation": (
            "Immediate action required: Notify the parties listed in each contradiction to resolve before proceeding."
            if contradictions
            else "No contradictions detected. New information aligns with the Knowledge Graph."
        ),
    }
