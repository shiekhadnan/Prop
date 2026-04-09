import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

function maskValue(value: string): string {
  if (value.length <= 8) return "••••••••";
  return value.slice(0, 4) + "••••" + value.slice(-4);
}

export async function GET() {
  try {
    const settings = await prisma.apiSetting.findMany({
      orderBy: { key: "asc" },
    });

    const masked = settings.map((s) => ({
      id: s.id,
      key: s.key,
      value: maskValue(s.value),
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));

    return NextResponse.json(masked);
  } catch (error) {
    console.error("Failed to fetch API keys:", error);
    return NextResponse.json(
      { error: "Failed to fetch API keys" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key || typeof key !== "string" || key.trim() === "") {
      return NextResponse.json(
        { error: "Key name is required" },
        { status: 400 }
      );
    }

    if (!value || typeof value !== "string" || value.trim() === "") {
      return NextResponse.json(
        { error: "Key value is required" },
        { status: 400 }
      );
    }

    const setting = await prisma.apiSetting.upsert({
      where: { key: key.trim() },
      update: { value: value.trim() },
      create: { key: key.trim(), value: value.trim() },
    });

    return NextResponse.json({
      id: setting.id,
      key: setting.key,
      value: maskValue(setting.value),
      createdAt: setting.createdAt,
      updatedAt: setting.updatedAt,
    });
  } catch (error) {
    console.error("Failed to save API key:", error);
    return NextResponse.json(
      { error: "Failed to save API key" },
      { status: 500 }
    );
  }
}
