import Link from "next/link";
import { format } from "date-fns";
import {
  CheckCircle,
  ClockCounterClockwise,
  XCircle,
  ChatCircle,
} from "@phosphor-icons/react/dist/ssr";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const decisionConfig: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  approved: {
    icon: CheckCircle,
    color: "bg-green-100 text-green-800 hover:bg-green-100",
    label: "Approved",
  },
  needs_changes: {
    icon: ClockCounterClockwise,
    color: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
    label: "Needs Changes",
  },
  rejected: {
    icon: XCircle,
    color: "bg-red-100 text-red-800 hover:bg-red-100",
    label: "Rejected",
  },
  pending: {
    icon: ClockCounterClockwise,
    color: "bg-gray-100 text-gray-700 hover:bg-gray-100",
    label: "Pending Review",
  },
};

export default async function ReviewsPage() {
  const proposals = await prisma.proposal.findMany({
    where: { status: "in_review" },
    orderBy: { updatedAt: "desc" },
    include: {
      client: { select: { name: true } },
      author: { select: { name: true } },
      reviews: {
        select: {
          id: true,
          status: true,
          decision: true,
          reviewer: { select: { name: true } },
        },
      },
      _count: { select: { comments: true } },
    },
  });

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reviews</h1>
        <p className="text-muted-foreground">
          Proposals awaiting your review and feedback
        </p>
      </div>

      {proposals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClockCounterClockwise
              size={48}
              weight="duotone"
              className="mx-auto mb-4 text-muted-foreground"
            />
            <p className="text-lg font-medium">No proposals in review</p>
            <p className="text-muted-foreground">
              Proposals submitted for review will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {proposals.map((proposal) => {
            const latestReview = proposal.reviews[proposal.reviews.length - 1];
            const reviewStatus = latestReview?.decision ?? "pending";
            const config = decisionConfig[reviewStatus] ?? decisionConfig.pending;
            const StatusIcon = config.icon;

            return (
              <Link key={proposal.id} href={`/reviews/${proposal.id}`}>
                <Card className="transition-colors hover:bg-muted/50">
                  <CardContent className="flex items-center justify-between p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-yellow-50">
                        <StatusIcon
                          size={22}
                          weight="duotone"
                          className="text-yellow-600"
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium">{proposal.title}</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>{proposal.client.name}</span>
                          <span>·</span>
                          <span>by {proposal.author.name}</span>
                          <span>·</span>
                          <span>
                            Submitted{" "}
                            {format(new Date(proposal.updatedAt), "MMM d, yyyy")}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {proposal._count.comments > 0 && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <ChatCircle size={16} />
                          <span>{proposal._count.comments}</span>
                        </div>
                      )}
                      <Badge variant="secondary" className={config.color}>
                        {config.label}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
