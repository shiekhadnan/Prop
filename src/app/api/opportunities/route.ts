import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const source = searchParams.get("source");
    const search = searchParams.get("search");
    const naicsCode = searchParams.get("naicsCode");
    const setAside = searchParams.get("setAside");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (source) where.source = source;
    if (naicsCode) where.naicsCode = naicsCode;
    if (setAside) where.setAside = { contains: setAside };

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { solicitationNum: { contains: search } },
        { department: { contains: search } },
        { agency: { contains: search } },
      ];
    }

    const [opportunities, total] = await Promise.all([
      prisma.opportunity.findMany({
        where,
        include: {
          matchedClient: { select: { id: true, name: true } },
        },
        orderBy: { postedDate: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.opportunity.count({ where }),
    ]);

    return NextResponse.json({
      data: opportunities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch opportunities:", error);
    return NextResponse.json(
      { error: "Failed to fetch opportunities" },
      { status: 500 }
    );
  }
}
