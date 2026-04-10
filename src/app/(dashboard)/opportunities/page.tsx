"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Binoculars,
  MagnifyingGlass,
  FloppyDisk,
  Funnel,
  ArrowsClockwise,
  Buildings,
  Calendar,
  Tag,
  CurrencyDollar,
  CaretDown,
  CaretUp,
  Trophy,
  Handshake,
  FileText,
} from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ───────────────────────────────────────────────

interface SamOpportunity {
  id: string;
  externalId?: string;
  title: string;
  department: string | null;
  agency: string | null;
  type: string | null;
  setAside: string | null;
  naicsCode: string | null;
  postedDate: string | null;
  responseDeadline: string | null;
  estimatedValue?: number | null;
  description: string | null;
  solicitationNumber?: string | null;
}

interface GrantOpportunity {
  id: string;
  title: string;
  agency: string | null;
  agencyName: string | null;
  postDate: string | null;
  closeDate: string | null;
  awardFloor: number | null;
  awardCeiling: number | null;
  summary: string | null;
  status: string | null;
  category: string | null;
  opportunityNumber: string | null;
}

interface AwardResult {
  id: string;
  awardId: string;
  recipientName: string | null;
  agency: string | null;
  subAgency: string | null;
  awardAmount: number | null;
  contractType: string | null;
  naicsCode: string | null;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  stateCode: string | null;
}

interface SavedOpportunity {
  id: string;
  title: string;
  agency: string | null;
  status: string;
  matchScore: number | null;
  responseDeadline: string | null;
  isSaved: boolean;
  matchedClient: { id: string; name: string } | null;
}

// ─── Helpers ─────────────────────────────────────────────

const currencyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const statusColorMap: Record<string, string> = {
  active: "bg-green-100 text-green-800 hover:bg-green-100",
  saved: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  dismissed: "bg-gray-100 text-gray-600 hover:bg-gray-100",
  archived: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
};

const typeColorMap: Record<string, string> = {
  presolicitation: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  solicitation: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  "award notice": "bg-green-100 text-green-800 hover:bg-green-100",
  "combined synopsis/solicitation":
    "bg-orange-100 text-orange-800 hover:bg-orange-100",
  "sources sought": "bg-amber-100 text-amber-800 hover:bg-amber-100",
  "special notice": "bg-pink-100 text-pink-800 hover:bg-pink-100",
  "sale of surplus": "bg-gray-100 text-gray-600 hover:bg-gray-100",
};

function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "N/A";
  try {
    return format(new Date(dateStr), "MMM d, yyyy");
  } catch {
    return "N/A";
  }
}

// ─── Loading Skeletons ──────────────────────────────────

function ResultSkeletons({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="mt-2 h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Tab Badge ──────────────────────────────────────────

function TabBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-xs font-medium text-primary">
      {count > 99 ? "99+" : count}
    </span>
  );
}

// ─── Collapsible Filter Card ────────────────────────────

function FilterCard({
  children,
  title,
  expanded,
  onToggle,
}: {
  children: React.ReactNode;
  title: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Card>
      <CardHeader
        className="cursor-pointer pb-3 select-none"
        onClick={onToggle}
      >
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Funnel size={18} className="text-muted-foreground" />
            {title}
          </span>
          {expanded ? (
            <CaretUp size={16} className="text-muted-foreground" />
          ) : (
            <CaretDown size={16} className="text-muted-foreground" />
          )}
        </CardTitle>
      </CardHeader>
      {expanded && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
}

// ─── Tab 1: Contracts (SAM.gov) ─────────────────────────

function ContractsTab({
  onCountChange,
}: {
  onCountChange: (n: number) => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [naicsCode, setNaicsCode] = useState("");
  const [setAsideType, setSetAsideType] = useState("all");
  const [ptype, setPtype] = useState("all");
  const [results, setResults] = useState<SamOpportunity[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(true);

  const ptypeMap: Record<string, string> = {
    presolicitation: "p",
    solicitation: "o",
    combined: "k",
    sources_sought: "r",
    award: "a",
    special: "s",
  };

  const doSearch = useCallback(
    async (pageNum: number, append = false) => {
      setLoading(true);
      setSearched(true);
      try {
        const params = new URLSearchParams();
        if (keyword) params.set("keyword", keyword);
        if (naicsCode) params.set("naicsCode", naicsCode);
        if (setAsideType !== "all") params.set("setAside", setAsideType);
        if (ptype !== "all") params.set("ptype", ptypeMap[ptype] ?? ptype);
        params.set("limit", "25");
        params.set("offset", String(pageNum * 25));

        const res = await fetch(
          `/api/opportunities/search?${params.toString()}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.error) {
            setError(data.error);
          }
          const opps: SamOpportunity[] = data.results ?? data.data ?? data.opportunities ?? [];
          const total: number = data.total ?? data.totalRecords ?? opps.length;
          if (append) {
            setResults((prev) => [...prev, ...opps]);
          } else {
            setResults(opps);
          }
          setTotalRecords(total);
          onCountChange(append ? results.length + opps.length : opps.length);
        }
      } catch {
        // Search failed silently
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [keyword, naicsCode, setAsideType, ptype]
  );

  const handleSearch = () => {
    setPage(0);
    doSearch(0, false);
  };

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    doSearch(next, true);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const body: Record<string, string> = {};
      if (keyword) body.keyword = keyword;
      if (naicsCode) body.naicsCode = naicsCode;
      if (setAsideType !== "all") body.setAside = setAsideType;
      if (ptype !== "all") body.ptype = ptypeMap[ptype] ?? ptype;

      await fetch("/api/opportunities/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      // Sync failed silently
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = async (opportunityId: string) => {
    setSavingId(opportunityId);
    try {
      await fetch(`/api/opportunities/${opportunityId}/save`, {
        method: "POST",
      });
    } catch {
      // Save failed silently
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <FilterCard
        title="Search Filters"
        expanded={filtersOpen}
        onToggle={() => setFiltersOpen(!filtersOpen)}
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="sam-keyword">Keyword</Label>
              <Input
                id="sam-keyword"
                placeholder="e.g. cybersecurity, IT modernization"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sam-naics">NAICS Code</Label>
              <Input
                id="sam-naics"
                placeholder="e.g. 541512"
                value={naicsCode}
                onChange={(e) => setNaicsCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <div className="space-y-2">
              <Label>Set-Aside Type</Label>
              <Select
                value={setAsideType}
                onValueChange={(v) => setSetAsideType(v ?? "all")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="SB">Small Business (SB)</SelectItem>
                  <SelectItem value="8A">8(a)</SelectItem>
                  <SelectItem value="HZC">HUBZone (HZC)</SelectItem>
                  <SelectItem value="SDVOSB">SDVOSB</SelectItem>
                  <SelectItem value="WOSB">WOSB</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={ptype}
                onValueChange={(v) => setPtype(v ?? "all")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="presolicitation">
                    Presolicitation
                  </SelectItem>
                  <SelectItem value="solicitation">Solicitation</SelectItem>
                  <SelectItem value="combined">Combined Synopsis</SelectItem>
                  <SelectItem value="sources_sought">Sources Sought</SelectItem>
                  <SelectItem value="award">Award Notice</SelectItem>
                  <SelectItem value="special">Special Notice</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSearch} disabled={loading}>
              <MagnifyingGlass size={16} className="mr-2" />
              {loading ? "Searching..." : "Search"}
            </Button>
            <Button variant="outline" onClick={handleSync} disabled={syncing}>
              <ArrowsClockwise
                size={16}
                className={`mr-2 ${syncing ? "animate-spin" : ""}`}
              />
              {syncing ? "Syncing..." : "Sync to DB"}
            </Button>
          </div>
        </div>
      </FilterCard>

      {/* Results */}
      {loading && results.length === 0 ? (
        <ResultSkeletons count={6} />
      ) : results.length > 0 ? (
        <>
          <p className="text-sm text-muted-foreground">
            Showing {results.length} of {totalRecords.toLocaleString()} results
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {results.map((opp, idx) => (
              <Card
                key={opp.id || opp.externalId || idx}
                className="hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="line-clamp-2 text-base leading-snug">
                    {opp.title}
                  </CardTitle>
                  {opp.agency && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Buildings size={14} />
                      <span className="truncate">{opp.agency}</span>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {opp.type && (
                      <Badge
                        variant="secondary"
                        className={
                          typeColorMap[opp.type.toLowerCase()] ??
                          "bg-blue-50 text-blue-700 hover:bg-blue-50"
                        }
                      >
                        {opp.type}
                      </Badge>
                    )}
                    {opp.setAside && (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                      >
                        <Tag size={12} className="mr-1" />
                        {opp.setAside}
                      </Badge>
                    )}
                    {opp.naicsCode && (
                      <Badge variant="outline" className="font-mono text-xs">
                        {opp.naicsCode}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} className="shrink-0" />
                      <span>Posted: {fmtDate(opp.postedDate)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} className="shrink-0" />
                      <span>Due: {fmtDate(opp.responseDeadline)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    {opp.id && (
                      <Link
                        href={`/opportunities/sam-${opp.id}`}
                        className={buttonVariants({
                          size: "sm",
                          variant: "default",
                        })}
                      >
                        View Details
                      </Link>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSave(opp.id)}
                      disabled={savingId === opp.id}
                    >
                      <FloppyDisk size={14} className="mr-1" />
                      {savingId === opp.id ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {results.length < totalRecords && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={loading}
              >
                {loading ? "Loading..." : "Load More"}
              </Button>
            </div>
          )}
        </>
      ) : searched ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Binoculars
              size={48}
              weight="duotone"
              className="mb-4 text-muted-foreground/40"
            />
            <p className="text-lg font-medium text-muted-foreground">
              No opportunities found
            </p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Try adjusting your search filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Binoculars
              size={48}
              weight="duotone"
              className="mb-4 text-muted-foreground/40"
            />
            <p className="text-lg font-medium text-muted-foreground">
              Search for opportunities
            </p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Enter your criteria above and click &quot;Search&quot; to find
              government contracts on SAM.gov.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Tab 2: Grants ──────────────────────────────────────

function GrantsTab({
  onCountChange,
}: {
  onCountChange: (n: number) => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [agency, setAgency] = useState("");
  const [status, setStatus] = useState("posted");
  const [fundingCategory, setFundingCategory] = useState("");
  const [results, setResults] = useState<GrantOpportunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(true);

  const doSearch = useCallback(
    async (pageNum: number, append = false) => {
      setLoading(true);
      setSearched(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (keyword) params.set("keyword", keyword);
        if (agency) params.set("agency", agency);
        if (status !== "all") params.set("status", status);
        if (fundingCategory) params.set("fundingCategory", fundingCategory);
        params.set("page", String(pageNum));
        params.set("pageSize", "25");

        const res = await fetch(
          `/api/opportunities/search/grants?${params.toString()}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.error) {
            setError(data.error);
          }
          const grants: GrantOpportunity[] = data.results ?? data.data ?? [];
          const total: number = data.total ?? grants.length;
          if (append) {
            setResults((prev) => [...prev, ...grants]);
          } else {
            setResults(grants);
          }
          setTotalRecords(total);
          onCountChange(append ? results.length + grants.length : grants.length);
        }
      } catch {
        setError("Failed to search grants. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [keyword, agency, status, fundingCategory]
  );

  const handleSearch = () => {
    setPage(1);
    doSearch(1, false);
  };

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    doSearch(next, true);
  };

  return (
    <div className="space-y-6">
      <FilterCard
        title="Grant Filters"
        expanded={filtersOpen}
        onToggle={() => setFiltersOpen(!filtersOpen)}
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="grant-keyword">Keyword</Label>
              <Input
                id="grant-keyword"
                placeholder="e.g. research, education"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grant-agency">Agency</Label>
              <Input
                id="grant-agency"
                placeholder="e.g. DOE, NSF"
                value={agency}
                onChange={(e) => setAgency(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v ?? "posted")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Posted" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="posted">Posted</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="forecasted">Forecasted</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="grant-category">Funding Category</Label>
              <Input
                id="grant-category"
                placeholder="e.g. Health, STEM"
                value={fundingCategory}
                onChange={(e) => setFundingCategory(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSearch} disabled={loading}>
              <MagnifyingGlass size={16} className="mr-2" />
              {loading ? "Searching..." : "Search Grants"}
            </Button>
          </div>
        </div>
      </FilterCard>

      {/* Results */}
      {/* Error Banner */}
      {error && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-start gap-3 py-3">
            <Handshake size={20} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                {error.includes("API key")
                  ? "API Key Required"
                  : "Notice"}
              </p>
              <p className="text-sm text-amber-700">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {loading && results.length === 0 ? (
        <ResultSkeletons count={6} />
      ) : results.length > 0 ? (
        <>
          <p className="text-sm text-muted-foreground">
            Showing {results.length}
            {totalRecords > 0 ? ` of ${totalRecords.toLocaleString()}` : ""}{" "}
            results
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {results.map((grant, idx) => (
              <Card
                key={grant.id || idx}
                className="hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="line-clamp-2 text-base leading-snug">
                    {grant.title}
                  </CardTitle>
                  {(grant.agencyName || grant.agency) && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Buildings size={14} />
                      <span className="truncate">
                        {grant.agencyName || grant.agency}
                      </span>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar size={14} className="shrink-0" />
                    <span>
                      {fmtDate(grant.postDate)} &rarr;{" "}
                      {fmtDate(grant.closeDate)}
                    </span>
                  </div>

                  {(grant.awardFloor != null || grant.awardCeiling != null) && (
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <CurrencyDollar
                        size={14}
                        className="shrink-0 text-emerald-600"
                      />
                      <span className="text-emerald-700">
                        {grant.awardFloor != null
                          ? currencyFmt.format(grant.awardFloor)
                          : "$0"}
                        {" - "}
                        {grant.awardCeiling != null
                          ? currencyFmt.format(grant.awardCeiling)
                          : "N/A"}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {grant.status && (
                      <Badge
                        variant="secondary"
                        className="bg-sky-50 text-sky-700 hover:bg-sky-50"
                      >
                        {grant.status}
                      </Badge>
                    )}
                    {grant.category && (
                      <Badge variant="outline" className="text-xs">
                        {grant.category}
                      </Badge>
                    )}
                  </div>

                  {grant.summary && (
                    <p className="line-clamp-3 text-sm text-muted-foreground/80">
                      {grant.summary}
                    </p>
                  )}

                  <div className="pt-1">
                    <Link
                      href={`/opportunities/grant-${grant.id}`}
                      className={buttonVariants({
                        size: "sm",
                        variant: "default",
                      })}
                    >
                      View Details
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {results.length < totalRecords && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={loading}
              >
                {loading ? "Loading..." : "Load More"}
              </Button>
            </div>
          )}
        </>
      ) : searched && !error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Handshake
              size={48}
              weight="duotone"
              className="mb-4 text-muted-foreground/40"
            />
            <p className="text-lg font-medium text-muted-foreground">
              No grants found
            </p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Try adjusting your search filters.
            </p>
          </CardContent>
        </Card>
      ) : !searched ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Handshake
              size={48}
              weight="duotone"
              className="mb-4 text-muted-foreground/40"
            />
            <p className="text-lg font-medium text-muted-foreground">
              Search for grants
            </p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Find federal grant opportunities from Grants.gov.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

// ─── Tab 3: Market Intel (Awards) ───────────────────────

function MarketIntelTab({
  onCountChange,
}: {
  onCountChange: (n: number) => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [naicsCode, setNaicsCode] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [results, setResults] = useState<AwardResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);

  const doSearch = useCallback(
    async (pageNum: number, append = false) => {
      setLoading(true);
      setSearched(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (keyword) params.set("keyword", keyword);
        if (naicsCode) params.set("naicsCode", naicsCode);
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);
        params.set("page", String(pageNum));
        params.set("limit", "25");

        const res = await fetch(
          `/api/opportunities/search/awards?${params.toString()}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.error) {
            setError(data.error);
          }
          const awards: AwardResult[] = data.results ?? data.data ?? [];
          const hasNext: boolean = data.hasNext ?? awards.length === 25;
          if (append) {
            setResults((prev) => [...prev, ...awards]);
          } else {
            setResults(awards);
          }
          setHasMore(hasNext);
          onCountChange(append ? results.length + awards.length : awards.length);
        }
      } catch {
        setError("Failed to search awards. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [keyword, naicsCode, dateFrom, dateTo]
  );

  const handleSearch = () => {
    setPage(1);
    doSearch(1, false);
  };

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    doSearch(next, true);
  };

  return (
    <div className="space-y-6">
      <FilterCard
        title="Award Filters"
        expanded={filtersOpen}
        onToggle={() => setFiltersOpen(!filtersOpen)}
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="award-keyword">Keyword</Label>
              <Input
                id="award-keyword"
                placeholder="e.g. cloud, logistics"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="award-naics">NAICS Code</Label>
              <Input
                id="award-naics"
                placeholder="e.g. 541512"
                value={naicsCode}
                onChange={(e) => setNaicsCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="award-from">Date From</Label>
              <Input
                id="award-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="award-to">Date To</Label>
              <Input
                id="award-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSearch} disabled={loading}>
              <MagnifyingGlass size={16} className="mr-2" />
              {loading ? "Searching..." : "Search Awards"}
            </Button>
          </div>
        </div>
      </FilterCard>

      {/* Error Banner */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-3">
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {loading && results.length === 0 ? (
        <ResultSkeletons count={6} />
      ) : results.length > 0 ? (
        <>
          <p className="text-sm text-muted-foreground">
            Showing {results.length} results
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {results.map((award, idx) => (
              <Card
                key={award.id || award.awardId || idx}
                className="hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="line-clamp-1 text-base leading-snug">
                    <Trophy
                      size={16}
                      weight="fill"
                      className="mr-1.5 inline text-amber-500"
                    />
                    {award.recipientName ?? "Unknown Recipient"}
                  </CardTitle>
                  {award.agency && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Buildings size={14} />
                      <span className="truncate">{award.agency}</span>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {award.awardAmount != null && (
                    <p className="text-xl font-semibold text-emerald-600">
                      {currencyFmt.format(award.awardAmount)}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {award.contractType && (
                      <Badge
                        variant="secondary"
                        className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50"
                      >
                        <FileText size={12} className="mr-1" />
                        {award.contractType}
                      </Badge>
                    )}
                    {award.naicsCode && (
                      <Badge variant="outline" className="font-mono text-xs">
                        {award.naicsCode}
                      </Badge>
                    )}
                    {award.stateCode && (
                      <Badge variant="outline" className="text-xs">
                        {award.stateCode}
                      </Badge>
                    )}
                  </div>

                  {award.awardId && (
                    <p className="font-mono text-xs text-muted-foreground">
                      Award #{award.awardId}
                    </p>
                  )}

                  {(award.startDate || award.endDate) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar size={14} className="shrink-0" />
                      <span>
                        {fmtDate(award.startDate)} &rarr;{" "}
                        {fmtDate(award.endDate)}
                      </span>
                    </div>
                  )}

                  {award.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground/80">
                      {award.description}
                    </p>
                  )}

                  {award.id && (
                    <div className="pt-1">
                      <Link
                        href={`/opportunities/award-${award.id}`}
                        className={buttonVariants({
                          size: "sm",
                          variant: "outline",
                        })}
                      >
                        View Details
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={loading}
              >
                {loading ? "Loading..." : "Load More"}
              </Button>
            </div>
          )}
        </>
      ) : searched && !error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Trophy
              size={48}
              weight="duotone"
              className="mb-4 text-muted-foreground/40"
            />
            <p className="text-lg font-medium text-muted-foreground">
              No awards found
            </p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Try adjusting your search filters or date range.
            </p>
          </CardContent>
        </Card>
      ) : !searched ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Trophy
              size={48}
              weight="duotone"
              className="mb-4 text-muted-foreground/40"
            />
            <p className="text-lg font-medium text-muted-foreground">
              Explore award data
            </p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Search USASpending.gov for contract awards and competitive
              intelligence.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

// ─── Tab 4: Saved Opportunities ─────────────────────────

function SavedTab({
  onCountChange,
}: {
  onCountChange: (n: number) => void;
}) {
  const [opportunities, setOpportunities] = useState<SavedOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchOpportunities() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (statusFilter !== "all") params.set("status", statusFilter);
        else params.set("status", "saved");
        if (searchQuery) params.set("search", searchQuery);

        const res = await fetch(`/api/opportunities?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          const opps: SavedOpportunity[] =
            data.opportunities ?? data ?? [];
          setOpportunities(opps);
          onCountChange(opps.length);
        }
      } catch {
        // Fetch failed silently
      } finally {
        setLoading(false);
      }
    }

    fetchOpportunities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <Card>
        <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-end">
          <div className="flex items-center gap-2">
            <Funnel size={16} className="text-muted-foreground" />
            <Label className="text-sm font-medium text-muted-foreground">
              Filters
            </Label>
          </div>
          <div className="flex flex-1 flex-wrap gap-3">
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v ?? "all")}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="saved">Saved</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Search saved opportunities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {loading ? (
        <ResultSkeletons count={6} />
      ) : opportunities.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {opportunities.map((opp) => (
            <Link key={opp.id} href={`/opportunities/${opp.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="line-clamp-2 text-base leading-snug">
                      {opp.title}
                    </CardTitle>
                    <Badge
                      variant="secondary"
                      className={statusColorMap[opp.status] ?? ""}
                    >
                      {opp.status.charAt(0).toUpperCase() +
                        opp.status.slice(1)}
                    </Badge>
                  </div>
                  {opp.agency && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Buildings size={14} />
                      <span className="truncate">{opp.agency}</span>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  {opp.matchScore != null && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Match Score
                          </span>
                          <span className="font-medium">
                            {Math.round(opp.matchScore)}%
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${opp.matchScore}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {opp.matchedClient && (
                    <div className="flex items-center gap-1.5 text-sm">
                      <Handshake
                        size={14}
                        className="text-muted-foreground"
                      />
                      <span className="text-muted-foreground">Client:</span>
                      <span className="font-medium">
                        {opp.matchedClient.name}
                      </span>
                    </div>
                  )}

                  {opp.responseDeadline && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar size={14} />
                      Deadline: {fmtDate(opp.responseDeadline)}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FloppyDisk
              size={48}
              weight="duotone"
              className="mb-4 text-muted-foreground/40"
            />
            <p className="text-lg font-medium text-muted-foreground">
              No saved opportunities
            </p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Search for opportunities in the Contracts tab and save them here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────

export default function OpportunitiesPage() {
  const [contractsCount, setContractsCount] = useState(0);
  const [grantsCount, setGrantsCount] = useState(0);
  const [awardsCount, setAwardsCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Opportunities</h1>
        <p className="text-muted-foreground">
          Discover and track government contract opportunities
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="contracts">
        <TabsList className="flex-wrap">
          <TabsTrigger value="contracts">
            <FileText size={16} className="mr-1.5" />
            Contracts (SAM.gov)
            <TabBadge count={contractsCount} />
          </TabsTrigger>
          <TabsTrigger value="grants">
            <Handshake size={16} className="mr-1.5" />
            Grants
            <TabBadge count={grantsCount} />
          </TabsTrigger>
          <TabsTrigger value="awards">
            <Trophy size={16} className="mr-1.5" />
            Market Intel (Awards)
            <TabBadge count={awardsCount} />
          </TabsTrigger>
          <TabsTrigger value="saved">
            <FloppyDisk size={16} className="mr-1.5" />
            Saved
            <TabBadge count={savedCount} />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contracts" className="mt-6">
          <ContractsTab onCountChange={setContractsCount} />
        </TabsContent>

        <TabsContent value="grants" className="mt-6">
          <GrantsTab onCountChange={setGrantsCount} />
        </TabsContent>

        <TabsContent value="awards" className="mt-6">
          <MarketIntelTab onCountChange={setAwardsCount} />
        </TabsContent>

        <TabsContent value="saved" className="mt-6">
          <SavedTab onCountChange={setSavedCount} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
