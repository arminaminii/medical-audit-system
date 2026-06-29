import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl

    const q = searchParams.get('q')?.trim() || ''
    const province = searchParams.get('province')?.trim() || ''
    const city = searchParams.get('city')?.trim() || ''
    const type = searchParams.get('type')?.trim() || ''
    const online = searchParams.get('online')?.trim() || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20)
    )

    // Build the WHERE clause
    const where: Record<string, unknown> = {}

    // Keyword search across name, displayName, and address
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { displayName: { contains: q } },
        { address: { contains: q } },
      ]
    }

    // Exact filters
    if (province) {
      where.province = province
    }
    if (city) {
      where.city = city
    }
    if (type) {
      where.type = type
    }
    if (online !== '') {
      where.isOnline = online === 'true'
    }

    // Run count and find in parallel
    const [total, data] = await Promise.all([
      db.medicalCenter.count({ where }),
      db.medicalCenter.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { id: 'asc' },
      }),
    ])

    const totalPages = Math.max(1, Math.ceil(total / limit))

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages,
    })
  } catch (error) {
    console.error('[GET /api/centers] Error:', error)
    return NextResponse.json(
      { error: 'خطا در دریافت اطلاعات مراکز درمانی' },
      { status: 500 }
    )
  }
}