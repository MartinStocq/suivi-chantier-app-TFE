import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import type { Role } from '@prisma/client'

export async function POST(req: NextRequest) {
  const { id, nom, email, role } = await req.json()

  if (!id || !nom || !email) {
    return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
  }

  const validRoles: Role[] = ['OUVRIER', 'CHEF_CHANTIER']
  const userRole: Role = validRoles.includes(role) ? role : 'OUVRIER'

  // upsert = crée si inexistant, ignore si déjà là
  const user = await prisma.utilisateur.upsert({
    where: { id },
    update: {},
    create: { id, nom, email, role: userRole }
  })

  return NextResponse.json(user)
}

