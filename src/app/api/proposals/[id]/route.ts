import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/proposals/:id
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const proposal = await prisma.proposal.findUnique({
    where: { id },
    include: {
      client: true,
      author: { select: { id: true, name: true, email: true } },
      template: { select: { id: true, name: true } },
      sections: { orderBy: { order: "asc" } },
      comments: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  return NextResponse.json(proposal);
}

// PUT /api/proposals/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();

    // If updating a section inline
    if (body.sectionId) {
      const section = await prisma.section.update({
        where: { id: body.sectionId },
        data: {
          title: body.sectionTitle,
          content: body.sectionContent,
        },
      });
      return NextResponse.json(section);
    }

    // Otherwise update the proposal itself
    const {
      title,
      description,
      status,
      priority,
      dueDate,
      totalValue,
      clientId,
      content,
    } = body;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (dueDate !== undefined)
      updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (totalValue !== undefined)
      updateData.totalValue = totalValue ? parseFloat(totalValue) : null;
    if (clientId !== undefined) updateData.clientId = clientId;
    if (content !== undefined) updateData.content = content;

    const proposal = await prisma.proposal.update({
      where: { id },
      data: updateData,
      include: {
        client: { select: { id: true, name: true } },
        author: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(proposal);
  } catch (error) {
    console.error("Failed to update proposal:", error);
    return NextResponse.json(
      { error: "Failed to update proposal" },
      { status: 500 }
    );
  }
}

// DELETE /api/proposals/:id
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await prisma.proposal.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete proposal:", error);
    return NextResponse.json(
      { error: "Failed to delete proposal" },
      { status: 500 }
    );
  }
}
