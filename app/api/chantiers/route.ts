import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const chantiers = await prisma.chantier.findMany({
    include: {
      client: true,
      adresse: true,
      _count: { select: { affectations: true, photos: true } }
    },
    orderBy: { createdAt: 'desc' }
  })
  return NextResponse.json(chantiers)
}

export async function POST(request: Request) {
  const body = await request.json()
  const chantier = await prisma.chantier.create({
    data: body,
    include: { client: true, adresse: true }
  })
  return NextResponse.json(chantier, { status: 201 })
}
