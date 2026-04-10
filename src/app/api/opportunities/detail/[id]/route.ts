import {
  fetchSamOpportunityDetail,
  fetchSamResources,
} from "@/lib/sam-gov";
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
        {
          error:
            "Invalid or missing source. Must be one of: sam, grants, usaspending",
        },
        { status: 400 }
      );
    }

    switch (source) {
      case "sam": {
        const [detail, resources] = await Promise.all([
          fetchSamOpportunityDetail(id),
          fetchSamResources(id),
        ]);
        return NextResponse.json({
          source: "sam",
          data: detail.data,
          resources: resources.resources,
          error: detail.error || resources.error,
        });
      }
      case "grants": {
        const detail = await fetchGrantDetail(id);
        return NextResponse.json({
          source: "grants",
          data: detail.data,
          error: detail.error,
        });
      }
      case "usaspending": {
        const detail = await fetchAwardDetail(id);
        return NextResponse.json({
          source: "usaspending",
          data: detail.data,
          error: detail.error,
        });
      }
    }
  } catch (error) {
    console.error("Opportunity detail fetch failed:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch opportunity detail";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
