// SAM.gov Internal API - No authentication required
// Search: https://sam.gov/api/prod/sgs/v1/search/
// Details: https://sam.gov/api/prod/opps/v2/opportunities/{id}
// Resources: https://sam.gov/api/prod/opps/v3/opportunities/{id}/resources

// ─── Types ───────────────────────────────────────────────

export interface SamSearchParams {
  keyword?: string;
  index?: number;
  size?: number;
  naicsCode?: string;
  typeOfSetAside?: string;
  postedFrom?: string;
  postedTo?: string;
  responseDeadlineFrom?: string;
  responseDeadlineTo?: string;
  ptype?: string; // p=presolicitation, o=solicitation, k=combined, r=sources sought, s=special notice, i=sale of surplus, a=award notice
}

export interface SamOpportunity {
  id: string;
  title: string;
  solicitationNumber: string | null;
  department: string | null;
  agency: string | null;
  type: string | null;
  setAside: string | null;
  naicsCode: string | null;
  description: string | null;
  postedDate: string | null;
  responseDeadline: string | null;
  placeOfPerformance: string | null;
}

export interface SamSearchResult {
  results: SamOpportunity[];
  total: number;
  error?: string;
}

// ─── Constants ───────────────────────────────────────────

const SAM_SEARCH_URL = "https://sam.gov/api/prod/sgs/v1/search/";
const SAM_DETAIL_URL = "https://sam.gov/api/prod/opps/v2/opportunities";
const SAM_RESOURCES_URL = "https://sam.gov/api/prod/opps/v3/opportunities";

const DEFAULT_HEADERS: HeadersInit = {
  Accept: "application/json, application/hal+json",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://sam.gov/search/",
  Origin: "https://sam.gov",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
};

const FETCH_TIMEOUT = 30_000;

// ─── Helpers ─────────────────────────────────────────────

function buildSearchUrl(params: SamSearchParams): string {
  const page = params.index ?? 0;
  const size = params.size ?? 25;

  const url = new URL(SAM_SEARCH_URL);
  url.searchParams.set("random", String(Date.now()));
  url.searchParams.set("index", "opp");
  url.searchParams.set("page", String(page));
  url.searchParams.set("mode", "search");
  url.searchParams.set("size", String(size));
  url.searchParams.set("is_active", "true");
  url.searchParams.set("sort", "-modifiedDate");

  if (params.keyword) {
    url.searchParams.set("q", params.keyword);
  }
  if (params.naicsCode) {
    url.searchParams.set("naics", params.naicsCode);
  }
  if (params.typeOfSetAside) {
    url.searchParams.set("typeOfSetAside", params.typeOfSetAside);
  }
  if (params.ptype) {
    url.searchParams.set("opp_type", params.ptype);
  }
  if (params.postedFrom) {
    url.searchParams.set("postedFrom", params.postedFrom);
  }
  if (params.postedTo) {
    url.searchParams.set("postedTo", params.postedTo);
  }
  if (params.responseDeadlineFrom) {
    url.searchParams.set("responseDeadlineFrom", params.responseDeadlineFrom);
  }
  if (params.responseDeadlineTo) {
    url.searchParams.set("responseDeadlineTo", params.responseDeadlineTo);
  }

  return url.toString();
}

function mapSearchResult(raw: Record<string, unknown>): SamOpportunity {
  // Place of performance
  const placeRaw = raw.placeOfPerformance as
    | Record<string, unknown>
    | undefined;
  const place = placeRaw
    ? [placeRaw.city, placeRaw.state, placeRaw.country]
        .filter(Boolean)
        .join(", ") || null
    : null;

  // Type can be a string or an object { code, value }
  const typeRaw = raw.type as string | Record<string, unknown> | null;
  const typeStr =
    typeof typeRaw === "object" && typeRaw
      ? (typeRaw.value as string) ?? (typeRaw.code as string) ?? null
      : (typeRaw as string) ?? null;

  // Description can be a string or an array of { content }
  const descRaw = raw.descriptions as
    | Array<Record<string, unknown>>
    | undefined;
  const description =
    (raw.description as string) ??
    (descRaw?.[0]?.content as string) ??
    null;

  // Organization hierarchy: extract department and agency
  const orgHierarchy = raw.organizationHierarchy as
    | Array<Record<string, unknown>>
    | undefined;
  const dept =
    (raw.department as string) ??
    (orgHierarchy?.find((o) => o.level === 1)?.name as string) ??
    null;
  const agency =
    (raw.subtierAgency as string) ??
    (raw.agency as string) ??
    (orgHierarchy?.find((o) => o.level === 2)?.name as string) ??
    null;

  return {
    id: String(raw.noticeId ?? raw._id ?? raw.opportunityId ?? ""),
    title: String(raw.title ?? ""),
    solicitationNumber: (raw.solicitationNumber as string) ?? null,
    department: dept,
    agency,
    type: typeStr,
    setAside:
      (raw.typeOfSetAsideDescription as string) ??
      (raw.typeOfSetAside as string) ??
      null,
    naicsCode: (raw.naicsCode as string) ?? null,
    description,
    postedDate:
      (raw.postedDate as string) ??
      (raw.publishDate as string) ??
      null,
    responseDeadline:
      (raw.responseDeadline as string) ??
      (raw.responseDate as string) ??
      null,
    placeOfPerformance: place,
  };
}

// ─── API Functions ───────────────────────────────────────

export async function searchSamOpportunities(
  params: SamSearchParams
): Promise<SamSearchResult> {
  try {
    const url = buildSearchUrl(params);

    const response = await fetch(url, {
      headers: DEFAULT_HEADERS,
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return {
        results: [],
        total: 0,
        error: `SAM.gov API error (${response.status}): ${text || response.statusText}`,
      };
    }

    const data = await response.json();

    const rawResults: Record<string, unknown>[] =
      data?._embedded?.results ?? data?.opportunitiesData ?? [];
    const total: number =
      data?.page?.totalElements ?? data?.totalRecords ?? rawResults.length;

    return {
      results: rawResults.map(mapSearchResult),
      total,
    };
  } catch (error) {
    return {
      results: [],
      total: 0,
      error: `SAM.gov search failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function fetchSamOpportunityDetail(
  opportunityId: string
): Promise<{ data: Record<string, unknown> | null; error?: string }> {
  try {
    const url = `${SAM_DETAIL_URL}/${encodeURIComponent(opportunityId)}`;

    const response = await fetch(url, {
      headers: {
        ...DEFAULT_HEADERS,
        // Detail endpoint requires hal+json specifically (returns 406 otherwise)
        Accept: "application/hal+json",
        Referer: `https://sam.gov/opp/${encodeURIComponent(opportunityId)}/view`,
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return {
        data: null,
        error: `SAM.gov detail API error (${response.status}): ${text || response.statusText}`,
      };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    return {
      data: null,
      error: `SAM.gov detail fetch failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function fetchSamResources(
  opportunityId: string
): Promise<{ resources: Record<string, unknown>[]; error?: string }> {
  try {
    const url = `${SAM_RESOURCES_URL}/${encodeURIComponent(opportunityId)}/resources`;

    const response = await fetch(url, {
      headers: DEFAULT_HEADERS,
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return {
        resources: [],
        error: `SAM.gov resources API error (${response.status}): ${text || response.statusText}`,
      };
    }

    const data = await response.json();
    const resources: Record<string, unknown>[] = Array.isArray(data)
      ? data
      : data?.resources ?? data?._embedded?.resources ?? [];

    return { resources };
  } catch (error) {
    return {
      resources: [],
      error: `SAM.gov resources fetch failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
