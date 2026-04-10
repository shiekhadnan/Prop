// USASpending.gov API - No authentication required
// Search: POST https://api.usaspending.gov/api/v2/search/spending_by_award/
// Details: GET https://api.usaspending.gov/api/v2/awards/{generated_internal_id}/

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
  id: string;
  awardId: string;
  generatedId: string;
  recipientName: string | null;
  startDate: string | null;
  endDate: string | null;
  awardAmount: number | null;
  agency: string | null;
  subAgency: string | null;
  contractType: string | null;
  naicsCode: string | null;
  description: string | null;
  stateCode: string | null;
}

export interface AwardSearchResult {
  results: Award[];
  total: number;
  page: number;
  hasNext: boolean;
  error?: string;
}

// ─── Constants ───────────────────────────────────────────

const USA_SPENDING_BASE = "https://api.usaspending.gov/api/v2";

const DEFAULT_HEADERS: HeadersInit = {
  Accept: "application/json",
  "Content-Type": "application/json",
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
  "Place of Performance State Code",
  "Place of Performance Country Code",
];

// ─── Helpers ─────────────────────────────────────────────

function mapAward(raw: Record<string, unknown>): Award {
  const generatedId = String(raw["generated_internal_id"] ?? "");
  return {
    id: generatedId || String(raw["internal_id"] ?? raw["Award ID"] ?? ""),
    awardId: String(raw["Award ID"] ?? ""),
    generatedId,
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
    stateCode: (raw["Place of Performance State Code"] as string) ?? null,
  };
}

// ─── API Functions ───────────────────────────────────────

export async function searchAwards(
  params: AwardSearchParams
): Promise<AwardSearchResult> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 25;

  try {
    // Build filters — time_period is required (min: 2007-10-01)
    const today = new Date().toISOString().slice(0, 10);
    const defaultFrom = new Date();
    defaultFrom.setFullYear(defaultFrom.getFullYear() - 1);
    const defaultFromStr = defaultFrom.toISOString().slice(0, 10);

    const filters: Record<string, unknown> = {
      award_type_codes: ["A", "B", "C", "D"],
      time_period: [
        {
          start_date: params.dateFrom || defaultFromStr,
          end_date: params.dateTo || today,
        },
      ],
    };

    if (params.keyword) {
      filters.keywords = [params.keyword];
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
        hasNext: false,
        error: `USASpending API error (${response.status}): ${text || response.statusText}`,
      };
    }

    const data = await response.json();

    const rawResults: Record<string, unknown>[] = data?.results ?? [];
    const hasNext: boolean = data?.page_metadata?.hasNext ?? false;
    const total: number =
      data?.page_metadata?.total ?? rawResults.length;

    return {
      results: rawResults.map(mapAward),
      total,
      page,
      hasNext,
    };
  } catch (error) {
    return {
      results: [],
      total: 0,
      page,
      hasNext: false,
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
