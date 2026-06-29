import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const province = req.nextUrl.searchParams.get("province");
    if (!province) {
      return NextResponse.json({ cities: [] });
    }

    const cities = await db.medicalCenter.findMany({
      distinct: ["city"],
      where: { province },
      orderBy: { city: "asc" },
      select: { city: true },
    });

    return NextResponse.json({ cities: cities.map((c) => c.city) });
  } catch (error) {
    console.error("Cities error:", error);
    return NextResponse.json({ error: "خطا در دریافت شهرها" }, { status: 500 });
  }
}