import { searchOpportunities } from "@/lib/sam-gov";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const keyword = searchParams.get("keyword") ?? undefined;
    const naicsCode = searchParams.get("naicsCode") ?? undefined;
    const typeOfSetAside = searchParams.get("setAside") ?? undefined;
    const postedFrom = searchParams.get("postedFrom") ?? undefined;
    const postedTo = searchParams.get("postedTo") ?? undefined;
    const ptype = searchParams.get("ptype") ?? undefined;
    const limit = parseInt(searchParams.get("limit") ?? "25", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const result = await searchOpportunities({
      keyword,
      naicsCode,
      typeOfSetAside,
      postedFrom,
      postedTo,
      ptype,
      limit: Math.min(100, Math.max(1, limit)),
      offset: Math.max(0, offset),
    });

    return NextResponse.json({
      data: result.opportunities,
      totalRecords: result.totalRecords,
    });
  } catch (error) {
    console.error("SAM.gov search failed:", error);
    const message =
      error instanceof Error ? error.message : "Failed to search SAM.gov";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
