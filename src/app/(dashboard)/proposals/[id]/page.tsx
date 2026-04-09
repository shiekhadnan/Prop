import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import {
  FileText,
  ArrowLeft,
  PaperPlaneTilt,
  CheckCircle,
  XCircle,
  Trash,
  PencilSimple,
  CurrencyDollar,
  CalendarBlank,
  User,
  Buildings,
} from "@phosphor-icons/react/dist/ssr";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { updateProposalStatus, deleteProposal } from "../actions";
import { ProposalSections } from "./proposal-sections";

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

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { id } = await params;

  const proposal = await prisma.proposal.findUnique({
    where: { id },
    include: {
      client: true,
      author: { select: { id: true, name: true, email: true } },
      template: { select: { id: true, name: true } },
      sections: { orderBy: { order: "asc" } },
    },
  });

  if (!proposal) {
    notFound();
  }

  // Status transition actions bound with the proposal id
  const submitForReview = updateProposalStatus.bind(null, id, "in_review");
  const approveProposal = updateProposalStatus.bind(null, id, "approved");
  const rejectProposal = updateProposalStatus.bind(null, id, "rejected");
  const markAsSent = updateProposalStatus.bind(null, id, "sent");
  const revertToDraft = updateProposalStatus.bind(null, id, "draft");
  const removeProposal = deleteProposal.bind(null, id);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Back link */}
      <Link href="/proposals" className={buttonVariants({ variant: "ghost", size: "sm" })}>
        <ArrowLeft size={18} className="mr-1" />
        Back to Proposals
      </Link>

      {/* Proposal Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <FileText
                  size={24}
                  weight="duotone"
                  className="text-primary"
                />
                <h1 className="text-2xl font-bold tracking-tight">
                  {proposal.title}
                </h1>
              </div>
              {proposal.description && (
                <p className="mt-1 text-muted-foreground">
                  {proposal.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className={statusColorMap[proposal.status] ?? ""}
              >
                {formatStatus(proposal.status)}
              </Badge>
              <Badge
                variant="secondary"
                className={priorityColorMap[proposal.priority] ?? ""}
              >
                {proposal.priority.charAt(0).toUpperCase() +
                  proposal.priority.slice(1)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-2 text-sm">
              <Buildings size={16} className="text-muted-foreground" />
              <span className="text-muted-foreground">Client:</span>
              <span className="font-medium">{proposal.client.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CurrencyDollar size={16} className="text-muted-foreground" />
              <span className="text-muted-foreground">Value:</span>
              <span className="font-medium">
                {proposal.totalValue != null
                  ? currencyFormatter.format(proposal.totalValue)
                  : "--"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <User size={16} className="text-muted-foreground" />
              <span className="text-muted-foreground">Author:</span>
              <span className="font-medium">{proposal.author.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CalendarBlank size={16} className="text-muted-foreground" />
              <span className="text-muted-foreground">Created:</span>
              <span className="font-medium">
                {format(new Date(proposal.createdAt), "MMM d, yyyy")}
              </span>
            </div>
          </div>
          {proposal.dueDate && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <CalendarBlank size={16} className="text-muted-foreground" />
              <span className="text-muted-foreground">Due:</span>
              <span className="font-medium">
                {format(new Date(proposal.dueDate), "MMM d, yyyy")}
              </span>
            </div>
          )}
          {proposal.template && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <FileText size={16} className="text-muted-foreground" />
              <span className="text-muted-foreground">Template:</span>
              <span className="font-medium">{proposal.template.name}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Workflow Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {proposal.status === "draft" && (
              <form action={submitForReview}>
                <Button type="submit" variant="default">
                  <PaperPlaneTilt size={16} className="mr-2" />
                  Submit for Review
                </Button>
              </form>
            )}
            {proposal.status === "in_review" && (
              <>
                <form action={approveProposal}>
                  <Button
                    type="submit"
                    className="bg-green-600 text-white hover:bg-green-700"
                  >
                    <CheckCircle size={16} className="mr-2" />
                    Approve
                  </Button>
                </form>
                <form action={rejectProposal}>
                  <Button type="submit" variant="destructive">
                    <XCircle size={16} className="mr-2" />
                    Reject
                  </Button>
                </form>
              </>
            )}
            {proposal.status === "approved" && (
              <form action={markAsSent}>
                <Button type="submit">
                  <PaperPlaneTilt size={16} className="mr-2" />
                  Mark as Sent
                </Button>
              </form>
            )}
            {(proposal.status === "rejected" ||
              proposal.status === "in_review") && (
              <form action={revertToDraft}>
                <Button type="submit" variant="outline">
                  <PencilSimple size={16} className="mr-2" />
                  Revert to Draft
                </Button>
              </form>
            )}

            <Separator orientation="vertical" className="mx-1 h-8" />

            <form action={removeProposal}>
              <Button type="submit" variant="destructive" size="sm">
                <Trash size={16} className="mr-1" />
                Delete
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Sections */}
      <ProposalSections
        proposalId={proposal.id}
        sections={proposal.sections.map((s) => ({
          id: s.id,
          title: s.title,
          content: s.content ?? "",
          type: s.type,
          order: s.order,
        }))}
        isEditable={proposal.status === "draft"}
      />
    </div>
  );
}
