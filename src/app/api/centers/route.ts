import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const search = url.searchParams.get("search")?.trim() || "";
    const province = url.searchParams.get("province") || "";
    const city = url.searchParams.get("city") || "";
    const type = url.searchParams.get("type") || "";
    const isOnline = url.searchParams.get("isOnline") || "";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "25")));

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { displayName: { contains: search } },
        { address: { contains: search } },
        { centerCode: { contains: search } },
      ];
    }
    if (province) where.province = province;
    if (city) where.city = city;
    if (type) where.type = type;
    if (isOnline === "1") where.isOnline = true;
    else if (isOnline === "0") where.isOnline = false;

    const [centers, total] = await Promise.all([
      db.medicalCenter.findMany({
        where,
        orderBy: { id: "asc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, name: true, centerCode: true, type: true, isOnline: true,
          province: true, city: true, phone: true, address: true, isActive: true,
        },
      }),
      db.medicalCenter.count({ where }),
    ]);

    return NextResponse.json({
      centers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Centers error:", error);
    return NextResponse.json({ error: "خطا در دریافت مراکز" }, { status: 500 });
  }
}
