"""
Synthetic organizational communication data that mimics real company emails.
This avoids processing costs and gives us perfect control.
"""

from datetime import datetime, timedelta
import json
import random
import os

# Realistic company structure
PEOPLE = [
    {"name": "Sarah Chen", "team": "Product", "role": "VP Product"},
    {"name": "Marcus Johnson", "team": "Engineering", "role": "CTO"},
    {"name": "Emily Rodriguez", "team": "Marketing", "role": "CMO"},
    {"name": "David Kim", "team": "Finance", "role": "CFO"},
    {"name": "Lisa Wang", "team": "Engineering", "role": "Tech Lead"},
    {"name": "James Wilson", "team": "Sales", "role": "VP Sales"},
    {"name": "Maria Garcia", "team": "Product", "role": "PM"},
    {"name": "Robert Taylor", "team": "Marketing", "role": "Growth Lead"},
    {"name": "Jennifer Lee", "team": "Finance", "role": "Controller"},
    {"name": "Michael Brown", "team": "Engineering", "role": "Senior Eng"},
    {"name": "Amanda White", "team": "Product", "role": "Designer"},
    {"name": "Kevin Zhang", "team": "Engineering", "role": "DevOps Lead"},
    {"name": "Rachel Green", "team": "Marketing", "role": "Content Lead"},
    {"name": "Tom Anderson", "team": "Sales", "role": "Enterprise Sales"},
    {"name": "Nina Patel", "team": "Finance", "role": "FP&A Manager"},
]

TOPICS = [
    "Q1 Product Launch",
    "Pricing Strategy Review",
    "Feature Prioritization",
    "Budget Allocation 2025",
    "Engineering Team Expansion",
    "Infrastructure Migration to AWS",
    "Customer Support SLA",
    "Marketing Campaign Q1",
    "Sales Compensation Plan",
    "Security Compliance Audit",
    "Mobile App Redesign",
    "API v3 Development",
    "Enterprise Feature Requests",
    "Performance Review Process",
    "Remote Work Policy Update",
]

# Realistic email templates by topic
EMAIL_TEMPLATES = {
    "Q1 Product Launch": [
        "We need to finalize the Q1 launch date. Engineering suggests March 1st, but Marketing wants Feb 15th to align with the industry conference. This is becoming a blocker.",
        "Update from yesterday's meeting: After heated discussion between Engineering and Marketing, we're proposing Feb 28th as a compromise. Need exec approval by EOD.",
        "DECISION CONFIRMED: Launch date is March 1st. Sarah Chen made the final call after reviewing capacity constraints. Marketing will adjust their timeline.",
        "Following up on the launch decision - we need to assign ownership for: beta testing (Engineering), PR strategy (Marketing), and customer onboarding (Product).",
        "Risk alert: The March 1st launch depends on the API v3 completion by Feb 15th. Infrastructure team flagged potential delays due to AWS migration conflicts.",
    ],
    "Pricing Strategy Review": [
        "Proposing new pricing tiers for 2025: Basic ($29/mo), Pro ($99/mo), Enterprise (custom). Finance has concerns about margin compression at the Pro tier.",
        "Finance pushback on $99 pricing: Analysis shows we need $119 minimum to hit our margin targets. Product team disagrees - claims $99 is critical for market positioning.",
        "ESCALATED to David Kim (CFO): We have a fundamental disagreement between Finance and Product on pricing strategy. Need executive decision.",
        "Resolution from exec team: Going with $99 Pro tier but cutting features to reduce costs. Emily Rodriguez will lead the feature reduction analysis.",
        "Implementation plan for new pricing: Sales needs 2 weeks for customer communications, Finance needs 1 week for billing system updates. Launch target: March 15th.",
    ],
    "Feature Prioritization": [
        "Q2 roadmap debate: Engineering wants to focus on technical debt, Product wants new enterprise features, Marketing needs better analytics for campaigns.",
        "Capacity planning shows we can only deliver 2 of the 3 priorities. This is creating tension across teams - everyone thinks their priority is most critical.",
        "Maria Garcia (PM) proposal: Split team 60% enterprise features, 40% tech debt, defer analytics to Q3. Engineering team is frustrated with this approach.",
        "Marcus Johnson (CTO) counter-proposal: 70% tech debt now to prevent system instability, defer enterprise features. Product team strongly opposes.",
        "DECISION by Sarah Chen: 50/50 split between enterprise features and tech debt. Analytics dashboard deprioritized to Q3. Not everyone is happy but we're moving forward.",
    ],
    "Budget Allocation 2025": [
        "2025 budget review: Engineering requesting $2M for infrastructure, Marketing wants $1.5M for campaigns, Product needs $800K for research tools. Total ask: $4.3M, budget: $3M.",
        "David Kim analysis: We need to cut $1.3M from requests. Recommending: Engineering $1.5M (-$500K), Marketing $1M (-$500K), Product $500K (-$300K).",
        "Strong pushback from all teams on budget cuts. Marketing claims they can't hit growth targets with reduced budget. Engineering warns of technical debt explosion.",
        "Emergency budget meeting scheduled for tomorrow. Each team must present case for why their budget shouldn't be cut. Tension is very high.",
        "FINAL BUDGET APPROVED: Engineering $1.7M, Marketing $900K, Product $400K. Everyone had to compromise. Implementation starts next week.",
    ],
    "Engineering Team Expansion": [
        "Hiring plan for Q1-Q2: Need 5 senior engineers to handle infrastructure migration and new product features. Recruiting timeline: 8-12 weeks per hire.",
        "Concern from Finance: Each senior engineer costs ~$180K fully loaded. 5 hires = $900K annual run rate increase. This wasn't in the approved budget.",
        "Marcus Johnson defending headcount: Without these hires, we can't deliver on product commitments. This creates a dependency chain affecting everything.",
        "Compromise proposal: Hire 3 seniors immediately, re-evaluate in Q2 for remaining 2 based on revenue performance. Approved by exec team.",
        "Recruiting update: First 2 offers accepted, starting March 1st. Third candidate in final rounds. Timeline still tight but achievable.",
    ],
    "Infrastructure Migration to AWS": [
        "AWS migration plan: Phase 1 (dev environments) complete. Phase 2 (staging) scheduled for Feb. Phase 3 (production) is high-risk and needs careful planning.",
        "Risk identified: Production migration conflicts with Q1 product launch timeline. If migration has issues, we could miss the March 1st launch date.",
        "Kevin Zhang recommendation: Delay production migration to April to avoid jeopardizing launch. Product team supports this. Engineering wants to push forward.",
        "Debate: Engineering argues that delaying migration increases technical debt and limits our ability to scale. Product prioritizes launch stability.",
        "DECISION: Migration delayed to April 15th. Launch takes priority. Engineering will implement temporary scaling solutions to bridge the gap.",
    ],
    "Customer Support SLA": [
        "Proposal: New enterprise SLA commitments - 1-hour response time for P1 issues, 4-hour for P2. This would differentiate us from competitors.",
        "Operations concern: Current support team of 8 can't meet 1-hour SLA without hiring 4 more agents. This adds $300K to annual costs.",
        "Sales team perspective: Enterprise deals worth $2M+ are being lost because our SLA isn't competitive. We need this to close big deals.",
        "Finance analysis: If we close 2 additional enterprise deals, the $300K investment pays for itself. But it's still a risk if we don't win the deals.",
        "APPROVED with conditions: Implement new SLA for trials only. Hire 2 support agents initially, expand if we convert 2+ enterprise trials to paid.",
    ],
    "Marketing Campaign Q1": [
        "Q1 campaign plan: Focus on enterprise segment with LinkedIn ads, webinar series, and case study content. Budget request: $500K.",
        "Emily Rodriguez proposal: Shift 30% of budget to performance marketing for SMB segment. Claims higher ROI based on last quarter's data.",
        "Debate: Brand team wants to protect enterprise positioning, performance team wants more bottom-funnel spend. Need alignment by Friday.",
        "Compromise: 70% enterprise, 30% SMB performance. A/B test both approaches and reallocate in Q2 based on results. Approved.",
        "Campaign launch scheduled for Feb 1st. Creative assets in review. Targeting 200 enterprise leads and 500 SMB signups.",
    ],
    "Sales Compensation Plan": [
        "Proposing 2025 comp plan: Base 60%, commission 40%, with accelerators for enterprise deals. OTE increase of 15% to remain competitive.",
        "James Wilson concern: Current plan doesn't incentivize land-and-expand. Reps are closing small initial deals and not pushing expansion.",
        "Finance pushback: 15% OTE increase adds $800K to annual costs. Need to see ROI projections before approving.",
        "Revised proposal: Add expansion quota (20% of total) with 1.5x accelerator. Base increase reduced to 10%. Finance conditionally approves.",
        "FINAL COMP PLAN: 60/40 base/commission, 20% expansion quota, 1.5x accelerator on enterprise. Effective March 1st.",
    ],
    "Security Compliance Audit": [
        "Annual SOC 2 audit is due in March. Last year we had 12 findings that need remediation before this year's audit. Currently only 7 are resolved.",
        "Kevin Zhang status: Remaining 5 findings require: (1) encryption key rotation automation, (2) access log retention policy, (3) incident response plan update, (4) penetration testing, (5) vendor risk assessments.",
        "Audit failure risk: If we don't resolve all findings, we could fail SOC 2, which would block all enterprise deals. This is a company-level risk.",
        "Resource allocation needed: Completing audit prep requires 200 engineering hours over next 4 weeks. This pulls resources from other priorities.",
        "EXECUTIVE DECISION: SOC 2 compliance is top priority. All other work is secondary until audit prep is complete. Engineering roadmap adjusted accordingly.",
    ],
    "Mobile App Redesign": [
        "User research shows 40% of our users are mobile-first, but our mobile app has 3.2 star rating. Competitors have 4.5+. This is hurting acquisition.",
        "Amanda White proposal: Complete mobile redesign with modern UI, better performance, offline mode. Estimated timeline: 4 months, requires dedicated iOS/Android devs.",
        "Resource conflict: The mobile redesign competes with API v3 development for the same engineering resources. We can't do both simultaneously.",
        "Product prioritization debate: Mobile redesign affects consumer segment (60% of users), API v3 affects enterprise segment (40% revenue). Which matters more?",
        "DECISION: Prioritize API v3 (enterprise revenue is critical). Mobile redesign delayed to Q3. Consumer team is disappointed but understands the business logic.",
    ],
    "API v3 Development": [
        "API v3 scope: GraphQL support, better rate limiting, webhook improvements, documentation overhaul. Enterprise customers are demanding this.",
        "Timeline concern: Original estimate was 3 months, but scope keeps expanding. Now looking at 4-5 months with current team size.",
        "Dependency alert: Q1 product launch assumes API v3 is ready. If API v3 slips, the launch either delays or ships with limited functionality.",
        "Lisa Wang technical assessment: We can deliver core API v3 features by Feb 15th (meeting launch deadline), but advanced features will come in v3.1 later.",
        "DECISION: Ship API v3.0 with core features for launch, iterate with v3.1 in April. Enterprise customers get early access to v3.1 beta.",
    ],
    "Enterprise Feature Requests": [
        "Top 5 enterprise requests: SSO SAML, custom branding, audit logs, data export API, multi-region deployment. Need to prioritize for Q2.",
        "Product vs Engineering tension: Product wants all 5, Engineering says we can only do 2-3 without delaying other commitments.",
        "Customer success input: SSO and audit logs are blocking 3 deals worth $1.2M. Recommend prioritizing those two.",
        "Sarah Chen direction: SSO and audit logs for Q2. Custom branding and data export for Q3. Multi-region deferred to 2026.",
        "Roadmap updated. Engineering allocating 2 senior devs to SSO and audit logs. Target completion: end of Q2.",
    ],
    "Performance Review Process": [
        "Proposing new performance review cycle: Quarterly check-ins, annual review, 360 feedback for managers. Rollout in March.",
        "HR concern: Current managers aren't trained on giving feedback. Need to run manager training before new process launches.",
        "Timeline debate: HR wants to delay to Q2 for training. Leadership wants March to align with comp planning.",
        "Compromise: Launch lightweight quarterly check-ins in March, full 360 process in Q2 after manager training. Approved.",
        "Performance review timeline: Q1 check-ins March 15-31, manager training April, full cycle in Q2.",
    ],
    "Remote Work Policy Update": [
        "Current policy allows full remote. Proposing hybrid: 2 days in office for roles that benefit from collaboration.",
        "Employee sentiment: Engineering strongly prefers remote. Sales and Marketing are split. Product leans hybrid.",
        "Marcus Johnson (CTO): Forcing office days will hurt engineering retention. We're already losing candidates to fully remote competitors.",
        "Revised proposal: Hybrid optional, 2 days recommended but not required. Office space for those who want it. Approved.",
        "Remote work policy: Hybrid optional, 2 days recommended. No mandatory office days. Effective immediately.",
    ],
}


def generate_email_thread(topic: str, num_emails: int = 5) -> list:
    """Generate a realistic email thread with evolution over time"""

    if topic not in EMAIL_TEMPLATES:
        return []

    templates = EMAIL_TEMPLATES[topic]
    emails = []
    base_time = datetime.now() - timedelta(days=random.randint(1, 30))

    for i, content in enumerate(templates[:num_emails]):
        # Determine email type based on content
        if "DECISION" in content or "APPROVED" in content or "CONFIRMED" in content or "FINAL" in content or "EXECUTIVE" in content:
            email_type = "decision"
        elif "conflict" in content.lower() or "disagree" in content.lower() or "pushback" in content.lower() or "ESCALATED" in content:
            email_type = "conflict"
        else:
            email_type = "discussion"

        # Select appropriate sender based on content
        sender = random.choice(PEOPLE)
        if "Finance" in content or "budget" in content.lower():
            sender = next((p for p in PEOPLE if p["team"] == "Finance"), sender)
        elif "Engineering" in content or "technical" in content.lower() or "CTO" in content:
            sender = next((p for p in PEOPLE if p["team"] == "Engineering"), sender)
        elif "Product" in content or "launch" in content.lower() or "PM" in content:
            sender = next((p for p in PEOPLE if p["team"] == "Product"), sender)
        elif "Marketing" in content:
            sender = next((p for p in PEOPLE if p["team"] == "Marketing"), sender)
        elif "Sales" in content:
            sender = next((p for p in PEOPLE if p["team"] == "Sales"), sender)

        # Progressive timestamps (later emails are more recent)
        time_offset = timedelta(
            days=i * 2,
            hours=random.randint(9, 17),
            minutes=random.randint(0, 59),
        )

        email = {
            "id": f"email_{topic.replace(' ', '_').lower()}_{i}",
            "sender": sender["name"],
            "sender_team": sender["team"],
            "sender_role": sender["role"],
            "topic": topic,
            "content": content,
            "timestamp": (base_time + time_offset).isoformat(),
            "type": email_type,
            "thread_id": f"thread_{topic.replace(' ', '_').lower()}",
            "thread_position": i + 1,
            "recipients": [
                p["name"]
                for p in random.sample(PEOPLE, min(random.randint(3, 6), len(PEOPLE)))
                if p["name"] != sender["name"]
            ][:5],
        }

        emails.append(email)

    return emails


def generate_complete_dataset():
    """Generate complete dataset with all topics"""
    all_emails = []

    for topic in TOPICS:
        thread_emails = generate_email_thread(topic, num_emails=5)
        all_emails.extend(thread_emails)

    # Sort by timestamp
    all_emails.sort(key=lambda x: x["timestamp"])

    return all_emails


def save_dataset():
    """Generate and save the synthetic dataset"""

    print("Generating synthetic organizational dataset...")

    emails = generate_complete_dataset()

    # Save relative to script location (backend/data/)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(script_dir, "company_emails.json")

    with open(output_path, "w") as f:
        json.dump(emails, f, indent=2)

    print(f"\nGenerated {len(emails)} synthetic emails")
    print(f"Saved to: {output_path}")

    # Create summary stats
    topic_counts = {}
    type_counts = {"decision": 0, "conflict": 0, "discussion": 0}
    team_participation = {}

    for email in emails:
        topic_counts[email["topic"]] = topic_counts.get(email["topic"], 0) + 1
        type_counts[email["type"]] += 1
        team = email["sender_team"]
        team_participation[team] = team_participation.get(team, 0) + 1

    print(f"\nDataset Statistics:")
    print(f"  Total emails: {len(emails)}")
    print(f"  Topics covered: {len(topic_counts)}")
    print(f"  Decisions: {type_counts['decision']}")
    print(f"  Conflicts: {type_counts['conflict']}")
    print(f"  Discussions: {type_counts['discussion']}")
    print(f"\n  Team participation:")
    for team, count in sorted(team_participation.items(), key=lambda x: x[1], reverse=True):
        print(f"    {team}: {count} emails")

    print("\nDataset generation complete!")
    print("This synthetic dataset is:")
    print("   - Realistic (based on actual company scenarios)")
    print("   - Structured (perfect for AI processing)")
    print("   - FREE (no API costs)")
    print("   - Demo-ready (shows complex decision-making)")


if __name__ == "__main__":
    save_dataset()
