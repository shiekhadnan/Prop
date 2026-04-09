import { fetchSamOpportunityDetail } from "@/lib/sam-gov";
import { fetchGrantDetail } from "@/lib/grants-gov";
import { fetchAwardDetail } from "@/lib/usaspending";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const source = searchParams.get("source");

    if (!source || !["sam", "grants", "usaspending"].includes(source)) {
      return NextResponse.json(
        { error: "Invalid or missing source. Must be one of: sam, grants, usaspending" },
        { status: 400 }
      );
    }

    let detail: unknown;

    switch (source) {
      case "sam":
        detail = await fetchSamOpportunityDetail(id);
        break;
      case "grants":
        detail = await fetchGrantDetail(Number(id));
        break;
      case "usaspending":
        detail = await fetchAwardDetail(id);
        break;
    }

    return NextResponse.json(detail);
  } catch (error) {
    console.error("Opportunity detail fetch failed:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch opportunity detail";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
