import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const center = await db.medicalCenter.findUnique({
      where: { id: parseInt(id) },
    });

    if (!center) {
      return NextResponse.json({ error: "مرکز یافت نشد" }, { status: 404 });
    }

    return NextResponse.json({ center });
  } catch (error) {
    console.error("Center detail error:", error);
    return NextResponse.json({ error: "خطا در دریافت اطلاعات مرکز" }, { status: 500 });
  }
}