import { searchSamOpportunities } from "@/lib/sam-gov";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const keyword = searchParams.get("keyword") ?? undefined;
    const naicsCode = searchParams.get("naicsCode") ?? undefined;
    const typeOfSetAside = searchParams.get("typeOfSetAside") ?? undefined;
    const ptype = searchParams.get("ptype") ?? undefined;
    const postedFrom = searchParams.get("postedFrom") ?? undefined;
    const postedTo = searchParams.get("postedTo") ?? undefined;
    const page = parseInt(searchParams.get("page") ?? "0", 10);
    const size = parseInt(searchParams.get("size") ?? "25", 10);

    const result = await searchSamOpportunities({
      keyword,
      naicsCode,
      typeOfSetAside,
      ptype,
      postedFrom,
      postedTo,
      index: Math.max(0, page),
      size: Math.min(100, Math.max(1, size)),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("SAM.gov search failed:", error);
    const message =
      error instanceof Error ? error.message : "Failed to search SAM.gov";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
