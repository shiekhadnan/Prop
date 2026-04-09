"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function submitReview(
  proposalId: string,
  decision: string,
  score: number,
  summary: string
) {
  const user = await getSession();
  if (!user) throw new Error("Not authenticated");

  // Upsert: update existing pending review or create new one
  const existing = await prisma.review.findFirst({
    where: { proposalId, reviewerId: user.id, status: "pending" },
  });

  if (existing) {
    await prisma.review.update({
      where: { id: existing.id },
      data: {
        decision,
        score,
        summary,
        status: "completed",
      },
    });
  } else {
    await prisma.review.create({
      data: {
        proposalId,
        reviewerId: user.id,
        decision,
        score,
        summary,
        status: "completed",
      },
    });
  }

  // Update proposal status based on decision
  if (decision === "approved") {
    await prisma.proposal.update({
      where: { id: proposalId },
      data: { status: "approved" },
    });
  } else if (decision === "rejected") {
    await prisma.proposal.update({
      where: { id: proposalId },
      data: { status: "rejected" },
    });
  }

  revalidatePath("/reviews");
  revalidatePath(`/reviews/${proposalId}`);
  revalidatePath("/dashboard");
}

export async function addComment(
  proposalId: string,
  reviewId: string | null,
  content: string,
  type: string = "general"
) {
  const user = await getSession();
  if (!user) throw new Error("Not authenticated");

  await prisma.comment.create({
    data: {
      content,
      type,
      proposalId,
      reviewId: reviewId ?? undefined,
      authorId: user.id,
    },
  });

  revalidatePath(`/reviews/${proposalId}`);
}
