import { searchGrants } from "@/lib/grants-gov";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const keyword = searchParams.get("keyword") ?? undefined;
    const agency = searchParams.get("agency") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const fundingCategory = searchParams.get("fundingCategory") ?? undefined;
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") ?? "25", 10);

    const result = await searchGrants({
      keyword,
      agency,
      status,
      fundingCategory,
      page: Math.max(1, page),
      pageSize: Math.min(100, Math.max(1, pageSize)),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Grants.gov search failed:", error);
    const message =
      error instanceof Error ? error.message : "Failed to search Grants.gov";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
