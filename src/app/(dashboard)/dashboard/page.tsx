import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  FileText,
  Binoculars,
  Buildings,
  ClockCounterClockwise,
  CheckCircle,
  Plus,
  ArrowRight,
} from "@phosphor-icons/react/dist/ssr";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

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

export default async function DashboardPage() {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  const [totalProposals, activeClients, activeOpportunities, inReviewCount, approvedCount, recentProposals, latestOpportunities] =
    await Promise.all([
      prisma.proposal.count(),
      prisma.client.count(),
      prisma.opportunity.count({ where: { status: "active" } }),
      prisma.proposal.count({ where: { status: "in_review" } }),
      prisma.proposal.count({ where: { status: "approved" } }),
      prisma.proposal.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          client: { select: { name: true } },
        },
      }),
      prisma.opportunity.findMany({
        where: { status: "active" },
        take: 3,
        orderBy: { createdAt: "desc" },
      }),
    ]);

  const stats = [
    {
      label: "Total Proposals",
      value: totalProposals,
      icon: FileText,
      bg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      label: "Opportunities",
      value: activeOpportunities,
      icon: Binoculars,
      bg: "bg-indigo-50",
      iconColor: "text-indigo-600",
    },
    {
      label: "Active Clients",
      value: activeClients,
      icon: Buildings,
      bg: "bg-purple-50",
      iconColor: "text-purple-600",
    },
    {
      label: "In Review",
      value: inReviewCount,
      icon: ClockCounterClockwise,
      bg: "bg-yellow-50",
      iconColor: "text-yellow-600",
    },
    {
      label: "Approved",
      value: approvedCount,
      icon: CheckCircle,
      bg: "bg-green-50",
      iconColor: "text-green-600",
    },
  ];

  return (
    <div className="space-y-8 p-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {user.name}
        </h1>
        <p className="text-muted-foreground">
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-6">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${stat.bg}`}
              >
                <stat.icon size={24} weight="duotone" className={stat.iconColor} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Proposals */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Proposals</CardTitle>
          <Link href="/proposals" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            View all
            <ArrowRight size={16} className="ml-1" />
          </Link>
        </CardHeader>
        <CardContent>
          {recentProposals.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No proposals yet. Create your first one to get started.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Title</th>
                    <th className="pb-3 pr-4 font-medium">Client</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 pr-4 font-medium">Priority</th>
                    <th className="pb-3 pr-4 text-right font-medium">Value</th>
                    <th className="pb-3 text-right font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentProposals.map((proposal) => (
                    <tr
                      key={proposal.id}
                      className="border-b last:border-0 hover:bg-muted/50"
                    >
                      <td className="py-3 pr-4">
                        <Link
                          href={`/proposals/${proposal.id}`}
                          className="font-medium hover:underline"
                        >
                          {proposal.title}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {proposal.client.name}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge
                          variant="secondary"
                          className={statusColorMap[proposal.status] ?? ""}
                        >
                          {formatStatus(proposal.status)}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge
                          variant="secondary"
                          className={priorityColorMap[proposal.priority] ?? ""}
                        >
                          {proposal.priority.charAt(0).toUpperCase() +
                            proposal.priority.slice(1)}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {proposal.totalValue != null
                          ? currencyFormatter.format(proposal.totalValue)
                          : "--"}
                      </td>
                      <td className="py-3 text-right text-muted-foreground">
                        {format(new Date(proposal.createdAt), "MMM d, yyyy")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Latest Opportunities */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Latest Opportunities</CardTitle>
          <Link href="/opportunities" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            View all
            <ArrowRight size={16} className="ml-1" />
          </Link>
        </CardHeader>
        <CardContent>
          {latestOpportunities.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No active opportunities found.
            </p>
          ) : (
            <div className="space-y-3">
              {latestOpportunities.map((opp: any) => (
                <div
                  key={opp.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/opportunities/${opp.id}`}
                      className="font-medium hover:underline"
                    >
                      {opp.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">{opp.agency}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {opp.setAside && (
                      <Badge variant="secondary">{opp.setAside}</Badge>
                    )}
                    {opp.deadline && (
                      <span className="whitespace-nowrap text-sm text-muted-foreground">
                        Due {format(new Date(opp.deadline), "MMM d, yyyy")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/proposals/new" className={buttonVariants()}>
            <Plus size={18} className="mr-2" />
            New Proposal
          </Link>
          <Link href="/clients/new" className={buttonVariants({ variant: "outline" })}>
            <Plus size={18} className="mr-2" />
            Add Client
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
