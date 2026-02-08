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


def extract_deadlines_from_text(text: str) -> list[dict[str, Any]]:
    """Extract deadline/date mentions from text."""
    text_lower = text.lower()
    findings = []

    # Weekday patterns: "deadline is friday", "due friday", "by wednesday"
    for day_name, day_num in WEEKDAYS.items():
        pattern = rf"\b(deadline|due|by|target|launch)\s+(?:is\s+)?{day_name}\b"
        if re.search(pattern, text_lower, re.I):
            findings.append({
                "type": "weekday",
                "value": day_name.title(),
                "context": "mentioned in text",
            })

    # Month + day: "March 1", "Feb 15th", "April 15"
    month_day = re.findall(
        r"\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?\b",
        text_lower,
        re.I,
    )
    for month, day in month_day:
        if month in MONTHS:
            findings.append({
                "type": "date",
                "value": f"{month.title()} {day}",
                "context": "mentioned in text",
            })

    # Numeric dates: "Feb 15", "3/1"
    short_date = re.findall(r"\b(feb|mar|apr|jun|jul|aug|sep|oct|nov|dec|jan)\s+(\d{1,2})\b", text_lower)
    for month, day in short_date:
        if month in MONTHS:
            findings.append({
                "type": "date",
                "value": f"{month.title()} {day}",
                "context": "mentioned in text",
            })

    return findings


def extract_deadlines_from_kg(knowledge_graph: dict) -> list[dict[str, Any]]:
    """Extract deadline/date mentions from knowledge graph content."""
    findings = []
    seen = set()

    def add_finding(value: str, source: str, author: str = "", teams: list = None):
        key = (value.lower(), source)
        if key in seen:
            return
        seen.add(key)
        findings.append({
            "type": "date" if any(m in value.lower() for m in MONTHS) else "weekday",
            "value": value,
            "source": source,
            "author": author,
            "teams": teams or [],
        })

    for d in knowledge_graph.get("decisions", []):
        title = d.get("title", "")
        reasoning = d.get("reasoning", "")
        change = d.get("change", "")
        author = d.get("author", "")
        text = f"{title} {reasoning} {change}"

        for day_name in WEEKDAYS:
            if re.search(rf"\b{day_name}\b", text.lower()):
                add_finding(day_name.title(), f"Decision: {title}", author)

        for month in MONTHS:
            match = re.search(rf"\b{month}\s+(\d{{1,2}})(?:st|nd|rd|th)?\b", text.lower())
            if match:
                add_finding(f"{month.title()} {match.group(1)}", f"Decision: {title}", author)

    for c in knowledge_graph.get("conflicts", []):
        desc = c.get("description", "")
        team1 = c.get("team1", "")
        team2 = c.get("team2", "")
        for day_name in WEEKDAYS:
            if re.search(rf"\b{day_name}\b", desc.lower()):
                add_finding(day_name.title(), f"Conflict: {c.get('topic', '')}", teams=[team1, team2])
        for month in MONTHS:
            match = re.search(rf"\b{month}\s+(\d{{1,2}})(?:st|nd|rd|th)?\b", desc.lower())
            if match:
                add_finding(f"{month.title()} {match.group(1)}", f"Conflict: {c.get('topic', '')}", teams=[team1, team2])

    for dep in knowledge_graph.get("dependencies", []):
        desc = dep.get("description", "")
        blocker = dep.get("blocker", "")
        for month in MONTHS:
            match = re.search(rf"\b{month}\s+(\d{{1,2}})(?:st|nd|rd|th)?\b", desc.lower())
            if match:
                add_finding(f"{month.title()} {match.group(1)}", f"Dependency: {blocker}")

    return findings


def find_contradictions(
    new_input: str, knowledge_graph: dict
) -> list[dict[str, Any]]:
    """
    Cross-reference new input with KG and return detected contradictions.

    Returns list of:
    {
        "type": "deadline_mismatch" | "date_conflict" | "semantic_conflict",
        "source_new": "Voice note / Meeting summary",
        "source_kg": "Decision: Q1 Launch",
        "new_value": "Friday",
        "kg_value": "Wednesday",
        "description": "Deadline mismatch: Manager said Friday, document says Wednesday",
        "parties_to_notify": ["Sarah Chen", "Marcus Johnson"],
        "suggestion": "Notify both parties to align on the correct deadline."
    }
    """
    contradictions = []

    input_deadlines = extract_deadlines_from_text(new_input)
    kg_deadlines = extract_deadlines_from_kg(knowledge_graph)

    # Build set of weekdays mentioned in KG for the same topic
    kg_weekdays = {f["value"].lower() for f in kg_deadlines if f["type"] == "weekday"}
    kg_dates = {f["value"].lower() for f in kg_deadlines if f["type"] == "date"}

    for inv in input_deadlines:
        inv_val = inv["value"].lower()

        # Check weekday conflicts: input says "Friday", KG says "Wednesday"
        if inv["type"] == "weekday" and kg_weekdays:
            for kg in kg_deadlines:
                if kg["type"] == "weekday" and kg["value"].lower() != inv_val:
                    parties = []
                    if kg.get("author"):
                        parties.append(kg["author"])
                    parties.extend(kg.get("teams", []))
                    parties = list(dict.fromkeys(parties))

                    contradictions.append({
                        "type": "deadline_mismatch",
                        "source_new": "New input (voice note / meeting)",
                        "source_kg": kg.get("source", "Knowledge Graph"),
                        "new_value": inv["value"],
                        "kg_value": kg["value"],
                        "description": f"Deadline contradiction: New info says '{inv['value']}' but Knowledge Graph records '{kg['value']}' for the same context.",
                        "parties_to_notify": parties[:5],
                        "suggestion": "Notify both parties to resolve the deadline discrepancy before it causes project delays.",
                    })
                    break

        # If input has weekday but KG only has dates: flag potential mismatch
        if inv["type"] == "weekday" and not kg_weekdays and kg_dates:
            for kg in kg_deadlines:
                if kg["type"] == "date":
                    parties = []
                    if kg.get("author"):
                        parties.append(kg["author"])
                    parties.extend(kg.get("teams", []))
                    parties = list(dict.fromkeys(parties))
                    contradictions.append({
                        "type": "deadline_mismatch",
                        "source_new": "New input (voice note / meeting)",
                        "source_kg": kg.get("source", "Knowledge Graph"),
                        "new_value": inv["value"],
                        "kg_value": kg["value"],
                        "description": f"Deadline contradiction: New info says '{inv['value']}' but Knowledge Graph has '{kg['value']}' on record. These may refer to the same milestone—verify and align.",
                        "parties_to_notify": parties[:5],
                        "suggestion": "Notify both parties to resolve the deadline discrepancy immediately.",
                    })
                    break

        # Check date conflicts: input says "March 1", KG says "Feb 28"
        if inv["type"] == "date" and kg_dates:
            for kg in kg_deadlines:
                if kg["type"] == "date" and kg["value"].lower() != inv_val:
                    parties = []
                    if kg.get("author"):
                        parties.append(kg["author"])
                    parties.extend(kg.get("teams", []))
                    parties = list(dict.fromkeys(parties))

                    contradictions.append({
                        "type": "date_conflict",
                        "source_new": "New input (voice note / meeting)",
                        "source_kg": kg.get("source", "Knowledge Graph"),
                        "new_value": inv["value"],
                        "kg_value": kg["value"],
                        "description": f"Date contradiction: New info says '{inv['value']}' but Knowledge Graph has '{kg['value']}' on record.",
                        "parties_to_notify": parties[:5],
                        "suggestion": "Align on the correct date and update the Knowledge Graph to prevent downstream confusion.",
                    })
                    break

    # If no date/weekday contradictions found, do semantic check on decisions
    # Look for conflicting keywords (e.g. different numbers, opposing terms)
    input_lower = new_input.lower()
    for d in knowledge_graph.get("decisions", []):
        title = d.get("title", "")
        reasoning = d.get("reasoning", "").lower()
        # Extract numbers from both
        input_nums = set(re.findall(r"\b(\d+)\b", input_lower))
        kg_nums = set(re.findall(r"\b(\d+)\b", reasoning))
        # If both mention the same topic but different numbers (e.g. budget, headcount)
        topic_words = ["budget", "launch", "deadline", "headcount", "hiring", "cost", "price"]
        if any(t in input_lower for t in topic_words) and any(t in reasoning for t in topic_words):
            conflicting = input_nums - kg_nums
            if conflicting and kg_nums:
                contradictions.append({
                    "type": "semantic_conflict",
                    "source_new": "New input",
                    "source_kg": f"Decision: {title}",
                    "new_value": f"Numbers mentioned: {', '.join(sorted(conflicting)[:3])}",
                    "kg_value": f"Numbers on record: {', '.join(sorted(kg_nums)[:3])}",
                    "description": f"Potential mismatch between new input and recorded decision '{title}'. Different figures may indicate a contradiction.",
                    "parties_to_notify": [d.get("author", "")] if d.get("author") else [],
                    "suggestion": "Verify with the decision author that the new information aligns with the approved decision.",
                })

    return contradictions


def run_critic_agent(new_input: str, knowledge_graph: dict) -> dict:
    """
    Main entry: analyze new input against KG and return contradictions + analysis.
    """
    contradictions = find_contradictions(new_input, knowledge_graph)

    return {
        "input_summary": new_input[:200] + ("..." if len(new_input) > 200 else ""),
        "contradictions": contradictions,
        "contradiction_count": len(contradictions),
        "has_contradictions": len(contradictions) > 0,
        "recommendation": (
            "Immediate action required: Notify the parties listed in each contradiction to resolve before proceeding."
            if contradictions
            else "No contradictions detected. New information aligns with the Knowledge Graph."
        ),
    }
