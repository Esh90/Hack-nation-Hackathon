"""
Multi-agent system: Optimist, Skeptic, Chief of Staff
Uses LangGraph with Groq (default/free), Gemini, OpenAI, or Anthropic.
Falls back to mock data if no API key or API fails.
"""

import os
import json
from typing import TypedDict, Annotated, Sequence
from pathlib import Path

from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, SystemMessage, BaseMessage, AIMessage
from dotenv import load_dotenv
import operator

# Load .env from backend directory
_backend_dir = Path(__file__).resolve().parent.parent
load_dotenv(_backend_dir / ".env")


def _groq_messages_to_api(messages: Sequence[BaseMessage]) -> list:
    """Convert LangChain messages to Groq API format."""
    out = []
    for m in messages:
        if isinstance(m, SystemMessage):
            out.append({"role": "system", "content": m.content})
        elif isinstance(m, HumanMessage):
            out.append({"role": "user", "content": m.content})
        elif hasattr(m, "content"):
            out.append({"role": "assistant", "content": m.content})
    return out


class _GroqChatWrapper:
    """Thin wrapper around Groq API so we don't need langchain-groq (avoids langchain-core 1.x conflict)."""

    def __init__(self, api_key: str, model: str = "llama-3.3-70b-versatile", temperature: float = 0.7, max_tokens: int = 4000):
        from groq import Groq
        self._client = Groq(api_key=api_key)
        self._model = model
        self._temperature = temperature
        self._max_tokens = max_tokens

    def invoke(self, messages: Sequence[BaseMessage]):
        api_messages = _groq_messages_to_api(messages)
        resp = self._client.chat.completions.create(
            model=self._model,
            messages=api_messages,
            temperature=self._temperature,
            max_tokens=self._max_tokens,
        )
        content = resp.choices[0].message.content or ""
        return AIMessage(content=content)


# LLM selection: Groq (default/free, Llama 3.x 70B) → Gemini → OpenAI → Anthropic.
_groq_key = (os.getenv("GROQ_API_KEY") or "").strip()
_openai_key = (os.getenv("OPENAI_API_KEY") or "").strip()
_gemini_key = (os.getenv("GEMINI_API_KEY") or "").strip()
_anthropic_key = (os.getenv("ANTHROPIC_API_KEY") or "").strip()

llm = None
_model_name = "None"

if _groq_key and _groq_key.startswith("gsk_"):
    try:
        llm = _GroqChatWrapper(
            api_key=_groq_key,
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=4000,
        )
        _model_name = "Groq (Llama 3.3 70B)"
        print("  ✓ Shadow Council: Using Groq (GROQ_API_KEY) [default]")
    except Exception as e:
        print(f"  ⚠ Groq init failed: {e}. Will try next provider or mock on queries.")
if llm is None and _gemini_key and _gemini_key.startswith("AIza"):
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        llm = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            temperature=0.7,
            google_api_key=_gemini_key,
            max_tokens=4000,
        )
        _model_name = "Google Gemini"
        print("  ✓ Shadow Council: Using Gemini (GEMINI_API_KEY)")
    except Exception as e:
        print(f"  ⚠ Gemini init failed: {e}. Will try next provider or mock on queries.")
if llm is None and _openai_key and (_openai_key.startswith("sk-") or _openai_key.startswith("sk-proj-")):
    try:
        from langchain_openai import ChatOpenAI
        llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.7,
            api_key=_openai_key,
            max_tokens=4000,
        )
        _model_name = "OpenAI GPT-4o-mini"
        print("  ✓ Shadow Council: Using OpenAI (OPENAI_API_KEY)")
    except Exception as e:
        print(f"  ⚠ OpenAI init failed: {e}. Will use mock on queries.")
if llm is None and _anthropic_key and _anthropic_key.startswith("sk-ant"):
    try:
        from langchain_anthropic import ChatAnthropic
        llm = ChatAnthropic(
            model="claude-sonnet-4-20250514",
            temperature=0.7,
            api_key=_anthropic_key,
            max_tokens=4000,
        )
        _model_name = "Anthropic Claude"
        print("  ✓ Shadow Council: Using Anthropic (ANTHROPIC_API_KEY)")
    except Exception as e:
        print(f"  ⚠ Anthropic init failed: {e}. Will use mock on queries.")

if llm is None:
    print("  ⚠ Shadow Council: No API key (GROQ_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY). Using mock data.")


# State shared across agents
class CouncilState(TypedDict):
    question: str
    context: dict
    messages: Annotated[Sequence[BaseMessage], operator.add]
    optimist_view: str
    skeptic_view: str
    final_answer: str
    reasoning_trace: list


def format_context_summary(context: dict) -> str:
    """Create a concise summary of the knowledge graph for agents"""

    nodes = context.get("nodes", [])
    decisions = context.get("decisions", [])
    conflicts = context.get("conflicts", [])
    dependencies = context.get("dependencies", [])
    insights = context.get("insights", [])

    active_nodes = [n for n in nodes if n.get("status") == "active"]
    stale_nodes = [n for n in nodes if n.get("status") == "stale"]
    conflicted_nodes = [n for n in nodes if n.get("status") == "conflicted"]
    recent_decisions = [d for d in decisions if d.get("is_recent", False)]
    ongoing_conflicts = [c for c in conflicts if c.get("status") == "ongoing"]
    high_risk_deps = [d for d in dependencies if d.get("risk_level") == "high"]

    summary = f"""
ORGANIZATIONAL KNOWLEDGE SNAPSHOT:

NODES: {len(nodes)} total
  - Active: {len(active_nodes)}
  - Stale: {len(stale_nodes)}
  - Conflicted: {len(conflicted_nodes)}

DECISIONS: {len(decisions)} total
  - Recent (last 2 weeks): {len(recent_decisions)}

CONFLICTS: {len(conflicts)} total
  - Ongoing: {len(ongoing_conflicts)}
  - High severity: {len([c for c in conflicts if c.get("severity") == "high"])}

DEPENDENCIES: {len(dependencies)} total
  - High risk: {len(high_risk_deps)}

INSIGHTS: {len(insights)} strategic insights identified

KEY RECENT DECISIONS:
"""

    for decision in recent_decisions[:3]:
        summary += f"\n  - {decision.get('title')}: {str(decision.get('current_state', 'N/A'))[:100]}"

    if ongoing_conflicts:
        summary += "\n\nONGOING CONFLICTS:\n"
        for conflict in ongoing_conflicts[:3]:
            summary += f"\n  - {conflict.get('title')} ({conflict.get('severity')} severity): {conflict.get('team1')} vs {conflict.get('team2')}"

    if high_risk_deps:
        summary += "\n\nHIGH-RISK DEPENDENCIES:\n"
        for dep in high_risk_deps[:3]:
            summary += f"\n  - {dep.get('blocker')} -> {dep.get('blocked')}: {str(dep.get('description', 'N/A'))[:100]}"

    return summary


def optimist_agent(state: CouncilState) -> CouncilState:
    """Optimist: Highlights opportunities and positive signals"""

    context_summary = format_context_summary(state["context"])

    system_prompt = """You are the OPTIMIST agent in a Shadow Council advising executives on organizational intelligence.

Your role: Identify opportunities, progress, and positive signals from the organizational data.

Style guidelines:
- Be genuinely optimistic but grounded in data
- Highlight momentum and progress
- Identify opportunities emerging from current state
- Keep response to 2-3 sentences
- Be specific - reference actual data points
- Use an encouraging but professional tone"""

    user_prompt = f"""Question from executive: {state['question']}

Current organizational state:
{context_summary}

Provide your optimistic perspective on this question, focusing on:
- What's working well related to this question
- Opportunities this creates
- Positive momentum you see

Remember: Be concise (2-3 sentences) and specific."""

    response = llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt),
    ])

    state["optimist_view"] = response.content
    state["reasoning_trace"].append({
        "agent": "Optimist",
        "output": response.content,
        "timestamp": "now",
    })

    print("\n🌟 OPTIMIST says:")
    print(response.content)

    return state


def skeptic_agent(state: CouncilState) -> CouncilState:
    """Skeptic: Identifies risks, gaps, and concerns"""

    context_summary = format_context_summary(state["context"])

    system_prompt = """You are the SKEPTIC agent in a Shadow Council advising executives on organizational intelligence.

Your role: Identify risks, dependencies, gaps, and potential issues from the organizational data.

Style guidelines:
- Be constructively critical (not negative)
- Highlight real risks and dependencies
- Identify information gaps or uncertainties
- Keep response to 2-3 sentences
- Be specific - reference actual data points
- Use a concerned but professional tone"""

    user_prompt = f"""Question from executive: {state['question']}

Current organizational state:
{context_summary}

The Optimist said:
{state['optimist_view']}

Provide your skeptical perspective on this question, focusing on:
- What could go wrong
- Hidden dependencies or risks
- Information gaps or uncertainties

Remember: Be concise (2-3 sentences) and constructive."""

    response = llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt),
    ])

    state["skeptic_view"] = response.content
    state["reasoning_trace"].append({
        "agent": "Skeptic",
        "output": response.content,
        "timestamp": "now",
    })

    print("\n⚠️  SKEPTIC says:")
    print(response.content)

    return state


def chief_of_staff_agent(state: CouncilState) -> CouncilState:
    """Chief of Staff: Synthesizes both views into actionable guidance"""

    system_prompt = """You are the CHIEF OF STAFF agent - the final decision maker in the Shadow Council.

Your role: Synthesize the Optimist and Skeptic perspectives into clear, actionable executive guidance.

Style guidelines:
- Be decisive but acknowledge nuance
- Balance both perspectives fairly
- Provide clear, actionable guidance
- Identify specific next steps or monitoring points
- Keep response to 3-4 sentences
- Use a calm, executive tone
- Be direct and confident"""

    user_prompt = f"""Question from executive: {state['question']}

OPTIMIST's perspective:
{state['optimist_view']}

SKEPTIC's perspective:
{state['skeptic_view']}

Synthesize both views into a final recommendation that:
- Balances opportunities and risks
- Provides clear guidance
- Identifies specific actions or monitoring points
- Helps the executive make an informed decision

Remember: Be concise (3-4 sentences) and decisive."""

    response = llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt),
    ])

    state["final_answer"] = response.content
    state["reasoning_trace"].append({
        "agent": "Chief of Staff",
        "output": response.content,
        "timestamp": "now",
    })

    print("\n👔 CHIEF OF STAFF says:")
    print(response.content)

    return state


def _mock_response(question: str) -> dict:
    """Fallback when no LLM is configured or API fails. Backend decides; no frontend toggle."""
    return {
        "question": question,
        "optimist_view": "Based on the data, there are positive signals: alignment on Q1 launch priorities, active stakeholder engagement, and clear decision momentum. The knowledge graph shows strong connections between Product and Engineering. Recommend proceeding with confidence while monitoring the Pricing Strategy conflict.",
        "skeptic_view": "However, we should verify: the Finance vs Product conflict on Pro tier pricing may escalate. API v3 Development is a hard dependency blocking Q1 Launch—need to confirm timelines. Resource contention in Engineering could delay multiple initiatives. Validate assumptions before committing.",
        "final_answer": "Synthesis: Proceed with Q1 Launch as the top priority, but resolve the Pricing Strategy conflict with Finance within 2 weeks. Confirm API v3 timeline as a critical path blocker. Monitor Engineering capacity for resource contention. The Shadow Council recommends cautious optimism—move forward while validating key dependencies.",
        "reasoning_trace": [],
    }


def create_shadow_council():
    """Creates the multi-agent workflow using LangGraph"""
    workflow = StateGraph(CouncilState)

    workflow.add_node("optimist", optimist_agent)
    workflow.add_node("skeptic", skeptic_agent)
    workflow.add_node("chief", chief_of_staff_agent)

    workflow.set_entry_point("optimist")
    workflow.add_edge("optimist", "skeptic")
    workflow.add_edge("skeptic", "chief")
    workflow.add_edge("chief", END)

    return workflow.compile()


def query_shadow_council(question: str, knowledge_graph: dict) -> dict:
    """
    Main function to query the Shadow Council.

    Returns:
        {
            "question": str,
            "optimist_view": str,
            "skeptic_view": str,
            "final_answer": str,
            "reasoning_trace": list
        }
    """
    if llm is None:
        print("⚠️  No LLM configured. Using mock response.")
        return _mock_response(question)

    try:
        print("\n" + "=" * 60)
        print("🎙️  SHADOW COUNCIL SESSION")
        print("=" * 60)
        print(f"Question: {question}")
        print(f"Model: {_model_name}")
        print("=" * 60)

        council = create_shadow_council()

        initial_state = {
            "question": question,
            "context": knowledge_graph,
            "messages": [],
            "optimist_view": "",
            "skeptic_view": "",
            "final_answer": "",
            "reasoning_trace": [],
        }

        result = council.invoke(initial_state)

        print("\n" + "=" * 60)
        print("✅ SHADOW COUNCIL SESSION COMPLETE")
        print("=" * 60)

        return {
            "question": result["question"],
            "optimist_view": result["optimist_view"],
            "skeptic_view": result["skeptic_view"],
            "final_answer": result["final_answer"],
            "reasoning_trace": result["reasoning_trace"],
        }

    except Exception as e:
        err_msg = str(e)
        print(f"\n⚠️  API error: {err_msg[:300]}")
        print("   Falling back to mock data.")
        return _mock_response(question)


if __name__ == "__main__":
    kg_path = _backend_dir / "data" / "knowledge_graph.json"
    try:
        with open(kg_path, "r") as f:
            kg = json.load(f)
    except FileNotFoundError:
        print("❌ Error: knowledge_graph.json not found!")
        print("💡 Run 'python utils/knowledge_extractor.py' first")
        exit(1)

    test_questions = [
        "What are the biggest risks to our Q1 product launch?",
        "How is the Engineering team handling their workload?",
        "What conflicts should I be aware of?",
        "What changed recently that affects the Product team?",
    ]

    print("\n🎯 Testing Shadow Council with sample questions...\n")

    for i, question in enumerate(test_questions, 1):
        print(f"\n{'='*60}")
        print(f"TEST QUESTION {i}/{len(test_questions)}")
        print(f"{'='*60}")

        result = query_shadow_council(question, kg)

        if i < len(test_questions):
            print("\n⏸️  Press Enter for next question...")
            input()

    print("\n✨ All tests complete!")
