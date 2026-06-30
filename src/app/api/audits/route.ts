import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const auditId = req.nextUrl.searchParams.get("auditId");
    if (!auditId) {
      return NextResponse.json({ error: "شناسه ممیزی الزامی است" }, { status: 400 });
    }

    const audit = await db.audit.findUnique({
      where: { id: parseInt(auditId) },
      include: {
        center: { select: { name: true, type: true, province: true, city: true } },
      },
    });

    if (!audit) {
      return NextResponse.json({ error: "ممیزی یافت نشد" }, { status: 404 });
    }

    let parsedFormData: Record<string, unknown> = {};
    try {
      parsedFormData =
        typeof audit.formData === "string"
          ? JSON.parse(audit.formData)
          : audit.formData;
    } catch {
      // ignore parse error, return raw
    }

    return NextResponse.json({
      audit: {
        ...audit,
        formData: parsedFormData,
      },
    });
  } catch (error) {
    console.error("Audit fetch error:", error);
    return NextResponse.json({ error: "خطا در دریافت ممیزی" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { centerId, assessorName, visitDate, formData, status } = body;

    // Validation
    if (!centerId || !visitDate || !formData) {
      return NextResponse.json(
        { error: "فیلدهای الزامی: شناسه مرکز، تاریخ بازدید، داده‌های فرم" },
        { status: 400 }
      );
    }

    // Verify center exists
    const center = await db.medicalCenter.findUnique({
      where: { id: parseInt(centerId) },
    });

    if (!center) {
      return NextResponse.json({ error: "مرکز مورد نظر یافت نشد" }, { status: 404 });
    }

    // Parse and validate formData
    let parsedFormData: Record<string, unknown>;
    try {
      parsedFormData = typeof formData === "string" ? JSON.parse(formData) : formData;
    } catch {
      return NextResponse.json({ error: "داده‌های فرم نامعتبر است" }, { status: 400 });
    }

    // Count completed fields vs total
    let completedFields = 0;
    let totalFields = 0;
    if (Array.isArray(parsedFormData.rules)) {
      parsedFormData.rules.forEach((rule: { fields?: Array<{ value?: unknown }> }) => {
        if (Array.isArray(rule.fields)) {
          rule.fields.forEach((field) => {
            totalFields++;
            if (field.value !== undefined && field.value !== null && field.value !== "" && field.value !== 0) {
              completedFields++;
            }
          });
        }
      });
    }

    const audit = await db.audit.create({
      data: {
        centerId: parseInt(centerId),
        assessorName: assessorName || "کارشناس نظارت",
        visitDate: visitDate as string,
        formData: JSON.stringify(parsedFormData),
        status: status || "submitted",
      },
      include: { center: { select: { name: true, type: true } } },
    });

    return NextResponse.json({
      success: true,
      message: "گزارش ممیزی با موفقیت ثبت شد",
      audit: {
        id: audit.id,
        centerName: audit.center.name,
        completedFields,
        totalFields,
      },
    });
  } catch (error) {
    console.error("Audit submit error:", error);
    return NextResponse.json({ error: "خطا در ثبت گزارش ممیزی" }, { status: 500 });
  }
}