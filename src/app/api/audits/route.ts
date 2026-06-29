import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate centerId
    if (typeof body.centerId !== 'number' || !Number.isInteger(body.centerId)) {
      return NextResponse.json({ error: 'شناسه مرکز باید یک عدد صحیح باشد' }, { status: 400 })
    }

    const center = await db.medicalCenter.findUnique({ where: { id: body.centerId } })
    if (!center) {
      return NextResponse.json({ error: 'مرکز درمانی با این شناسه یافت نشد' }, { status: 404 })
    }

    // Validate visitDate
    if (!body.visitDate || typeof body.visitDate !== 'string' || !body.visitDate.trim()) {
      return NextResponse.json({ error: 'تاریخ بازدید الزامی است' }, { status: 400 })
    }

    // Validate formData is valid JSON with content
    if (typeof body.formData !== 'string' || !body.formData.trim()) {
      return NextResponse.json({ error: 'داده‌های فرم الزامی است' }, { status: 400 })
    }

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(body.formData)
    } catch {
      return NextResponse.json({ error: 'داده‌های فرم باید فرمت JSON معتبر داشته باشد' }, { status: 400 })
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return NextResponse.json({ error: 'داده‌های فرم باید یک آبجکت JSON باشد' }, { status: 400 })
    }

    // Check that form data has at least one key with non-empty value
    const keys = Object.keys(parsed)
    if (keys.length === 0) {
      return NextResponse.json({ error: 'فرم ممیزی خالی است' }, { status: 400 })
    }

    const audit = await db.audit.create({
      data: {
        centerId: body.centerId,
        visitDate: body.visitDate.trim(),
        formData: body.formData,
        assessorName: body.assessorName?.trim() || 'کارشناس نظارت',
        status: 'submitted',
      },
    })

    return NextResponse.json({
      success: true,
      id: audit.id,
      message: 'گزارش ممیزی با موفقیت ثبت شد',
    }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/audits] Error:', error)
    return NextResponse.json({ error: 'خطا در ثبت گزارش ممیزی' }, { status: 500 })
  }
}
