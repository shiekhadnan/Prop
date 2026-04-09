import { prisma } from "@/lib/db";
import { searchOpportunities, type MappedOpportunity } from "@/lib/sam-gov";
import { bestMatchForOpportunity } from "@/lib/opportunity-matcher";
import { NextRequest, NextResponse } from "next/server";

function formatDate(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const keyword: string | undefined = body.keyword ?? undefined;
    const naicsCode: string | undefined = body.naicsCode ?? undefined;
    const daysBack: number = body.daysBack ?? 7;

    // Calculate date range
    const now = new Date();
    const fromDate = new Date(now);
    fromDate.setDate(fromDate.getDate() - daysBack);

    const postedFrom = formatDate(fromDate);
    const postedTo = formatDate(now);

    // Fetch from SAM.gov
    const result = await searchOpportunities({
      keyword,
      naicsCode,
      postedFrom,
      postedTo,
      limit: 100,
      offset: 0,
    });

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
    let created = 0;
    let updated = 0;

    for (const opp of result.opportunities) {
      if (!opp.externalId) continue;

      // Find best client match
      const match = clients.length > 0
        ? bestMatchForOpportunity(opp, clients)
        : null;

      const data: Record<string, unknown> = {
        title: opp.title,
        solicitationNum: opp.solicitationNum,
        department: opp.department,
        agency: opp.agency,
        office: opp.office,
        type: opp.type,
        setAside: opp.setAside,
        naicsCode: opp.naicsCode,
        classificationCode: opp.classificationCode,
        description: opp.description,
        postedDate: opp.postedDate,
        responseDeadline: opp.responseDeadline,
        archiveDate: opp.archiveDate,
        placeOfPerformance: opp.placeOfPerformance,
        pointOfContact: opp.pointOfContact,
        resourceLinks: opp.resourceLinks,
        source: opp.source,
        rawData: opp.rawData,
      };

      if (match && match.score >= 10) {
        data.matchScore = match.score;
        data.matchedClientId = match.clientId;
      }

      const existing = await prisma.opportunity.findUnique({
        where: { externalId: opp.externalId },
      });

      if (existing) {
        await prisma.opportunity.update({
          where: { externalId: opp.externalId },
          data,
        });
        updated++;
      } else {
        await prisma.opportunity.create({
          data: {
            externalId: opp.externalId,
            ...data,
          } as Parameters<typeof prisma.opportunity.create>[0]["data"],
        });
        created++;
      }
    }

    return NextResponse.json({
      success: true,
      fetched: result.opportunities.length,
      created,
      updated,
      totalRecords: result.totalRecords,
    });
  } catch (error) {
    console.error("Opportunity sync failed:", error);
    const message =
      error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
