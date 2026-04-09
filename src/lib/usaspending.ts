// USASpending.gov API - No authentication required
// Search: POST https://api.usaspending.gov/api/v2/search/spending_by_award/
// Details: GET https://api.usaspending.gov/api/v2/awards/{id}/

// ─── Types ───────────────────────────────────────────────

export interface AwardSearchParams {
  keyword?: string;
  agency?: string;
  naicsCode?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface Award {
  awardId: string;
  recipientName: string | null;
  startDate: string | null;
  endDate: string | null;
  awardAmount: number | null;
  agency: string | null;
  subAgency: string | null;
  contractType: string | null;
  naicsCode: string | null;
  description: string | null;
}

export interface AwardSearchResult {
  results: Award[];
  total: number;
  page: number;
  error?: string;
}

// ─── Constants ───────────────────────────────────────────

const USA_SPENDING_BASE = "https://api.usaspending.gov/api/v2";

const DEFAULT_HEADERS: HeadersInit = {
  Accept: "application/json",
  "Content-Type": "application/json",
  "User-Agent": "PropFlow/1.0",
};

const FETCH_TIMEOUT = 30_000;

const SEARCH_FIELDS = [
  "Award ID",
  "Recipient Name",
  "Start Date",
  "End Date",
  "Award Amount",
  "Awarding Agency",
  "Awarding Sub Agency",
  "Contract Award Type",
  "NAICS Code",
  "Description",
];

// ─── Helpers ─────────────────────────────────────────────

function mapAward(raw: Record<string, unknown>): Award {
  return {
    awardId: String(raw["Award ID"] ?? ""),
    recipientName: (raw["Recipient Name"] as string) ?? null,
    startDate: (raw["Start Date"] as string) ?? null,
    endDate: (raw["End Date"] as string) ?? null,
    awardAmount:
      raw["Award Amount"] != null ? Number(raw["Award Amount"]) : null,
    agency: (raw["Awarding Agency"] as string) ?? null,
    subAgency: (raw["Awarding Sub Agency"] as string) ?? null,
    contractType: (raw["Contract Award Type"] as string) ?? null,
    naicsCode: (raw["NAICS Code"] as string) ?? null,
    description: (raw["Description"] as string) ?? null,
  };
}

// ─── API Functions ───────────────────────────────────────

export async function searchAwards(
  params: AwardSearchParams
): Promise<AwardSearchResult> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 25;

  try {
    // Build filters
    const filters: Record<string, unknown> = {
      award_type_codes: ["A", "B", "C", "D"],
    };

    if (params.keyword) {
      filters.keywords = [params.keyword];
    }
    if (params.dateFrom || params.dateTo) {
      filters.time_period = [
        {
          start_date: params.dateFrom ?? "2000-01-01",
          end_date: params.dateTo ?? new Date().toISOString().slice(0, 10),
        },
      ];
    }
    if (params.naicsCode) {
      filters.naics_codes = { require: [params.naicsCode] };
    }
    if (params.agency) {
      filters.agencies = [
        {
          type: "awarding",
          tier: "toptier",
          name: params.agency,
        },
      ];
    }

    const body = {
      subawards: false,
      limit,
      page,
      sort: "Award Amount",
      order: "desc",
      filters,
      fields: SEARCH_FIELDS,
    };

    const response = await fetch(
      `${USA_SPENDING_BASE}/search/spending_by_award/`,
      {
        method: "POST",
        headers: DEFAULT_HEADERS,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
      }
    );

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return {
        results: [],
        total: 0,
        page,
        error: `USASpending API error (${response.status}): ${text || response.statusText}`,
      };
    }

    const data = await response.json();

    const rawResults: Record<string, unknown>[] = data?.results ?? [];
    const total: number =
      data?.page_metadata?.total ?? data?.total ?? rawResults.length;

    return {
      results: rawResults.map(mapAward),
      total,
      page,
    };
  } catch (error) {
    return {
      results: [],
      total: 0,
      page,
      error: `USASpending search failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function fetchAwardDetail(
  awardId: string
): Promise<{ data: Record<string, unknown> | null; error?: string }> {
  try {
    const url = `${USA_SPENDING_BASE}/awards/${encodeURIComponent(awardId)}/`;

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "PropFlow/1.0",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return {
        data: null,
        error: `USASpending detail API error (${response.status}): ${text || response.statusText}`,
      };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    return {
      data: null,
      error: `USASpending detail fetch failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
