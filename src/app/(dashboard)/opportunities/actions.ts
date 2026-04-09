"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function saveOpportunity(id: string) {
  await prisma.opportunity.update({
    where: { id },
    data: { isSaved: true, status: "saved" },
  });

  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/${id}`);
}

export async function dismissOpportunity(id: string) {
  await prisma.opportunity.update({
    where: { id },
    data: { status: "dismissed" },
  });

  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/${id}`);
}

export async function activateOpportunity(id: string) {
  await prisma.opportunity.update({
    where: { id },
    data: { status: "active" },
  });

  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/${id}`);
}

export async function updateOpportunityNotes(id: string, notes: string) {
  await prisma.opportunity.update({
    where: { id },
    data: { notes },
  });

  revalidatePath(`/opportunities/${id}`);
}

export async function createProposalFromOpportunity(opportunityId: string) {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    include: { matchedClient: true },
  });

  if (!opportunity) {
    throw new Error("Opportunity not found");
  }

  if (!opportunity.matchedClientId) {
    throw new Error("No matched client for this opportunity");
  }

  const proposal = await prisma.proposal.create({
    data: {
      title: opportunity.title,
      description: opportunity.description
        ? opportunity.description.substring(0, 500)
        : `Proposal for ${opportunity.title}`,
      clientId: opportunity.matchedClientId,
      authorId: session.id,
      status: "draft",
      dueDate: opportunity.responseDeadline,
      totalValue: opportunity.estimatedValue,
    },
  });

  // Create initial sections from opportunity data
  const sections = [
    {
      title: "Executive Summary",
      content: `Proposal in response to ${opportunity.solicitationNum || opportunity.title}.\n\nAgency: ${opportunity.agency || "N/A"}\nNAICS Code: ${opportunity.naicsCode || "N/A"}\nSet-Aside: ${opportunity.setAside || "N/A"}`,
      type: "text",
      order: 0,
    },
    {
      title: "Technical Approach",
      content: "",
      type: "text",
      order: 1,
    },
    {
      title: "Past Performance",
      content: "",
      type: "text",
      order: 2,
    },
    {
      title: "Pricing",
      content: "",
      type: "text",
      order: 3,
    },
  ];

  await prisma.section.createMany({
    data: sections.map((s) => ({
      ...s,
      proposalId: proposal.id,
    })),
  });

  revalidatePath("/proposals");
  redirect(`/proposals/${proposal.id}`);
}
