import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import {
  FileText,
  Plus,
  FunnelSimple,
  CurrencyDollar,
} from "@phosphor-icons/react/dist/ssr";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const statusColorMap: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 hover:bg-gray-100",
  in_review: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  approved: "bg-green-100 text-green-800 hover:bg-green-100",
  rejected: "bg-red-100 text-red-800 hover:bg-red-100",
  sent: "bg-blue-100 text-blue-800 hover:bg-blue-100",
};

const priorityColorMap: Record<string, string> = {
  low: "bg-slate-100 text-slate-600 hover:bg-slate-100",
  medium: "bg-orange-100 text-orange-700 hover:bg-orange-100",
  high: "bg-red-100 text-red-700 hover:bg-red-100",
  urgent: "bg-red-200 text-red-900 hover:bg-red-200",
};

function formatStatus(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "In Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

type ProposalWithRelations = {
  id: string;
  title: string;
  status: string;
  priority: string;
  totalValue: number | null;
  createdAt: Date;
  client: { name: string };
  author: { name: string };
};

function ProposalTable({ proposals }: { proposals: ProposalWithRelations[] }) {
  if (proposals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText size={48} weight="duotone" className="mb-4 text-muted-foreground/50" />
        <p className="text-lg font-medium text-muted-foreground">No proposals found</p>
        <p className="mt-1 text-sm text-muted-foreground/70">
          Create your first proposal to get started.
        </p>
        <Link href="/proposals/new" className={buttonVariants({ className: "mt-4" })}>
          <Plus size={18} className="mr-2" />
          New Proposal
        </Link>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead className="text-right">
            <span className="inline-flex items-center gap-1">
              <CurrencyDollar size={14} />
              Value
            </span>
          </TableHead>
          <TableHead>Author</TableHead>
          <TableHead className="text-right">Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {proposals.map((proposal) => (
          <TableRow key={proposal.id}>
            <TableCell>
              <Link
                href={`/proposals/${proposal.id}`}
                className="font-medium hover:underline"
              >
                {proposal.title}
              </Link>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {proposal.client.name}
            </TableCell>
            <TableCell>
              <Badge
                variant="secondary"
                className={statusColorMap[proposal.status] ?? ""}
              >
                {formatStatus(proposal.status)}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge
                variant="secondary"
                className={priorityColorMap[proposal.priority] ?? ""}
              >
                {proposal.priority.charAt(0).toUpperCase() +
                  proposal.priority.slice(1)}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              {proposal.totalValue != null
                ? currencyFormatter.format(proposal.totalValue)
                : "--"}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {proposal.author.name}
            </TableCell>
            <TableCell className="text-right text-muted-foreground">
              {format(new Date(proposal.createdAt), "MMM d, yyyy")}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default async function ProposalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const params = await searchParams;
  const statusFilter = params.status || "all";

  const where =
    statusFilter !== "all" ? { status: statusFilter } : undefined;

  const proposals = await prisma.proposal.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { name: true } },
      author: { select: { name: true } },
    },
  });

  // Get counts per status for the tab badges
  const [allCount, draftCount, inReviewCount, approvedCount, rejectedCount] =
    await Promise.all([
      prisma.proposal.count(),
      prisma.proposal.count({ where: { status: "draft" } }),
      prisma.proposal.count({ where: { status: "in_review" } }),
      prisma.proposal.count({ where: { status: "approved" } }),
      prisma.proposal.count({ where: { status: "rejected" } }),
    ]);

  const countMap: Record<string, number> = {
    all: allCount,
    draft: draftCount,
    in_review: inReviewCount,
    approved: approvedCount,
    rejected: rejectedCount,
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Proposals</h1>
          <p className="text-muted-foreground">
            Manage and track all your proposals
          </p>
        </div>
        <Link href="/proposals/new" className={buttonVariants()}>
          <Plus size={18} className="mr-2" />
          New Proposal
        </Link>
      </div>

      {/* Filter Tabs & Content */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FunnelSimple size={16} />
            <span className="text-sm font-medium">Filter by status</span>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={statusFilter}>
            <TabsList variant="line" className="mb-4">
              {STATUS_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  <Link
                    href={
                      tab.value === "all"
                        ? "/proposals"
                        : `/proposals?status=${tab.value}`
                    }
                    className="flex items-center gap-1.5"
                  >
                    {tab.label}
                    <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs font-normal tabular-nums">
                      {countMap[tab.value] ?? 0}
                    </span>
                  </Link>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* We use the same content for all tabs since filtering is done server-side via searchParams */}
            {STATUS_TABS.map((tab) => (
              <TabsContent key={tab.value} value={tab.value}>
                <ProposalTable proposals={proposals} />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
