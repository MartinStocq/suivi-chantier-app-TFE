import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import type { Role } from '@prisma/client'

const validRoles: Role[] = ['OUVRIER', 'CHEF_CHANTIER']

// GET /api/users → liste tous les utilisateurs (Chef seulement)
export async function GET() {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (me.role !== 'CHEF_CHANTIER') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const users = await prisma.utilisateur.findMany({
    orderBy: { nom: 'asc' }
  })
  return NextResponse.json(users)
}

// POST /api/users → créer un utilisateur (appelé à l'inscription)
export async function POST(req: NextRequest) {
  const { id, nom, email, role } = await req.json()

  if (!id || !nom || !email) {
    return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
  }

  const userRole: Role = validRoles.includes(role) ? role : 'OUVRIER'

  const user = await prisma.utilisateur.upsert({
    where: { id },
    update: {},
    create: { id, nom, email, role: userRole }
  })

  return NextResponse.json(user, { status: 201 })
}

