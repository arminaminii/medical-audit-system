import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const provinces = await db.medicalCenter.findMany({
      distinct: ["province"],
      where: { province: { not: "" } },
      orderBy: { province: "asc" },
      select: { province: true },
    });

    const types = await db.medicalCenter.findMany({
      distinct: ["type"],
      orderBy: { type: "asc" },
      select: { type: true },
    });

    return NextResponse.json({
      provinces: provinces.map((p) => p.province),
      types: types.map((t) => t.type),
    });
  } catch (error) {
    console.error("Filters error:", error);
    return NextResponse.json({ error: "خطا در دریافت فیلترها" }, { status: 500 });
  }
}