/**
 * API client for Aetheris backend
 * Connects to http://localhost:8000 via Vite proxy
 */

const API_BASE = ""; // Use relative URLs so Vite proxy works

export interface GraphNode {
  id: string;
  type: "person" | "decision" | "topic";
  label: string;
  status: "active" | "aging" | "conflicted" | "stale";
  decay?: number;
  centrality?: number;
  team?: string;
  reasoning?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: "influences" | "depends_on" | "conflicts_with";
  strength: number;
}

export interface Conflict {
  id: string;
  team1: string;
  team2: string;
  topic: string;
  severity: "low" | "medium" | "high";
  status?: "ongoing" | "resolved" | "escalated";
  timestamp: Date;
  description: string;
}

export interface Decision {
  id: string;
  version: number;
  title: string;
  author: string;
  timestamp: Date;
  change: string;
  reasoning: string;
  status: "new" | "updated" | "old";
}

export interface CouncilResponse {
  question: string;
  optimist_view: string;
  skeptic_view: string;
  final_answer: string;
  reasoning_trace: unknown[];
}

export interface HealthScore {
  score: number;
  total_conflicts: number;
  ongoing_conflicts: number;
  high_severity_conflicts: number;
  timestamp: string;
}

// Normalize backend graph nodes/edges for frontend
function normalizeNode(n: Record<string, unknown>): GraphNode {
  return {
    id: String(n.id ?? ""),
    type: (n.type as GraphNode["type"]) ?? "topic",
    label: String(n.label ?? ""),
    status: (n.status as GraphNode["status"]) ?? "active",
    decay: typeof n.decay === "number" ? n.decay : 1,
    centrality: typeof n.centrality === "number" ? n.centrality : 0.5,
    team: n.team ? String(n.team) : undefined,
    reasoning: n.reasoning ? String(n.reasoning) : undefined,
  };
}

function normalizeEdge(e: Record<string, unknown>, index: number): GraphEdge {
  const src = String(e.source ?? "");
  const tgt = String(e.target ?? "");
  return {
    id: String(e.id ?? `e${index}`),
    source: src,
    target: tgt,
    type: (e.type as GraphEdge["type"]) ?? "influences",
    strength: typeof e.strength === "number" ? e.strength : 0.8,
  };
}

function normalizeConflict(c: Record<string, unknown>): Conflict {
  const ts = c.timestamp ? new Date(String(c.timestamp)) : new Date();
  return {
    id: String(c.id ?? ""),
    team1: String(c.team1 ?? ""),
    team2: String(c.team2 ?? ""),
    topic: String(c.topic ?? c.title ?? ""),
    severity: (c.severity as Conflict["severity"]) ?? "medium",
    status: (c.status as Conflict["status"]) ?? "ongoing",
    timestamp: ts,
    description: String(c.description ?? c.topic ?? c.title ?? ""),
  };
}

const FALLBACK_REASONING: Record<string, { change: string; reasoning: string }> = {
  "Q1 Product Launch Date":
    {
      change: "Extended from v1 to accommodate API v3 dependency",
      reasoning:
        "Engineering confirmed API v3 Development is a hard dependency. Marketing and Product aligned on revised timeline to ensure launch quality. Finance approved budget shift for additional sprint capacity.",
    },
};

function normalizeDecision(d: Record<string, unknown>): Decision {
  const isRecent = Boolean(d.is_recent);
  const ts = d.timestamp ? new Date(String(d.timestamp)) : new Date();
  const title = String(d.title ?? "");
  const fallback = FALLBACK_REASONING[title];
  return {
    id: String(d.id ?? ""),
    version: typeof d.version === "number" ? d.version : 1,
    title,
    author: String(d.author ?? ""),
    timestamp: ts,
    change: String(d.change ?? fallback?.change ?? "From knowledge graph"),
    reasoning: String(d.reasoning ?? fallback?.reasoning ?? ""),
    status: (d.status as Decision["status"]) ?? (isRecent ? "new" : "updated"),
  };
}

export async function fetchGraphData(): Promise<{
  nodes: GraphNode[];
  edges: GraphEdge[];
}> {
  const response = await fetch(`${API_BASE}/api/graph`);
  if (!response.ok) throw new Error("Failed to fetch graph data");
  const data = await response.json();
  const nodes = Array.isArray(data.nodes) ? data.nodes.map(normalizeNode) : [];
  const edges = Array.isArray(data.edges) ? data.edges.map(normalizeEdge) : [];
  return { nodes, edges };
}

export async function fetchConflicts(): Promise<Conflict[]> {
  const response = await fetch(`${API_BASE}/api/conflicts`);
  if (!response.ok) throw new Error("Failed to fetch conflicts");
  const data = await response.json();
  const conflicts = Array.isArray(data.conflicts) ? data.conflicts : [];
  return conflicts.map(normalizeConflict);
}

export async function fetchDecisions(): Promise<Decision[]> {
  const response = await fetch(`${API_BASE}/api/decisions`);
  if (!response.ok) throw new Error("Failed to fetch decisions");
  const data = await response.json();
  const decisions = Array.isArray(data.decisions) ? data.decisions : [];
  return decisions.map(normalizeDecision);
}

export async function fetchDependencies() {
  const response = await fetch(`${API_BASE}/api/dependencies`);
  if (!response.ok) throw new Error("Failed to fetch dependencies");
  return response.json();
}

export async function fetchInsights() {
  const response = await fetch(`${API_BASE}/api/insights`);
  if (!response.ok) throw new Error("Failed to fetch insights");
  return response.json();
}

export async function fetchHealthScore(): Promise<HealthScore> {
  const response = await fetch(`${API_BASE}/api/health`);
  if (!response.ok) throw new Error("Failed to fetch health score");
  const data = await response.json();
  return {
    score: typeof data.score === "number" ? data.score : 100,
    total_conflicts: data.total_conflicts ?? 0,
    ongoing_conflicts: data.ongoing_conflicts ?? 0,
    high_severity_conflicts: data.high_severity_conflicts ?? 0,
    timestamp: data.timestamp ?? new Date().toISOString(),
  };
}

export async function fetchStats() {
  const response = await fetch(`${API_BASE}/api/stats`);
  if (!response.ok) throw new Error("Failed to fetch stats");
  return response.json();
}

// --- Data source (CSV upload / URL) ---
export interface DataSourceInfo {
  source: "synthetic" | "csv" | "url";
  url: string | null;
}

export async function getDataSource(): Promise<DataSourceInfo> {
  const response = await fetch(`${API_BASE}/api/data/source`);
  if (!response.ok) throw new Error("Failed to fetch data source");
  return response.json();
}

export async function uploadDataCsv(file: File): Promise<{ nodes: number; edges: number; decisions: number; conflicts: number; dependencies: number }> {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${API_BASE}/api/data/upload`, { method: "POST", body: form });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || "Upload failed");
  }
  return response.json();
}

export async function setDataSourceUrl(url: string): Promise<{ nodes: number; edges: number; decisions: number; conflicts: number; dependencies: number }> {
  const response = await fetch(`${API_BASE}/api/data/source`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: url.trim() }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to load from URL");
  }
  return response.json();
}

export async function resetToDefaultData(): Promise<{ nodes: number; edges: number; decisions: number; conflicts: number; dependencies: number }> {
  const response = await fetch(`${API_BASE}/api/data/reset`, { method: "POST" });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to reset to default data");
  }
  return response.json();
}

export async function getCsvFormat(): Promise<Record<string, string>> {
  const response = await fetch(`${API_BASE}/api/data/csv-format`);
  if (!response.ok) return {};
  return response.json();
}

export interface SuggestionsResponse {
  council_questions: string[];
  critic_examples: string[];
}

export async function getSuggestions(): Promise<SuggestionsResponse> {
  const response = await fetch(`${API_BASE}/api/suggestions`);
  if (!response.ok) return { council_questions: [], critic_examples: [] };
  return response.json();
}

export async function queryCouncil(question: string): Promise<CouncilResponse> {
  const response = await fetch(`${API_BASE}/api/council/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    let detail: string = "Failed to query council";
    try {
      const err = await response.json();
      const d = err.detail ?? detail;
      if (typeof d === "string") detail = d;
      else if (Array.isArray(d) && d[0]?.msg) detail = d[0].msg;
      else if (d && typeof d === "object" && "msg" in d) detail = String(d.msg);
    } catch {
      detail = (await response.text()) || detail;
    }
    throw new Error(detail);
  }

  return response.json();
}

// --- Voice / Audio ---

export type AudioKey = "intro" | "processing" | "complete";

/**
 * Get URL for pre-generated audio (intro, processing, complete).
 * Returns URL - use with new Audio(url).play()
 */
export function getAudioUrl(key: AudioKey): string {
  return `${API_BASE || ""}/api/audio/${key}`;
}

/**
 * Play pre-generated audio. Silently fails if file doesn't exist (404).
 */
export async function playAudio(key: AudioKey): Promise<void> {
  try {
    const audio = new Audio(getAudioUrl(key));
    await audio.play();
  } catch {
    // Silently ignore - audio may not be pre-generated
  }
}

/**
 * Play intro, then processing when intro ends. Runs in background.
 */
export function playIntroThenProcessing(): void {
  const intro = new Audio(getAudioUrl("intro"));
  intro.onended = () => {
    const processing = new Audio(getAudioUrl("processing"));
    processing.play().catch(() => {});
  };
  intro.play().catch(() => {});
}

export type SfxKey = "click" | "confirm" | "tab" | "soft";

/**
 * Play ElevenLabs sound effect. Fires and forgets; fails silently if not generated.
 * - click: generic buttons
 * - confirm: Chief of Staff open / submit Ask
 * - tab: All Teams toggle, team selection
 * - soft: close, voice toggle, suggestion chips
 */
export function playAudioSfx(key: SfxKey): void {
  try {
    const audio = new Audio(`${API_BASE || ""}/api/audio/sfx/${key}`);
    audio.volume = 0.45;
    audio.play().catch(() => {});
  } catch {
    // Silently ignore
  }
}

/**
 * Synthesize speech from text via ElevenLabs. Returns blob URL to play.
 * Call URL.revokeObjectURL() when done playing.
 */
export async function synthesizeSpeech(text: string): Promise<string | null> {
  const response = await fetch(`${API_BASE || ""}/api/audio/synthesize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) return null;
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

/**
 * Transcribe audio to text via ElevenLabs Speech-to-Text.
 * Pass a Blob (e.g. from MediaRecorder). Returns transcript or null.
 */
export async function transcribeSpeech(audioBlob: Blob): Promise<string | null> {
  const form = new FormData();
  const ext = audioBlob.type.includes("webm") ? "webm" : audioBlob.type.includes("mp3") ? "mp3" : "webm";
  form.append("file", audioBlob, `voice.${ext}`);
  const response = await fetch(`${API_BASE || ""}/api/audio/transcribe`, {
    method: "POST",
    body: form,
  });
  if (!response.ok) return null;
  const data = await response.json();
  return (data.text ?? "").trim() || null;
}

// --- Critic Agent ---
export interface CriticContradiction {
  type: string;
  source_new: string;
  source_kg: string;
  new_value: string;
  kg_value: string;
  description: string;
  parties_to_notify: string[];
  suggestion: string;
}

export interface CriticAnalysisResult {
  input_summary: string;
  contradictions: CriticContradiction[];
  contradiction_count: number;
  has_contradictions: boolean;
  recommendation: string;
}

export async function analyzeWithCritic(text: string): Promise<CriticAnalysisResult> {
  const response = await fetch(`${API_BASE || ""}/api/critic/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to analyze");
  }

  return response.json();
}
