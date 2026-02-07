// This will replace synthetic-data.ts when Member 3 is ready

export async function fetchGraphData() {
  const response = await fetch('/api/graph');
  return response.json();
}

export async function fetchConflicts() {
  const response = await fetch('/api/conflicts');
  return response.json();
}

export async function fetchDecisions() {
  const response = await fetch('/api/decisions');
  return response.json();
}

export async function fetchHealthScore() {
  const response = await fetch('/api/health');
  return response.json();
}

