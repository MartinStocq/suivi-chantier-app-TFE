import { prisma } from '@/lib/prisma'  // adapte selon ton lib/prisma.ts
import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const chantier = await prisma.chantier.findUnique({ where: { id } }) // ← string direct
  if (!chantier) return NextResponse.json({ error: 'Non trouvé' }, { status: 404 })
  return NextResponse.json(chantier)
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()
  const chantier = await prisma.chantier.update({ where: { id }, data: body }) // ← string direct
  return NextResponse.json(chantier)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.chantier.delete({ where: { id } }) // ← string direct
  return NextResponse.json({ message: 'Supprimé' })
}
