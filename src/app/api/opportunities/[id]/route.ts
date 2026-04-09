import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
      include: {
        matchedClient: { select: { id: true, name: true, industry: true } },
      },
    });

    if (!opportunity) {
      return NextResponse.json(
        { error: "Opportunity not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(opportunity);
  } catch (error) {
    console.error("Failed to fetch opportunity:", error);
    return NextResponse.json(
      { error: "Failed to fetch opportunity" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.opportunity.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Opportunity not found" },
        { status: 404 }
      );
    }

    const {
      status,
      isSaved,
      notes,
      matchedClientId,
      matchScore,
    } = body;

    const data: Record<string, unknown> = {};
    if (status !== undefined) data.status = status;
    if (isSaved !== undefined) data.isSaved = Boolean(isSaved);
    if (notes !== undefined) data.notes = notes;
    if (matchedClientId !== undefined) data.matchedClientId = matchedClientId || null;
    if (matchScore !== undefined) data.matchScore = matchScore;

    const opportunity = await prisma.opportunity.update({
      where: { id },
      data,
      include: {
        matchedClient: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(opportunity);
  } catch (error) {
    console.error("Failed to update opportunity:", error);
    return NextResponse.json(
      { error: "Failed to update opportunity" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.opportunity.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Opportunity not found" },
        { status: 404 }
      );
    }

    await prisma.opportunity.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete opportunity:", error);
    return NextResponse.json(
      { error: "Failed to delete opportunity" },
      { status: 500 }
    );
  }
}
