import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// GET /api/chantiers → liste tous les chantiers
export async function GET() {
  const chantiers = await prisma.chantier.findMany()
  return NextResponse.json(chantiers)
}

// POST /api/chantiers → créer un chantier
export async function POST(request: Request) {
  const body = await request.json()
  const chantier = await prisma.chantier.create({ data: body })
  return NextResponse.json(chantier, { status: 201 })
}
