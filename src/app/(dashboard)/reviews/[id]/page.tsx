import { notFound } from "next/navigation";
import { format } from "date-fns";
import {
  CheckCircle,
  XCircle,
  ClockCounterClockwise,
  ChatCircle,
  ArrowLeft,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import ReviewForm from "./review-form";

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSession();

  const proposal = await prisma.proposal.findUnique({
    where: { id },
    include: {
      client: { select: { name: true } },
      author: { select: { name: true } },
      sections: { orderBy: { order: "asc" } },
      reviews: {
        include: { reviewer: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      comments: {
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!proposal) notFound();

  const completedReviews = proposal.reviews.filter(
    (r) => r.status === "completed"
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/reviews" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft size={16} className="mr-1" />
          Back
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{proposal.title}</h1>
        <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
          <span>{proposal.client.name}</span>
          <span>·</span>
          <span>by {proposal.author.name}</span>
          <span>·</span>
          <span>v{proposal.version}</span>
          <span>·</span>
          <span>{format(new Date(proposal.updatedAt), "MMM d, yyyy")}</span>
        </div>
        {proposal.description && (
          <p className="mt-2 text-sm text-muted-foreground">
            {proposal.description}
          </p>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Proposal Content</h2>
        {proposal.sections.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No sections have been added to this proposal yet.
            </CardContent>
          </Card>
        ) : (
          proposal.sections.map((section) => (
            <Card key={section.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{section.title}</CardTitle>
                  <Badge variant="secondary">{section.type}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                  {section.content ?? "No content"}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Previous Reviews */}
      {completedReviews.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Previous Reviews</h2>
          {completedReviews.map((review) => {
            const isApproved = review.decision === "approved";
            const isRejected = review.decision === "rejected";
            const Icon = isApproved
              ? CheckCircle
              : isRejected
                ? XCircle
                : ClockCounterClockwise;
            const iconColor = isApproved
              ? "text-green-600"
              : isRejected
                ? "text-red-600"
                : "text-yellow-600";

            return (
              <Card key={review.id}>
                <CardContent className="flex items-start gap-3 p-4">
                  <Icon size={20} weight="duotone" className={iconColor} />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        {review.reviewer.name}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(review.createdAt), "MMM d, yyyy")}
                      </span>
                    </div>
                    {review.score != null && (
                      <p className="text-sm text-muted-foreground">
                        Score: {review.score}/10
                      </p>
                    )}
                    {review.summary && (
                      <p className="text-sm">{review.summary}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Comments */}
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <ChatCircle size={20} weight="duotone" />
          Comments ({proposal.comments.length})
        </h2>
        {proposal.comments.length > 0 ? (
          <div className="space-y-3">
            {proposal.comments.map((comment) => (
              <Card key={comment.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{comment.author.name}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {comment.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(comment.createdAt), "MMM d, h:mm a")}
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 text-sm">{comment.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        )}
      </div>

      {/* Review Form */}
      {user && proposal.status === "in_review" && (
        <ReviewForm proposalId={proposal.id} />
      )}
    </div>
  );
}
