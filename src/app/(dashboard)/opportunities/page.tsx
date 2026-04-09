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
  Star,
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

interface OpportunityResult {
  id: string;
  externalId: string;
  title: string;
  agency: string | null;
  type: string | null;
  setAside: string | null;
  naicsCode: string | null;
  postedDate: string | null;
  responseDeadline: string | null;
  estimatedValue: number | null;
  description: string | null;
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

const currencyFormatter = new Intl.NumberFormat("en-US", {
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
  award: "bg-green-100 text-green-800 hover:bg-green-100",
  combined: "bg-orange-100 text-orange-800 hover:bg-orange-100",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  try {
    return format(new Date(dateStr), "MMM d, yyyy");
  } catch {
    return "N/A";
  }
}

// ─── Loading Skeletons ──────────────────────────────────

function ResultSkeletons() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
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

// ─── Live Search Tab ────────────────────────────────────

function LiveSearchTab() {
  const [keyword, setKeyword] = useState("");
  const [naicsCode, setNaicsCode] = useState("");
  const [setAsideType, setSetAsideType] = useState("all");
  const [postedFrom, setPostedFrom] = useState("");
  const [postedTo, setPostedTo] = useState("");
  const [results, setResults] = useState<OpportunityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (keyword) params.set("keyword", keyword);
      if (naicsCode) params.set("naicsCode", naicsCode);
      if (setAsideType !== "all") params.set("setAside", setAsideType);
      if (postedFrom) params.set("postedFrom", postedFrom);
      if (postedTo) params.set("postedTo", postedTo);

      const res = await fetch(`/api/opportunities/search?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.opportunities ?? data ?? []);
      }
    } catch {
      // Search failed silently
    } finally {
      setLoading(false);
    }
  }, [keyword, naicsCode, setAsideType, postedFrom, postedTo]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const body: Record<string, string> = {};
      if (keyword) body.keyword = keyword;
      if (naicsCode) body.naicsCode = naicsCode;
      if (setAsideType !== "all") body.setAside = setAsideType;
      if (postedFrom) body.postedFrom = postedFrom;
      if (postedTo) body.postedTo = postedTo;

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
      {/* Search Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MagnifyingGlass size={18} className="text-muted-foreground" />
            Search Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="keyword">Keyword</Label>
              <Input
                id="keyword"
                placeholder="e.g. cybersecurity, IT support"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="naicsCode">NAICS Code</Label>
              <Input
                id="naicsCode"
                placeholder="e.g. 541512"
                value={naicsCode}
                onChange={(e) => setNaicsCode(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Set-Aside Type</Label>
              <Select
                value={setAsideType}
                onValueChange={(v) => setSetAsideType(v ?? "all")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="SB">Small Business (SB)</SelectItem>
                  <SelectItem value="8A">8(a) Program</SelectItem>
                  <SelectItem value="HZC">HUBZone (HZC)</SelectItem>
                  <SelectItem value="SDVOSB">SDVOSB</SelectItem>
                  <SelectItem value="WOSB">WOSB</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="postedFrom">Posted From</Label>
              <Input
                id="postedFrom"
                type="date"
                value={postedFrom}
                onChange={(e) => setPostedFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postedTo">Posted To</Label>
              <Input
                id="postedTo"
                type="date"
                value={postedTo}
                onChange={(e) => setPostedTo(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSearch} disabled={loading}>
              <MagnifyingGlass size={16} className="mr-2" />
              {loading ? "Searching..." : "Search SAM.gov"}
            </Button>
            <Button variant="outline" onClick={handleSync} disabled={syncing}>
              <ArrowsClockwise
                size={16}
                className={`mr-2 ${syncing ? "animate-spin" : ""}`}
              />
              {syncing ? "Syncing..." : "Sync & Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {loading ? (
        <ResultSkeletons />
      ) : results.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {results.map((opp) => (
            <Card
              key={opp.id || opp.externalId}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-base leading-snug">
                  {opp.title}
                </CardTitle>
                {opp.agency && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Buildings size={14} />
                    {opp.agency}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {opp.type && (
                    <Badge
                      variant="secondary"
                      className={typeColorMap[opp.type.toLowerCase()] ?? ""}
                    >
                      {opp.type}
                    </Badge>
                  )}
                  {opp.setAside && (
                    <Badge variant="secondary">
                      <Tag size={12} className="mr-1" />
                      {opp.setAside}
                    </Badge>
                  )}
                  {opp.naicsCode && (
                    <Badge variant="outline">{opp.naicsCode}</Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    Posted: {formatDate(opp.postedDate)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    Due: {formatDate(opp.responseDeadline)}
                  </div>
                </div>

                {opp.estimatedValue != null && (
                  <p className="text-sm font-medium">
                    Est. Value: {currencyFormatter.format(opp.estimatedValue)}
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSave(opp.id || opp.externalId)}
                    disabled={savingId === (opp.id || opp.externalId)}
                  >
                    <FloppyDisk size={14} className="mr-1" />
                    {savingId === (opp.id || opp.externalId)
                      ? "Saving..."
                      : "Save"}
                  </Button>
                  {opp.id && (
                    <Link
                      href={`/opportunities/${opp.id}`}
                      className={buttonVariants({
                        size: "sm",
                        variant: "ghost",
                      })}
                    >
                      View Details
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : searched ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Binoculars
              size={48}
              weight="duotone"
              className="mb-4 text-muted-foreground/50"
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
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Binoculars
              size={48}
              weight="duotone"
              className="mb-4 text-muted-foreground/50"
            />
            <p className="text-lg font-medium text-muted-foreground">
              Search for opportunities
            </p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Enter your search criteria above and click &quot;Search
              SAM.gov&quot; to find government contracts.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Saved Opportunities Tab ────────────────────────────

function SavedOpportunitiesTab() {
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
        if (searchQuery) params.set("search", searchQuery);

        const res = await fetch(`/api/opportunities?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setOpportunities(data.opportunities ?? data ?? []);
        }
      } catch {
        // Fetch failed silently
      } finally {
        setLoading(false);
      }
    }

    fetchOpportunities();
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
                <SelectItem value="all">All Statuses</SelectItem>
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
        <ResultSkeletons />
      ) : opportunities.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {opportunities.map((opp) => (
            <Link key={opp.id} href={`/opportunities/${opp.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">
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
                      {opp.agency}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  {opp.matchScore != null && (
                    <div className="flex items-center gap-2">
                      <Star
                        size={14}
                        weight="fill"
                        className="text-yellow-500"
                      />
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
                            className="h-full rounded-full bg-yellow-500 transition-all"
                            style={{ width: `${opp.matchScore}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {opp.matchedClient && (
                    <div className="flex items-center gap-1.5 text-sm">
                      <Buildings size={14} className="text-muted-foreground" />
                      <span className="text-muted-foreground">Client:</span>
                      <span className="font-medium">
                        {opp.matchedClient.name}
                      </span>
                    </div>
                  )}

                  {opp.responseDeadline && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar size={14} />
                      Deadline: {formatDate(opp.responseDeadline)}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FloppyDisk
              size={48}
              weight="duotone"
              className="mb-4 text-muted-foreground/50"
            />
            <p className="text-lg font-medium text-muted-foreground">
              No saved opportunities
            </p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Search for opportunities in the Live Search tab and save them
              here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────

export default function OpportunitiesPage() {
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
      <Tabs defaultValue="search">
        <TabsList>
          <TabsTrigger value="search">
            <Binoculars size={16} className="mr-1.5" />
            Live Search
          </TabsTrigger>
          <TabsTrigger value="saved">
            <FloppyDisk size={16} className="mr-1.5" />
            Saved Opportunities
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search">
          <LiveSearchTab />
        </TabsContent>

        <TabsContent value="saved">
          <SavedOpportunitiesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
