import { prisma } from "@/lib/db";

// ─── Types ───────────────────────────────────────────────

export interface SamSearchParams {
  keyword?: string;
  postedFrom?: string; // MM/dd/yyyy
  postedTo?: string;
  naicsCode?: string;
  typeOfSetAside?: string;
  ptype?: string; // procurement type
  limit?: number;
  offset?: number;
}

export interface MappedOpportunity {
  externalId: string;
  title: string;
  solicitationNum: string | null;
  department: string | null;
  agency: string | null;
  office: string | null;
  type: string | null;
  setAside: string | null;
  naicsCode: string | null;
  classificationCode: string | null;
  description: string | null;
  postedDate: Date | null;
  responseDeadline: Date | null;
  archiveDate: Date | null;
  placeOfPerformance: string | null;
  pointOfContact: string | null;
  resourceLinks: string | null;
  source: string;
  rawData: string;
}

export interface SamSearchResult {
  opportunities: MappedOpportunity[];
  totalRecords: number;
}

// ─── API Key Resolution ──────────────────────────────────

async function getApiKey(): Promise<string> {
  // Try DB first
  try {
    const setting = await prisma.apiSetting.findUnique({
      where: { key: "sam_gov_api_key" },
    });
    if (setting?.value) return setting.value;
  } catch {
    // DB may not be available; fall through to env var
  }

  const envKey = process.env.SAM_GOV_API_KEY;
  if (envKey) return envKey;

  throw new Error(
    "SAM.gov API key not configured. Set it in Settings or as SAM_GOV_API_KEY env var."
  );
}

// ─── Response Mapping ────────────────────────────────────

function parseDate(value: unknown): Date | null {
  if (!value || typeof value !== "string") return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function mapOpportunity(raw: Record<string, unknown>): MappedOpportunity {
  const poc = raw.pointOfContact;
  const pocJson =
    poc && Array.isArray(poc) && poc.length > 0
      ? JSON.stringify(
          poc.map((c: Record<string, unknown>) => ({
            name: c.fullName ?? c.name ?? null,
            email: c.email ?? null,
            phone: c.phone ?? null,
          }))
        )
      : null;

  const links = raw.resourceLinks;
  const linksJson =
    links && Array.isArray(links) ? JSON.stringify(links) : null;

  const placeRaw = raw.placeOfPerformance as
    | Record<string, unknown>
    | undefined;
  const place = placeRaw
    ? [placeRaw.city, placeRaw.state, placeRaw.country]
        .filter(Boolean)
        .join(", ") || null
    : null;

  return {
    externalId: String(raw.noticeId ?? raw.opportunityId ?? ""),
    title: String(raw.title ?? ""),
    solicitationNum: (raw.solicitationNumber as string) ?? null,
    department: (raw.department as string) ?? (raw.departmentName as string) ?? null,
    agency: (raw.subtierAgency as string) ?? (raw.agency as string) ?? null,
    office: (raw.office as string) ?? (raw.officeName as string) ?? null,
    type: (raw.type as string) ?? (raw.noticeType as string) ?? null,
    setAside: (raw.typeOfSetAsideDescription as string) ??
      (raw.typeOfSetAside as string) ?? null,
    naicsCode: (raw.naicsCode as string) ?? null,
    classificationCode: (raw.classificationCode as string) ?? null,
    description: (raw.description as string) ?? null,
    postedDate: parseDate(raw.postedDate),
    responseDeadline: parseDate(raw.responseDeadline ?? raw.responseDate),
    archiveDate: parseDate(raw.archiveDate),
    placeOfPerformance: place,
    pointOfContact: pocJson,
    resourceLinks: linksJson,
    source: "sam.gov",
    rawData: JSON.stringify(raw),
  };
}

// ─── SAM.gov API Calls ──────────────────────────────────

const SAM_BASE_URL = "https://api.sam.gov/opportunities/v2/search";

export async function searchOpportunities(
  params: SamSearchParams
): Promise<SamSearchResult> {
  const apiKey = await getApiKey();

  const query = new URLSearchParams();
  query.set("api_key", apiKey);
  if (params.keyword) query.set("keyword", params.keyword);
  if (params.postedFrom) query.set("postedFrom", params.postedFrom);
  if (params.postedTo) query.set("postedTo", params.postedTo);
  if (params.naicsCode) query.set("naics", params.naicsCode);
  if (params.typeOfSetAside) query.set("typeOfSetAside", params.typeOfSetAside);
  if (params.ptype) query.set("ptype", params.ptype);
  query.set("limit", String(params.limit ?? 25));
  query.set("offset", String(params.offset ?? 0));

  const url = `${SAM_BASE_URL}?${query.toString()}`;

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `SAM.gov API error (${response.status}): ${text || response.statusText}`
    );
  }

  const data = await response.json();

  const rawOpportunities: Record<string, unknown>[] =
    data.opportunitiesData ?? data.opportunities ?? [];
  const totalRecords: number =
    data.totalRecords ?? rawOpportunities.length;

  return {
    opportunities: rawOpportunities.map(mapOpportunity),
    totalRecords,
  };
}

export async function fetchOpportunityDetail(
  noticeId: string
): Promise<MappedOpportunity> {
  const apiKey = await getApiKey();

  const url = `${SAM_BASE_URL}?api_key=${encodeURIComponent(apiKey)}&noticeId=${encodeURIComponent(noticeId)}&limit=1`;

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `SAM.gov API error (${response.status}): ${text || response.statusText}`
    );
  }

  const data = await response.json();
  const items: Record<string, unknown>[] =
    data.opportunitiesData ?? data.opportunities ?? [];

  if (items.length === 0) {
    throw new Error(`Opportunity not found: ${noticeId}`);
  }

  return mapOpportunity(items[0]);
}
