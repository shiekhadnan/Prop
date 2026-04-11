"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  Buildings,
  MapPin,
  User,
  Link as LinkIcon,
  Star,
  FileText,
  Tag,
  Clock,
  ArrowSquareOut,
  CurrencyDollar,
  Trophy,
  Handshake,
  Warning,
  CircleNotch,
  CheckCircle,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ───────────────────────────────────────────────

interface OpportunityDetail {
  source: "sam" | "grants" | "usaspending" | "db";
  title: string;
  subtitle: string | null;
  department: string | null;
  agency: string | null;
  office: string | null;
  type: string | null;
  status: string | null;
  setAside: string | null;
  naicsCode: string | null;
  description: string | null;
  postedDate: string | null;
  closeDate: string | null;
  archiveDate: string | null;
  estimatedValue: number | null;
  placeOfPerformance: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  externalUrl: string | null;
  resources: { name: string; url?: string }[];
  awardInfo: {
    awardee: string | null;
    amount: number | null;
    date: string | null;
  } | null;
}

// ─── Helpers ─────────────────────────────────────────────

function parseSource(rawId: string): {
  source: "sam" | "grants" | "usaspending" | "db";
  id: string;
} {
  if (rawId.startsWith("sam-"))
    return { source: "sam", id: rawId.slice(4) };
  if (rawId.startsWith("grant-"))
    return { source: "grants", id: rawId.slice(6) };
  if (rawId.startsWith("award-"))
    return { source: "usaspending", id: rawId.slice(6) };
  return { source: "db", id: rawId };
}

const currencyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function fmtDate(d: string | null | undefined): string {
  if (!d) return "N/A";
  try {
    return format(new Date(d), "MMM d, yyyy");
  } catch {
    return d;
  }
}

function stripHtml(html: unknown): string {
  if (!html) return "";
  const str = typeof html === "string" ? html : String(html);
  return str.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

const typeColorMap: Record<string, string> = {
  "combined synopsis/solicitation":
    "bg-orange-100 text-orange-800 hover:bg-orange-100",
  solicitation: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  presolicitation: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  "sources sought": "bg-amber-100 text-amber-800 hover:bg-amber-100",
  "special notice": "bg-pink-100 text-pink-800 hover:bg-pink-100",
  "award notice": "bg-green-100 text-green-800 hover:bg-green-100",
  "sale of surplus": "bg-gray-100 text-gray-800 hover:bg-gray-100",
};

// ─── Mappers for each source ───────────────────────────

function mapSamDetail(
  data: Record<string, unknown>,
  resources: Record<string, unknown>[]
): OpportunityDetail {
  // SAM detail API nests core fields in `data2`, with some fields at top level
  const d2 = (data.data2 as Record<string, unknown>) ?? {};
  const topLevel = data;

  // Type: data2.type is a single-letter code (s=solicitation, o=combined, etc.)
  const typeCodeMap: Record<string, string> = {
    o: "Combined Synopsis/Solicitation",
    p: "Presolicitation",
    k: "Combined Synopsis/Solicitation",
    r: "Sources Sought",
    s: "Special Notice",
    i: "Sale of Surplus",
    a: "Award Notice",
  };
  const typeCode = d2.type as string | undefined;
  const typeStr = typeCode ? (typeCodeMap[typeCode] ?? typeCode) : null;

  // Description: top-level array of {body: "html"}
  const descArr = topLevel.description as
    | Array<Record<string, unknown>>
    | undefined;
  const description = descArr?.[0]?.body?.toString() ?? null;

  // Solicitation details
  const solicitation = d2.solicitation as Record<string, unknown> | undefined;
  const deadlines = solicitation?.deadlines as
    | Record<string, unknown>
    | undefined;
  const setAsideCode = (solicitation?.setAside as string) ?? null;

  // NAICS
  const naicsArr = d2.naics as Array<Record<string, unknown>> | undefined;
  const naicsCode = naicsArr?.[0]?.code as string[] | undefined;
  const naicsStr = naicsCode?.[0] ?? null;

  // Place of performance (inside data2)
  const pop = d2.placeOfPerformance as Record<string, unknown> | undefined;
  const popCity = pop?.city as Record<string, unknown> | undefined;
  const popState = pop?.state as Record<string, unknown> | undefined;
  const popCountry = pop?.country as Record<string, unknown> | undefined;
  const placeStr = pop
    ? [popCity?.name, popState?.name, popCountry?.name]
        .filter(Boolean)
        .join(", ") || null
    : null;

  // Contacts (inside data2)
  const contacts = d2.pointOfContact as
    | Array<Record<string, unknown>>
    | undefined;
  // Find the first contact with actual info
  const contact =
    contacts?.find((c) => c.fullName || c.email) ?? contacts?.[0];

  // Award (inside data2)
  const awardRaw = d2.award as Record<string, unknown> | undefined;
  const awardee = awardRaw?.awardee as Record<string, unknown> | undefined;

  // Archive (inside data2)
  const archive = d2.archive as Record<string, unknown> | undefined;

  // Resources
  const mappedResources = resources.map((r) => ({
    name: String(r.name ?? r.filename ?? "Document"),
    url: r.downloadUrl as string | undefined,
  }));

  // Status from top-level
  const status = topLevel.status as Record<string, unknown> | undefined;
  const isArchived = topLevel.archived as boolean | undefined;
  const isCancelled = topLevel.cancelled as boolean | undefined;
  const statusStr = isCancelled
    ? "Cancelled"
    : isArchived
      ? "Archived"
      : status?.value
        ? String(status.value)
        : "Active";

  const oppId =
    (topLevel.opportunityId as string) ??
    (topLevel.id as string) ??
    null;

  return {
    source: "sam",
    title: String(d2.title ?? topLevel.title ?? "Untitled"),
    subtitle: (d2.solicitationNumber as string) ?? null,
    department: null,
    agency: null,
    office: null,
    type: typeStr,
    status: statusStr,
    setAside: setAsideCode && setAsideCode !== "NONE" ? setAsideCode : null,
    naicsCode: naicsStr,
    description: description ? stripHtml(description) : null,
    postedDate: (topLevel.postedDate as string) ?? null,
    closeDate: (deadlines?.response as string) ?? null,
    archiveDate: (archive?.date as string) ?? null,
    estimatedValue: null,
    placeOfPerformance: placeStr,
    contactName: contact
      ? String(contact.fullName ?? contact.name ?? "")
      : null,
    contactEmail: (contact?.email as string) ?? null,
    contactPhone: (contact?.phone as string) ?? null,
    externalUrl: oppId ? `https://sam.gov/opp/${oppId}/view` : null,
    resources: mappedResources,
    awardInfo:
      awardee?.name
        ? {
            awardee: (awardee.name as string) ?? null,
            amount: null,
            date: (topLevel.awardDate as string) ?? null,
          }
        : null,
  };
}

function mapGrantDetail(data: Record<string, unknown>): OpportunityDetail {
  const d = (data.data as Record<string, unknown>) ?? data;
  const summary = d.summary as Record<string, unknown> | undefined;

  return {
    source: "grants",
    title: String(d.opportunity_title ?? d.title ?? "Untitled"),
    subtitle: (d.opportunity_number as string) ?? null,
    department: null,
    agency: (d.agency_name as string) ?? (d.agency_code as string) ?? null,
    office: null,
    type: "Grant",
    status: (d.opportunity_status as string) ?? null,
    setAside: null,
    naicsCode: null,
    description:
      (summary?.summary_description as string) ??
      (d.description as string) ??
      null,
    postedDate:
      (d.post_date as string) ??
      (summary?.post_date as string) ??
      null,
    closeDate:
      (d.close_date as string) ??
      (summary?.close_date as string) ??
      null,
    archiveDate: (summary?.archive_date as string) ?? null,
    estimatedValue:
      summary?.award_ceiling != null
        ? Number(summary.award_ceiling)
        : null,
    placeOfPerformance: null,
    contactName:
      summary?.fiscal_year
        ? `FY${summary.fiscal_year}`
        : null,
    contactEmail: null,
    contactPhone: null,
    externalUrl: d.opportunity_id
      ? `https://simpler.grants.gov/opportunity/${d.opportunity_id}`
      : null,
    resources: [],
    awardInfo: null,
  };
}

function mapAwardDetail(data: Record<string, unknown>): OpportunityDetail {
  const recipient = data.recipient as Record<string, unknown> | undefined;
  const period = data.period_of_performance as
    | Record<string, unknown>
    | undefined;
  const place = data.place_of_performance as
    | Record<string, unknown>
    | undefined;
  const agency = data.awarding_agency as Record<string, unknown> | undefined;
  const topAgency = agency?.toptier_agency as
    | Record<string, unknown>
    | undefined;
  const subAgency = agency?.subtier_agency as
    | Record<string, unknown>
    | undefined;

  const placeStr = place
    ? [place.city_name, place.state_name, place.country_name]
        .filter(Boolean)
        .join(", ") || null
    : null;

  return {
    source: "usaspending",
    title: (data.description as string) ?? "Government Contract Award",
    subtitle: (data.piid as string) ?? (data.fain as string) ?? null,
    department: (topAgency?.name as string) ?? null,
    agency: (subAgency?.name as string) ?? null,
    office: null,
    type: (data.type_description as string) ?? "Contract",
    status: "Awarded",
    setAside: null,
    naicsCode: (data.naics as string) ?? (data.naics_code as string) ?? null,
    description: (data.description as string) ?? null,
    postedDate: (period?.start_date as string) ?? null,
    closeDate: (period?.end_date as string) ?? null,
    archiveDate: null,
    estimatedValue:
      data.total_obligation != null
        ? Number(data.total_obligation)
        : null,
    placeOfPerformance: placeStr,
    contactName:
      (recipient?.recipient_name as string) ?? null,
    contactEmail: null,
    contactPhone: null,
    externalUrl: data.generated_unique_award_id
      ? `https://www.usaspending.gov/award/${data.generated_unique_award_id}`
      : null,
    resources: [],
    awardInfo: {
      awardee: (recipient?.recipient_name as string) ?? null,
      amount:
        data.total_obligation != null
          ? Number(data.total_obligation)
          : null,
      date: (period?.start_date as string) ?? null,
    },
  };
}

// ─── Page Component ─────────────────────────────────────

export default function OpportunityDetailPage() {
  const rawParams = useParams();
  const rawId = rawParams.id as string;
  const { source, id } = parseSource(rawId);

  const [detail, setDetail] = useState<OpportunityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (source === "db") {
        // Fetch from our saved opportunities DB
        const res = await fetch(`/api/opportunities/${id}`);
        if (!res.ok) {
          setError("Opportunity not found in database");
          return;
        }
        const data = await res.json();
        setDetail({
          source: "db",
          title: data.title ?? "Untitled",
          subtitle: data.solicitationNum ?? null,
          department: data.department ?? null,
          agency: data.agency ?? null,
          office: data.office ?? null,
          type: data.type ?? null,
          status: data.status ?? null,
          setAside: data.setAside ?? null,
          naicsCode: data.naicsCode ?? null,
          description: data.description ?? null,
          postedDate: data.postedDate ?? null,
          closeDate: data.responseDeadline ?? null,
          archiveDate: data.archiveDate ?? null,
          estimatedValue: data.estimatedValue ?? null,
          placeOfPerformance: data.placeOfPerformance ?? null,
          contactName: null,
          contactEmail: null,
          contactPhone: null,
          externalUrl: data.externalId
            ? `https://sam.gov/opp/${data.externalId}/view`
            : null,
          resources: [],
          awardInfo: null,
        });
      } else {
        // Fetch from live API
        const res = await fetch(
          `/api/opportunities/detail/${encodeURIComponent(id)}?source=${source}`
        );
        const json = await res.json();

        if (json.error && !json.data) {
          setError(json.error);
          return;
        }

        const data = json.data ?? json;

        switch (source) {
          case "sam":
            setDetail(
              mapSamDetail(data, json.resources ?? [])
            );
            break;
          case "grants":
            setDetail(mapGrantDetail(data));
            break;
          case "usaspending":
            setDetail(mapAwardDetail(data));
            break;
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load opportunity"
      );
    } finally {
      setLoading(false);
    }
  }, [source, id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Skeleton className="h-64 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <Link
          href="/opportunities"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft size={18} className="mr-1" />
          Back to Opportunities
        </Link>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Warning
              size={48}
              weight="duotone"
              className="mb-4 text-red-400"
            />
            <p className="text-lg font-medium text-muted-foreground">
              {error ?? "Opportunity not found"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground/70">
              The opportunity may have been removed or the link is incorrect.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sourceLabel =
    detail.source === "sam"
      ? "SAM.gov"
      : detail.source === "grants"
        ? "Grants.gov"
        : detail.source === "usaspending"
          ? "USASpending.gov"
          : "Saved";

  const sourceColor =
    detail.source === "sam"
      ? "bg-blue-100 text-blue-800"
      : detail.source === "grants"
        ? "bg-emerald-100 text-emerald-800"
        : detail.source === "usaspending"
          ? "bg-amber-100 text-amber-800"
          : "bg-gray-100 text-gray-800";

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Back Link */}
      <Link
        href="/opportunities"
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        <ArrowLeft size={18} className="mr-1" />
        Back to Opportunities
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ─── Main Content (2 cols) ─── */}
        <div className="space-y-6 lg:col-span-2">
          {/* Title & Meta */}
          <Card>
            <CardHeader>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className={sourceColor}>
                    {sourceLabel}
                  </Badge>
                  {detail.status && (
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-800 hover:bg-green-100"
                    >
                      <CheckCircle size={12} className="mr-1" />
                      {detail.status}
                    </Badge>
                  )}
                  {detail.type && (
                    <Badge
                      variant="secondary"
                      className={
                        typeColorMap[detail.type.toLowerCase()] ??
                        "bg-blue-50 text-blue-700"
                      }
                    >
                      {detail.type}
                    </Badge>
                  )}
                  {detail.setAside && (
                    <Badge variant="secondary">
                      <Tag size={12} className="mr-1" />
                      {detail.setAside}
                    </Badge>
                  )}
                </div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {detail.title}
                </h1>
                {detail.subtitle && (
                  <p className="text-sm text-muted-foreground">
                    {detail.source === "sam"
                      ? `Solicitation #${detail.subtitle}`
                      : detail.source === "grants"
                        ? `Opportunity #${detail.subtitle}`
                        : `Award #${detail.subtitle}`}
                  </p>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {detail.department && (
                  <div className="flex items-center gap-2 text-sm">
                    <Buildings size={16} className="text-muted-foreground" />
                    <span className="text-muted-foreground">Department:</span>
                    <span className="font-medium">{detail.department}</span>
                  </div>
                )}
                {detail.agency && (
                  <div className="flex items-center gap-2 text-sm">
                    <Buildings size={16} className="text-muted-foreground" />
                    <span className="text-muted-foreground">Agency:</span>
                    <span className="font-medium">{detail.agency}</span>
                  </div>
                )}
                {detail.office && (
                  <div className="flex items-center gap-2 text-sm">
                    <Buildings size={16} className="text-muted-foreground" />
                    <span className="text-muted-foreground">Office:</span>
                    <span className="font-medium">{detail.office}</span>
                  </div>
                )}
                {detail.naicsCode && (
                  <div className="flex items-center gap-2 text-sm">
                    <Tag size={16} className="text-muted-foreground" />
                    <span className="text-muted-foreground">NAICS:</span>
                    <span className="font-mono font-medium">
                      {detail.naicsCode}
                    </span>
                  </div>
                )}
                {detail.placeOfPerformance && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin size={16} className="text-muted-foreground" />
                    <span className="text-muted-foreground">Location:</span>
                    <span className="font-medium">
                      {detail.placeOfPerformance}
                    </span>
                  </div>
                )}
                {detail.estimatedValue != null && (
                  <div className="flex items-center gap-2 text-sm">
                    <CurrencyDollar
                      size={16}
                      className="text-muted-foreground"
                    />
                    <span className="text-muted-foreground">
                      {detail.source === "usaspending"
                        ? "Total Obligation:"
                        : "Est. Value:"}
                    </span>
                    <span className="font-semibold text-emerald-700">
                      {currencyFmt.format(detail.estimatedValue)}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          {detail.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {detail.description}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar size={18} className="text-muted-foreground" />
                Key Dates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {detail.source === "usaspending"
                      ? "Start Date"
                      : "Posted Date"}
                  </p>
                  <p className="text-sm font-medium">
                    {fmtDate(detail.postedDate)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {detail.source === "usaspending"
                      ? "End Date"
                      : "Response Deadline"}
                  </p>
                  <p className="text-sm font-medium">
                    {fmtDate(detail.closeDate)}
                  </p>
                </div>
                {detail.archiveDate && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Archive Date
                    </p>
                    <p className="text-sm font-medium">
                      {fmtDate(detail.archiveDate)}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          {(detail.contactName || detail.contactEmail) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User size={18} className="text-muted-foreground" />
                  {detail.source === "usaspending"
                    ? "Recipient"
                    : "Point of Contact"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {detail.contactName && (
                  <div className="flex items-center gap-2 text-sm">
                    <User size={14} className="text-muted-foreground" />
                    <span className="font-medium">{detail.contactName}</span>
                  </div>
                )}
                {detail.contactEmail && (
                  <div className="flex items-center gap-2 text-sm">
                    <LinkIcon size={14} className="text-muted-foreground" />
                    <a
                      href={`mailto:${detail.contactEmail}`}
                      className="text-primary hover:underline"
                    >
                      {detail.contactEmail}
                    </a>
                  </div>
                )}
                {detail.contactPhone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock size={14} className="text-muted-foreground" />
                    <span>{detail.contactPhone}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Resources / Attachments */}
          {detail.resources.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText size={18} className="text-muted-foreground" />
                  Attachments & Resources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {detail.resources.map((r, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 rounded-md border p-2 text-sm"
                    >
                      <FileText
                        size={16}
                        className="shrink-0 text-muted-foreground"
                      />
                      {r.url ? (
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline truncate"
                        >
                          {r.name}
                        </a>
                      ) : (
                        <span className="truncate">{r.name}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Award Information */}
          {detail.awardInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Trophy
                    size={18}
                    weight="fill"
                    className="text-yellow-500"
                  />
                  Award Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  {detail.awardInfo.awardee && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Awardee
                      </p>
                      <p className="text-sm font-medium">
                        {detail.awardInfo.awardee}
                      </p>
                    </div>
                  )}
                  {detail.awardInfo.amount != null && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Amount
                      </p>
                      <p className="text-sm font-semibold text-emerald-700">
                        {currencyFmt.format(detail.awardInfo.amount)}
                      </p>
                    </div>
                  )}
                  {detail.awardInfo.date && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Award Date
                      </p>
                      <p className="text-sm font-medium">
                        {fmtDate(detail.awardInfo.date)}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ─── Sidebar ─── */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Star size={18} className="text-muted-foreground" />
                Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* View on source portal */}
              {detail.externalUrl && (
                <a
                  href={detail.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({
                    className: "w-full",
                  })}
                >
                  <ArrowSquareOut size={16} className="mr-2" />
                  View on {sourceLabel}
                </a>
              )}

              <Separator />

              {/* Create Proposal */}
              <Link
                href="/proposals/new"
                className={buttonVariants({
                  variant: "outline",
                  className: "w-full",
                })}
              >
                <FileText size={16} className="mr-2" />
                Create Proposal
              </Link>

              <Separator />

              {/* Source info */}
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="text-xs font-medium uppercase tracking-wider">
                  Data Source
                </p>
                <p>{sourceLabel}</p>
                {detail.subtitle && (
                  <>
                    <p className="text-xs font-medium uppercase tracking-wider pt-2">
                      Reference #
                    </p>
                    <p className="font-mono text-xs">{detail.subtitle}</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
