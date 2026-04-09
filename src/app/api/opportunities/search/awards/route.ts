import { searchAwards } from "@/lib/usaspending";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const keyword = searchParams.get("keyword") ?? undefined;
    const agency = searchParams.get("agency") ?? undefined;
    const naicsCode = searchParams.get("naicsCode") ?? undefined;
    const dateFrom = searchParams.get("dateFrom") ?? undefined;
    const dateTo = searchParams.get("dateTo") ?? undefined;
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = parseInt(searchParams.get("limit") ?? "25", 10);

    const result = await searchAwards({
      keyword,
      agency,
      naicsCode,
      dateFrom,
      dateTo,
      page: Math.max(1, page),
      limit: Math.min(100, Math.max(1, limit)),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("USASpending search failed:", error);
    const message =
      error instanceof Error ? error.message : "Failed to search USASpending";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
