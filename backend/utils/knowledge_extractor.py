"""
Extract knowledge graph entities from emails using Google Gemini (FREE tier)
"""

import os
import json
import math
import re
from datetime import datetime
from typing import List, Dict

import google.generativeai as genai
from dotenv import load_dotenv

# Load .env from backend directory (works when run from any cwd)
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_backend_dir, ".env"))

api_key = (os.getenv("GEMINI_API_KEY") or "").strip()
if not api_key or not api_key.startswith("AIza"):
    raise ValueError(
        "GEMINI_API_KEY not found or invalid. Add it to backend/.env (starts with AIza...)"
    )
genai.configure(api_key=api_key)


def extract_entities_batch(emails: List[Dict]) -> Dict:
    """
    Extract people, decisions, topics, and relationships from emails
    Uses Claude Sonnet 4 for intelligent analysis
    """

    # Prepare batch of emails for analysis (process all emails!)
    email_texts = "\n\n".join([
        f"Email {i+1} (Thread: {e.get('thread_id', 'unknown')}, Position: {e.get('thread_position', 1)}):\n"
        f"From: {e['sender']} ({e['sender_role']}, {e['sender_team']} team)\n"
        f"Topic: {e['topic']}\n"
        f"Type: {e['type']}\n"
        f"Content: {e['content']}\n"
        f"Timestamp: {e['timestamp']}"
        for i, e in enumerate(emails)
    ])

    prompt = f"""You are an expert organizational intelligence analyst building a knowledge graph from company communications.

Your task: Analyze these {len(emails)} emails and extract a comprehensive knowledge graph that reveals:

1. **KEY PEOPLE** - Who are the decision makers and influencers?
2. **DECISIONS** - What decisions were made and how did they evolve?
3. **TOPICS** - What are the major initiatives and concerns?
4. **CONFLICTS** - Where are teams or individuals in disagreement?
5. **DEPENDENCIES** - What depends on what? What's blocking what?
6. **TEAM DYNAMICS** - Which teams collaborate well vs. have tension?

CRITICAL INSTRUCTIONS:

- Track DECISION EVOLUTION: When a decision changes across emails in a thread, create version history
- Identify CONFLICTS: When people/teams disagree, flag it with severity (high/medium/low)
- Calculate CENTRALITY: Rate each person's influence from 0.0 to 1.0 based on their role in decisions
- Assess STATUS: Mark nodes as "active" (recent activity), "aging" (getting stale), "conflicted" (disagreement), or "stale" (old)
- Find DEPENDENCIES: What projects/decisions depend on others?

Return a JSON object with this EXACT structure:

{{
  "nodes": [
    {{
      "id": "unique_id",
      "type": "person|decision|topic",
      "label": "Sarah Chen",
      "status": "active|aging|conflicted|stale",
      "team": "Product",
      "role": "VP Product",
      "centrality": 0.9,
      "last_active": "ISO timestamp",
      "reasoning": "why this node is important (1 sentence)"
    }}
  ],
  "edges": [
    {{
      "source": "node_id_1",
      "target": "node_id_2",
      "type": "influences|depends_on|conflicts_with|collaborates_with",
      "strength": 0.8,
      "reasoning": "why this connection exists (1 sentence)"
    }}
  ],
  "decisions": [
    {{
      "id": "decision_id",
      "title": "Q1 Product Launch Date",
      "version": 2,
      "current_state": "final decision content",
      "author": "Sarah Chen",
      "timestamp": "ISO timestamp of final decision",
      "evolution": [
        {{
          "version": 1,
          "state": "Initial proposal: March 1st by Engineering",
          "timestamp": "ISO timestamp",
          "author": "Marcus Johnson"
        }},
        {{
          "version": 2,
          "state": "Final decision: March 1st confirmed by exec team",
          "timestamp": "ISO timestamp",
          "author": "Sarah Chen"
        }}
      ],
      "impact": "high|medium|low",
      "affected_teams": ["Product", "Engineering", "Marketing"],
      "reasoning": "why this decision matters (1 sentence)"
    }}
  ],
  "conflicts": [
    {{
      "id": "conflict_id",
      "title": "Pricing Strategy Disagreement",
      "team1": "Finance",
      "team2": "Product",
      "people_involved": ["David Kim", "Maria Garcia"],
      "topic": "Pro tier pricing ($99 vs $119)",
      "severity": "high|medium|low",
      "status": "resolved|ongoing|escalated",
      "description": "what the conflict is about (2 sentences)",
      "resolution": "how it was resolved (if resolved)",
      "timestamp": "ISO timestamp of conflict emergence"
    }}
  ],
  "dependencies": [
    {{
      "id": "dependency_id",
      "blocker": "API v3 Development",
      "blocked": "Q1 Product Launch",
      "type": "hard_dependency|soft_dependency|risk",
      "description": "Launch depends on API v3 completion by Feb 15th",
      "risk_level": "high|medium|low"
    }}
  ],
  "insights": [
    {{
      "type": "trend|risk|opportunity",
      "title": "Resource Contention Pattern",
      "description": "Engineering team is bottleneck for 3 major initiatives",
      "affected_nodes": ["node_id_1", "node_id_2"],
      "severity": "high|medium|low"
    }}
  ]
}}

IMPORTANT:
- Be thorough - analyze ALL emails
- Track how decisions evolve through threads
- Identify patterns (e.g., recurring conflicts between same teams)
- Calculate realistic centrality based on decision-making power
- Use actual timestamps from emails

Emails to analyze:

{email_texts}

Return ONLY the JSON object, no other text.
"""

    print("🧠 Calling Google Gemini for knowledge extraction...")
    print(f"📧 Processing {len(emails)} emails...")

    model = genai.GenerativeModel("gemini-2.0-flash")
    response = model.generate_content(
        prompt,
        generation_config=genai.types.GenerationConfig(
            max_output_tokens=16000,
            temperature=0.3,
        ),
    )

    # Extract the text content
    response_text = response.text

    # Parse the JSON response
    try:
        result = json.loads(response_text)

        print("✅ Extraction complete!")
        print(f"   Nodes: {len(result.get('nodes', []))}")
        print(f"   Edges: {len(result.get('edges', []))}")
        print(f"   Decisions: {len(result.get('decisions', []))}")
        print(f"   Conflicts: {len(result.get('conflicts', []))}")
        print(f"   Dependencies: {len(result.get('dependencies', []))}")
        print(f"   Insights: {len(result.get('insights', []))}")

        return result

    except json.JSONDecodeError as e:
        # Try to extract JSON from markdown code block if present
        json_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", response_text)
        if json_match:
            try:
                result = json.loads(json_match.group(1).strip())
                print("✅ Extraction complete (parsed from code block)!")
                print(f"   Nodes: {len(result.get('nodes', []))}")
                print(f"   Edges: {len(result.get('edges', []))}")
                print(f"   Decisions: {len(result.get('decisions', []))}")
                print(f"   Conflicts: {len(result.get('conflicts', []))}")
                print(f"   Dependencies: {len(result.get('dependencies', []))}")
                print(f"   Insights: {len(result.get('insights', []))}")
                return result
            except json.JSONDecodeError:
                pass
        print(f"❌ Error parsing Gemini response: {e}")
        print(f"Response was: {response_text[:500]}...")
        return {
            "nodes": [],
            "edges": [],
            "decisions": [],
            "conflicts": [],
            "dependencies": [],
            "insights": []
        }


def calculate_knowledge_decay(timestamp_str: str) -> float:
    """
    Calculate decay factor based on how old the information is
    Returns 0.0 to 1.0 where 1.0 = fresh, 0.0 = very stale
    """
    try:
        timestamp = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return 0.5

    now = datetime.now()
    if timestamp.tzinfo:
        now = datetime.now(timestamp.tzinfo)
    days_old = (now - timestamp).days

    # Decay formula: exponential decay over 14 days
    decay = math.exp(-days_old / 14.0)
    return round(decay, 2)


def enhance_with_metadata(knowledge_graph: Dict, emails: List[Dict]) -> Dict:
    """
    Add decay scores, freshness indicators, and additional analytics
    """

    print("\n⚡ Enhancing knowledge graph with metadata...")

    # Create timestamp index
    topic_timestamps = {}
    person_timestamps = {}

    for email in emails:
        topic = email["topic"]
        sender = email["sender"]
        timestamp = email["timestamp"]

        topic_timestamps[topic] = max(
            topic_timestamps.get(topic, ""),
            timestamp
        )
        person_timestamps[sender] = max(
            person_timestamps.get(sender, ""),
            timestamp
        )

    default_ts = emails[0]["timestamp"] if emails else ""

    # Enhance nodes with decay
    for node in knowledge_graph.get("nodes", []):
        if node["type"] == "person":
            last_mention = person_timestamps.get(node["label"], default_ts)
        elif node["type"] == "topic":
            last_mention = topic_timestamps.get(node["label"], default_ts)
        else:
            # Decision nodes - find in decisions list
            decision = next(
                (d for d in knowledge_graph.get("decisions", []) if d.get("id") == node.get("id")),
                None
            )
            last_mention = decision["timestamp"] if decision and decision.get("timestamp") else default_ts

        node["last_mentioned"] = last_mention
        node["decay"] = calculate_knowledge_decay(last_mention) if last_mention else 0.5

        # Adjust status based on decay if not already set
        if node["decay"] < 0.2:
            node["status"] = "stale"
        elif node["decay"] < 0.5 and node.get("status") != "conflicted":
            node["status"] = "aging"

    # Enhance conflicts with age
    for conflict in knowledge_graph.get("conflicts", []):
        ts = conflict.get("timestamp", default_ts)
        conflict["decay"] = calculate_knowledge_decay(ts) if ts else 0.5
        conflict["is_recent"] = conflict["decay"] > 0.7

    # Enhance decisions with freshness
    for decision in knowledge_graph.get("decisions", []):
        ts = decision.get("timestamp", default_ts)
        decision["decay"] = calculate_knowledge_decay(ts) if ts else 0.5
        decision["is_recent"] = decision["decay"] > 0.7

    print(f"✅ Enhanced {len(knowledge_graph.get('nodes', []))} nodes with decay scores")

    return knowledge_graph


def process_emails_to_graph(email_file: str = "data/company_emails.json"):
    """
    Main function: Load emails → Extract knowledge → Enhance → Save
    """

    print("📧 Loading emails from synthetic dataset...")

    try:
        with open(email_file, "r") as f:
            emails = json.load(f)
    except FileNotFoundError:
        print(f"❌ Error: {email_file} not found!")
        print("💡 Run 'python data/synthetic_company_data.py' first to generate the dataset")
        return None

    print(f"✅ Loaded {len(emails)} emails")

    print("\n🧠 Extracting knowledge graph with Google Gemini...")
    print("⏳ This may take 30-60 seconds...")

    knowledge_graph = extract_entities_batch(emails)

    print("\n⚡ Enhancing with metadata...")
    knowledge_graph = enhance_with_metadata(knowledge_graph, emails)

    # Ensure data directory exists
    os.makedirs("data", exist_ok=True)

    # Save processed data
    output_file = "data/knowledge_graph.json"
    with open(output_file, "w") as f:
        json.dump(knowledge_graph, f, indent=2)

    print(f"\n💾 Saved knowledge graph to: {output_file}")

    # Print summary
    print("\n" + "=" * 60)
    print("📊 KNOWLEDGE GRAPH SUMMARY")
    print("=" * 60)
    nodes = knowledge_graph.get("nodes", [])
    print(f"Total Nodes: {len(nodes)}")
    print(f"  - People: {len([n for n in nodes if n.get('type') == 'person'])}")
    print(f"  - Topics: {len([n for n in nodes if n.get('type') == 'topic'])}")
    print(f"  - Decisions: {len([n for n in nodes if n.get('type') == 'decision'])}")
    print(f"\nTotal Edges: {len(knowledge_graph.get('edges', []))}")
    print(f"Total Decisions: {len(knowledge_graph.get('decisions', []))}")
    conflicts = knowledge_graph.get("conflicts", [])
    print(f"Total Conflicts: {len(conflicts)}")
    print(f"  - Ongoing: {len([c for c in conflicts if c.get('status') == 'ongoing'])}")
    print(f"  - Resolved: {len([c for c in conflicts if c.get('status') == 'resolved'])}")
    print(f"\nTotal Dependencies: {len(knowledge_graph.get('dependencies', []))}")
    print(f"Total Insights: {len(knowledge_graph.get('insights', []))}")
    print("=" * 60)
    print("\n✨ Knowledge extraction complete!")
    print("💰 Using Gemini FREE tier - no cost!")

    return knowledge_graph


if __name__ == "__main__":
    process_emails_to_graph()
