import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [totalCenters, totalAudits, provinceCount, typeCount] = await Promise.all([
      db.medicalCenter.count(),
      db.audit.count(),
      db.medicalCenter.groupBy({ by: ["province"] }).then((r) => r.length),
      db.medicalCenter.groupBy({ by: ["type"] }).then((r) => r.length),
    ]);

    const recentAudits = await db.audit.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { center: { select: { name: true, type: true, province: true, city: true } } },
    });

    return NextResponse.json({
      totalCenters,
      totalAudits,
      provinceCount,
      typeCount,
      recentAudits: recentAudits.map((a) => ({
        id: a.id,
        centerName: a.center.name,
        centerType: a.center.type,
        location: a.center.province + " · " + a.center.city,
        assessorName: a.assessorName,
        visitDate: a.visitDate,
        status: a.status,
        createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json({ error: "خطا در دریافت آمار" }, { status: 500 });
  }
}