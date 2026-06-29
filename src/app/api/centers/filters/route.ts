import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_request: NextRequest) {
  try {
    // Run all three distinct queries in parallel
    const [provinces, cities, types] = await Promise.all([
      db.medicalCenter.findMany({
        distinct: ['province'],
        select: { province: true },
        orderBy: { province: 'asc' },
      }),
      db.medicalCenter.findMany({
        distinct: ['city'],
        select: { city: true },
        orderBy: { city: 'asc' },
      }),
      db.medicalCenter.findMany({
        distinct: ['type'],
        select: { type: true },
        orderBy: { type: 'asc' },
      }),
    ])

    return NextResponse.json({
      provinces: provinces.map((p) => p.province),
      cities: cities.map((c) => c.city),
      types: types.map((t) => t.type),
    })
  } catch (error) {
    console.error('[GET /api/centers/filters] Error:', error)
    return NextResponse.json(
      { error: 'خطا در دریافت فیلترها' },
      { status: 500 }
    )
  }
}