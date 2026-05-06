import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import type { Role } from '@prisma/client'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params

  if (me.role !== 'CHEF_CHANTIER' && me.id !== id) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const user = await prisma.utilisateur.findUnique({ where: { id } })
  if (!user) return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })

  return NextResponse.json(user)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params

  // FIX — Un ouvrier ne peut modifier que son propre profil
  if (me.role !== 'CHEF_CHANTIER' && me.id !== id) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const body = await req.json()

  if (body.role && me.role !== 'CHEF_CHANTIER') {
    return NextResponse.json({ error: 'Seul un chef peut changer les rôles' }, { status: 403 })
  }

  const validRoles: Role[] = ['OUVRIER', 'CHEF_CHANTIER']
  const data: { nom?: string; role?: Role } = {}
  if (body.nom)                                    data.nom  = body.nom
  if (body.role && validRoles.includes(body.role)) data.role = body.role

  const user = await prisma.utilisateur.update({ where: { id }, data })
  return NextResponse.json(user)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (me.role !== 'CHEF_CHANTIER') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { id } = await params
  await prisma.utilisateur.delete({ where: { id } })
  return NextResponse.json({ message: 'Utilisateur supprimé' })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (me.role !== 'CHEF_CHANTIER') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { id } = await params
  const { action } = await req.json()

  if (action === 'approuver') {
    const user = await prisma.utilisateur.update({ where: { id }, data: { approuve: true } })
    return NextResponse.json(user)
  }

  if (action === 'refuser') {
    await prisma.utilisateur.delete({ where: { id } })
    return NextResponse.json({ message: 'Compte refusé et supprimé' })
  }

  return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
}