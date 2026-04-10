// Simpler Grants.gov API
// Search: POST https://api.simpler.grants.gov/v1/opportunities/search
// Details: GET https://api.simpler.grants.gov/v1/opportunities/{id}
// API key: free from https://simpler.grants.gov/developers (required)

// ─── Types ───────────────────────────────────────────────

export interface GrantSearchParams {
  keyword?: string;
  agency?: string;
  status?: string;
  fundingCategory?: string;
  page?: number;
  pageSize?: number;
}

export interface GrantOpportunity {
  id: string;
  title: string;
  agency: string | null;
  agencyName: string | null;
  status: string | null;
  postDate: string | null;
  closeDate: string | null;
  awardFloor: number | null;
  awardCeiling: number | null;
  summary: string | null;
  category: string | null;
  applicantTypes: string[];
  opportunityNumber: string | null;
}

export interface GrantSearchResult {
  results: GrantOpportunity[];
  total: number;
  error?: string;
}

// ─── Constants ───────────────────────────────────────────

const GRANTS_BASE_URL = "https://api.simpler.grants.gov/v1/opportunities";

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const apiKey = process.env.GRANTS_GOV_API_KEY;
  if (apiKey) {
    headers["X-API-Key"] = apiKey;
  }
  return headers;
}

const FETCH_TIMEOUT = 30_000;

// ─── Helpers ─────────────────────────────────────────────

function mapGrantOpportunity(raw: Record<string, unknown>): GrantOpportunity {
  const applicantTypes = Array.isArray(raw.applicant_types)
    ? (raw.applicant_types as Array<Record<string, unknown>>).map(
        (t) => String(t.description ?? t.id ?? "")
      )
    : [];

  // summary can be a nested object with description_summary
  const summaryRaw = raw.summary as Record<string, unknown> | string | null;
  let summary: string | null = null;
  if (typeof summaryRaw === "string") {
    summary = summaryRaw;
  } else if (summaryRaw && typeof summaryRaw === "object") {
    summary =
      (summaryRaw.summary_description as string) ??
      (summaryRaw.description as string) ??
      null;
  }

  // award amounts can be in the summary object
  const awardFloor =
    raw.award_floor != null
      ? Number(raw.award_floor)
      : summaryRaw && typeof summaryRaw === "object" && summaryRaw.award_floor != null
        ? Number(summaryRaw.award_floor)
        : null;
  const awardCeiling =
    raw.award_ceiling != null
      ? Number(raw.award_ceiling)
      : summaryRaw && typeof summaryRaw === "object" && summaryRaw.award_ceiling != null
        ? Number(summaryRaw.award_ceiling)
        : null;

  // Dates can be in the summary object too
  const postDate =
    (raw.post_date as string) ??
    (summaryRaw && typeof summaryRaw === "object"
      ? (summaryRaw.post_date as string)
      : null) ??
    null;
  const closeDate =
    (raw.close_date as string) ??
    (summaryRaw && typeof summaryRaw === "object"
      ? (summaryRaw.close_date as string)
      : null) ??
    null;

  return {
    id: String(raw.opportunity_id ?? raw.id ?? ""),
    title: String(raw.opportunity_title ?? raw.title ?? ""),
    agency: (raw.agency_code as string) ?? null,
    agencyName: (raw.agency_name as string) ?? (raw.agency as string) ?? null,
    status:
      (raw.opportunity_status as string) ?? (raw.status as string) ?? null,
    postDate,
    closeDate,
    awardFloor,
    awardCeiling,
    summary,
    category:
      (raw.category as string) ??
      (raw.funding_category as string) ??
      null,
    applicantTypes,
    opportunityNumber:
      (raw.opportunity_number as string) ?? null,
  };
}

// ─── API Functions ───────────────────────────────────────

export async function searchGrants(
  params: GrantSearchParams
): Promise<GrantSearchResult> {
  try {
    // Build filters object
    const filters: Record<string, unknown> = {};

    if (params.status && params.status !== "all") {
      filters.opportunity_status = {
        one_of: [params.status],
      };
    } else {
      filters.opportunity_status = {
        one_of: ["posted"],
      };
    }

    if (params.agency) {
      filters.agency = { one_of: [params.agency] };
    }
    if (params.fundingCategory) {
      filters.funding_category = { one_of: [params.fundingCategory] };
    }

    const body = {
      query: params.keyword || "government",
      filters,
      pagination: {
        page_offset: params.page ?? 1,
        page_size: params.pageSize ?? 25,
        sort_order: [
          {
            order_by: "post_date",
            sort_direction: "descending",
          },
        ],
      },
    };

    const response = await fetch(`${GRANTS_BASE_URL}/search`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      if (response.status === 401 || response.status === 403) {
        return {
          results: [],
          total: 0,
          error:
            "Grants.gov API key required. Add GRANTS_GOV_API_KEY to your .env file. Get a free key at simpler.grants.gov/developers",
        };
      }
      return {
        results: [],
        total: 0,
        error: `Grants.gov API error (${response.status}): ${text || response.statusText}`,
      };
    }

    const data = await response.json();

    const rawResults: Record<string, unknown>[] =
      data?.data ?? data?.results ?? [];
    const total: number =
      data?.pagination_info?.total_records ??
      data?.total ??
      rawResults.length;

    return {
      results: rawResults.map(mapGrantOpportunity),
      total,
    };
  } catch (error) {
    return {
      results: [],
      total: 0,
      error: `Grants.gov search failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function fetchGrantDetail(
  opportunityId: string
): Promise<{ data: Record<string, unknown> | null; error?: string }> {
  try {
    const url = `${GRANTS_BASE_URL}/${opportunityId}`;

    const response = await fetch(url, {
      headers: getHeaders(),
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return {
        data: null,
        error: `Grants.gov detail API error (${response.status}): ${text || response.statusText}`,
      };
    }

    const data = await response.json();
    return { data: data?.data ?? data };
  } catch (error) {
    return {
      data: null,
      error: `Grants.gov detail fetch failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
