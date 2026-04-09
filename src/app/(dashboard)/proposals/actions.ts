"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function getClientsAndTemplates() {
  const [clients, templates] = await Promise.all([
    prisma.client.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.template.findMany({
      select: { id: true, name: true, description: true },
      where: { type: "proposal" },
      orderBy: { name: "asc" },
    }),
  ]);

  return { clients, templates };
}

export async function createProposal(formData: FormData) {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const title = formData.get("title") as string;
  const description = formData.get("description") as string | null;
  const clientId = formData.get("clientId") as string;
  const templateId = (formData.get("templateId") as string) || null;
  const priority = (formData.get("priority") as string) || "medium";
  const dueDateStr = formData.get("dueDate") as string | null;
  const totalValueStr = formData.get("totalValue") as string | null;

  if (!title || !clientId) {
    throw new Error("Title and client are required");
  }

  const dueDate = dueDateStr ? new Date(dueDateStr) : null;
  const totalValue = totalValueStr ? parseFloat(totalValueStr) : null;

  const proposal = await prisma.proposal.create({
    data: {
      title,
      description: description || null,
      clientId,
      templateId: templateId || null,
      priority,
      dueDate,
      totalValue: totalValue && !isNaN(totalValue) ? totalValue : null,
      authorId: session.id,
      status: "draft",
    },
  });

  // If a template was selected, create initial sections from template content
  if (templateId) {
    const template = await prisma.template.findUnique({
      where: { id: templateId },
    });

    if (template?.content) {
      try {
        const sections = JSON.parse(template.content) as Array<{
          title: string;
          content?: string;
          type?: string;
        }>;
        if (Array.isArray(sections)) {
          await prisma.section.createMany({
            data: sections.map((s, i) => ({
              title: s.title || `Section ${i + 1}`,
              content: s.content || "",
              type: s.type || "text",
              order: i,
              proposalId: proposal.id,
            })),
          });
        }
      } catch {
        // Template content is not JSON sections, create a single section
        await prisma.section.create({
          data: {
            title: "Content",
            content: template.content,
            type: "text",
            order: 0,
            proposalId: proposal.id,
          },
        });
      }
    }
  }

  revalidatePath("/proposals");
  redirect(`/proposals/${proposal.id}`);
}

export async function updateProposalStatus(id: string, status: string) {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const validStatuses = ["draft", "in_review", "approved", "rejected", "sent"];
  if (!validStatuses.includes(status)) {
    throw new Error("Invalid status");
  }

  await prisma.proposal.update({
    where: { id },
    data: { status },
  });

  revalidatePath(`/proposals/${id}`);
  revalidatePath("/proposals");
}

export async function deleteProposal(id: string) {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  await prisma.proposal.delete({
    where: { id },
  });

  revalidatePath("/proposals");
  redirect("/proposals");
}
