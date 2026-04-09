// ─── Types ───────────────────────────────────────────────

interface MatchableOpportunity {
  naicsCode?: string | null;
  setAside?: string | null;
  title?: string | null;
  description?: string | null;
}

interface MatchableClient {
  id: string;
  naicsCodes?: string | null; // comma-separated
  setAsideTypes?: string | null; // comma-separated
  capabilities?: string | null; // keywords
  industry?: string | null;
}

export interface MatchResult {
  clientId: string;
  score: number; // 0-100
  breakdown: {
    naics: number;
    setAside: number;
    industry: number;
    capabilities: number;
  };
}

// ─── Helpers ─────────────────────────────────────────────

function splitCsv(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function tokenize(text: string | null | undefined): Set<string> {
  if (!text) return new Set();
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

function keywordOverlap(textTokens: Set<string>, keywords: string[]): number {
  if (keywords.length === 0 || textTokens.size === 0) return 0;
  let matches = 0;
  for (const kw of keywords) {
    const kwTokens = kw.toLowerCase().split(/\s+/);
    // A keyword matches if all of its tokens appear in the text
    if (kwTokens.every((t) => textTokens.has(t))) {
      matches++;
    }
  }
  return matches / keywords.length;
}

// ─── Scoring ─────────────────────────────────────────────

function scoreClientForOpportunity(
  opportunity: MatchableOpportunity,
  client: MatchableClient
): MatchResult {
  // NAICS score (0-40): exact match on primary NAICS code
  let naicsScore = 0;
  const clientNaics = splitCsv(client.naicsCodes);
  const oppNaics = opportunity.naicsCode?.trim().toLowerCase() ?? "";
  if (oppNaics && clientNaics.length > 0) {
    if (clientNaics.includes(oppNaics)) {
      naicsScore = 40;
    } else {
      // Partial: match on first 4 digits (NAICS sector)
      const oppPrefix = oppNaics.slice(0, 4);
      const hasPartial = clientNaics.some((n) => n.startsWith(oppPrefix));
      if (hasPartial) naicsScore = 20;
    }
  }

  // Set-aside score (0-25): exact match on set-aside type
  let setAsideScore = 0;
  const clientSetAsides = splitCsv(client.setAsideTypes);
  const oppSetAside = opportunity.setAside?.trim().toLowerCase() ?? "";
  if (oppSetAside && clientSetAsides.length > 0) {
    if (clientSetAsides.some((s) => oppSetAside.includes(s) || s.includes(oppSetAside))) {
      setAsideScore = 25;
    }
  }

  // Industry keyword score (0-15): industry term appears in title/description
  let industryScore = 0;
  if (client.industry) {
    const oppText = `${opportunity.title ?? ""} ${opportunity.description ?? ""}`.toLowerCase();
    const industryTokens = client.industry.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    if (industryTokens.some((t) => oppText.includes(t))) {
      industryScore = 15;
    }
  }

  // Capabilities keyword score (0-20): overlap between client capabilities and opp text
  let capScore = 0;
  const capKeywords = splitCsv(client.capabilities);
  if (capKeywords.length > 0) {
    const oppTokens = tokenize(
      `${opportunity.title ?? ""} ${opportunity.description ?? ""}`
    );
    const overlap = keywordOverlap(oppTokens, capKeywords);
    capScore = Math.round(overlap * 20);
  }

  const score = Math.min(100, naicsScore + setAsideScore + industryScore + capScore);

  return {
    clientId: client.id,
    score,
    breakdown: {
      naics: naicsScore,
      setAside: setAsideScore,
      industry: industryScore,
      capabilities: capScore,
    },
  };
}

// ─── Public API ──────────────────────────────────────────

export function matchOpportunitiesToClients(
  opportunities: MatchableOpportunity[],
  clients: MatchableClient[]
): Map<MatchableOpportunity, MatchResult[]> {
  const results = new Map<MatchableOpportunity, MatchResult[]>();

  for (const opp of opportunities) {
    const clientScores: MatchResult[] = [];
    for (const client of clients) {
      const result = scoreClientForOpportunity(opp, client);
      if (result.score > 0) {
        clientScores.push(result);
      }
    }
    // Sort by score descending
    clientScores.sort((a, b) => b.score - a.score);
    results.set(opp, clientScores);
  }

  return results;
}

export function bestMatchForOpportunity(
  opportunity: MatchableOpportunity,
  clients: MatchableClient[]
): MatchResult | null {
  let best: MatchResult | null = null;

  for (const client of clients) {
    const result = scoreClientForOpportunity(opportunity, client);
    if (result.score > 0 && (!best || result.score > best.score)) {
      best = result;
    }
  }

  return best;
}
