import { searchSamOpportunities } from "@/lib/sam-gov";
import { prisma } from "@/lib/db";
import { bestMatchForOpportunity } from "@/lib/opportunity-matcher";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const keyword: string | undefined = body.keyword ?? undefined;
    const naicsCode: string | undefined = body.naicsCode ?? undefined;
    const size: number = body.size ?? 100;

    // Fetch from SAM.gov
    const result = await searchSamOpportunities({
      keyword,
      naicsCode,
      size: Math.min(500, Math.max(1, size)),
      index: 0,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    // Fetch all clients for matching
    const clients = await prisma.client.findMany({
      select: {
        id: true,
        naicsCodes: true,
        setAsideTypes: true,
        capabilities: true,
        industry: true,
      },
    });

    // Upsert each opportunity
    let synced = 0;

    for (const opp of result.results) {
      if (!opp.id) continue;

      // Find best client match
      const match =
        clients.length > 0
          ? bestMatchForOpportunity(
              {
                naicsCode: opp.naicsCode,
                setAside: opp.setAside,
                title: opp.title,
                description: opp.description,
              },
              clients
            )
          : null;

      const data: Record<string, unknown> = {
        title: opp.title,
        solicitationNum: opp.solicitationNumber,
        department: opp.department,
        agency: opp.agency,
        type: opp.type,
        setAside: opp.setAside,
        naicsCode: opp.naicsCode,
        description: opp.description,
        postedDate: opp.postedDate ? new Date(opp.postedDate) : null,
        responseDeadline: opp.responseDeadline
          ? new Date(opp.responseDeadline)
          : null,
        placeOfPerformance: opp.placeOfPerformance,
        source: "sam.gov",
      };

      if (match && match.score >= 10) {
        data.matchScore = match.score;
        data.matchedClientId = match.clientId;
      }

      await prisma.opportunity.upsert({
        where: { externalId: opp.id },
        update: data,
        create: {
          externalId: opp.id,
          ...data,
        } as Parameters<typeof prisma.opportunity.create>[0]["data"],
      });

      synced++;
    }

    return NextResponse.json({
      synced,
      total: result.total,
    });
  } catch (error) {
    console.error("Opportunity sync failed:", error);
    const message =
      error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
