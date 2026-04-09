import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/proposals - List proposals
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const skip = (page - 1) * limit;

  const where = status && status !== "all" ? { status } : undefined;

  const [proposals, total] = await Promise.all([
    prisma.proposal.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { id: true, name: true } },
        author: { select: { id: true, name: true } },
      },
    }),
    prisma.proposal.count({ where }),
  ]);

  return NextResponse.json({
    proposals,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// POST /api/proposals - Create a proposal
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, description, clientId, templateId, priority, dueDate, totalValue } =
      body;

    if (!title || !clientId) {
      return NextResponse.json(
        { error: "Title and client are required" },
        { status: 400 }
      );
    }

    const proposal = await prisma.proposal.create({
      data: {
        title,
        description: description || null,
        clientId,
        templateId: templateId || null,
        priority: priority || "medium",
        dueDate: dueDate ? new Date(dueDate) : null,
        totalValue: totalValue ? parseFloat(totalValue) : null,
        authorId: session.id,
        status: "draft",
      },
      include: {
        client: { select: { id: true, name: true } },
        author: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(proposal, { status: 201 });
  } catch (error) {
    console.error("Failed to create proposal:", error);
    return NextResponse.json(
      { error: "Failed to create proposal" },
      { status: 500 }
    );
  }
}
