import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (me.role !== 'CHEF_CHANTIER') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const users = await prisma.utilisateur.findMany({ orderBy: { nom: 'asc' } })
  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const { id, nom, email } = await req.json()

  if (!id || !nom || !email) {
    return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
  }

  // FIX — `role` du body ignoré, toujours OUVRIER à la création
  const user = await prisma.utilisateur.upsert({
    where:  { id },
    update: {},
    create: { id, nom, email, role: 'OUVRIER' },
  })

  return NextResponse.json(user, { status: 201 })
}