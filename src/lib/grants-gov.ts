// Simpler Grants.gov API - No authentication required
// Search: POST https://api.simpler.grants.gov/v1/opportunities/search
// Details: GET https://api.simpler.grants.gov/v1/opportunities/{id}

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
  id: number;
  title: string;
  agency: string | null;
  status: string | null;
  postDate: string | null;
  closeDate: string | null;
  awardFloor: number | null;
  awardCeiling: number | null;
  summary: string | null;
  fundingCategory: string | null;
  applicantTypes: string[];
}

export interface GrantSearchResult {
  results: GrantOpportunity[];
  total: number;
  error?: string;
}

// ─── Constants ───────────────────────────────────────────

const GRANTS_BASE_URL = "https://api.simpler.grants.gov/v1/opportunities";

const DEFAULT_HEADERS: HeadersInit = {
  Accept: "application/json",
  "Content-Type": "application/json",
  "User-Agent": "PropFlow/1.0",
};

const FETCH_TIMEOUT = 30_000;

// ─── Helpers ─────────────────────────────────────────────

function mapGrantOpportunity(raw: Record<string, unknown>): GrantOpportunity {
  const applicantTypes = Array.isArray(raw.applicant_types)
    ? (raw.applicant_types as Array<Record<string, unknown>>).map(
        (t) => String(t.description ?? t.id ?? "")
      )
    : [];

  return {
    id: Number(raw.opportunity_id ?? raw.id ?? 0),
    title: String(raw.opportunity_title ?? raw.title ?? ""),
    agency: (raw.agency_code as string) ?? (raw.agency as string) ?? null,
    status:
      (raw.opportunity_status as string) ?? (raw.status as string) ?? null,
    postDate: (raw.post_date as string) ?? null,
    closeDate: (raw.close_date as string) ?? null,
    awardFloor:
      raw.award_floor != null ? Number(raw.award_floor) : null,
    awardCeiling:
      raw.award_ceiling != null ? Number(raw.award_ceiling) : null,
    summary: (raw.summary?.toString() ?? raw.description?.toString()) ?? null,
    fundingCategory:
      (raw.funding_category as string) ??
      (raw.category as string) ??
      null,
    applicantTypes,
  };
}

// ─── API Functions ───────────────────────────────────────

export async function searchGrants(
  params: GrantSearchParams
): Promise<GrantSearchResult> {
  try {
    // Build filters object
    const filters: Record<string, unknown> = {
      opportunity_status: {
        one_of: [params.status || "posted"],
      },
    };

    if (params.agency) {
      filters.agency = { one_of: [params.agency] };
    }
    if (params.fundingCategory) {
      filters.funding_category = { one_of: [params.fundingCategory] };
    }

    const body = {
      query: params.keyword ?? "",
      filters,
      pagination: {
        page_offset: params.page ?? 1,
        page_size: params.pageSize ?? 25,
        order_by: "post_date",
        sort_direction: "descending",
      },
    };

    const response = await fetch(`${GRANTS_BASE_URL}/search`, {
      method: "POST",
      headers: DEFAULT_HEADERS,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return {
        results: [],
        total: 0,
        error: `Grants.gov API error (${response.status}): ${text || response.statusText}`,
      };
    }

    const data = await response.json();

    const rawResults: Record<string, unknown>[] =
      data?.data ?? data?.opportunities ?? data?.results ?? [];
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
  opportunityId: number
): Promise<{ data: Record<string, unknown> | null; error?: string }> {
  try {
    const url = `${GRANTS_BASE_URL}/${opportunityId}`;

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
