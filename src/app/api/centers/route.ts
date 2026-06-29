import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const q = url.searchParams.get("q")?.trim() || "";
    const province = url.searchParams.get("province") || "";
    const city = url.searchParams.get("city") || "";
    const type = url.searchParams.get("type") || "";
    const online = url.searchParams.get("online") || "";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get("perPage") || "25")));

    const where: Record<string, unknown> = {};

    if (q) {
      where.OR = [
        { name: { contains: q } },
        { displayName: { contains: q } },
        { address: { contains: q } },
        { centerCode: { contains: q } },
      ];
    }
    if (province) where.province = province;
    if (city) where.city = city;
    if (type) where.type = type;
    if (online === "1") where.isOnline = true;
    else if (online === "0") where.isOnline = false;

    const [centers, total] = await Promise.all([
      db.medicalCenter.findMany({
        where,
        orderBy: { id: "asc" },
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          name: true,
          centerCode: true,
          type: true,
          isOnline: true,
          province: true,
          city: true,
          phone: true,
          address: true,
        },
      }),
      db.medicalCenter.count({ where }),
    ]);

    return NextResponse.json({
      centers,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    });
  } catch (error) {
    console.error("Centers error:", error);
    return NextResponse.json({ error: "خطا در دریافت مراکز" }, { status: 500 });
  }
}