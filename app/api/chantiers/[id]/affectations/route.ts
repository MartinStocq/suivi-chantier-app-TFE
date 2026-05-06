import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

// POST — affecter un ouvrier
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await getCurrentUser()
    if (!me)                         return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (me.role !== 'CHEF_CHANTIER') return NextResponse.json({ error: 'Accès refusé'   }, { status: 403 })

    const { id: chantierId } = await params
    const { userId } = await req.json()

    if (!userId) return NextResponse.json({ error: 'userId requis' }, { status: 400 })

    const existing = await prisma.affectationChantier.findFirst({
      where: { chantierId, userId },
    })
    if (existing) return NextResponse.json({ error: 'Ouvrier déjà affecté' }, { status: 409 })

    const affectation = await prisma.affectationChantier.create({
      data: {
        chantierId,
        userId,
        roleSurChantier: 'OUVRIER',
        dateDebut:       new Date(),
      },
      include: { user: true },
    })

    await prisma.actionJournal.create({
      data: {
        action: 'AFFECTATION_OUVRIER',
        chantierId,
        auteurId: me.id,
        details: `Affectation de ${affectation.user.nom}`,
      }
    })

    return NextResponse.json(affectation, { status: 201 })

  } catch (err) {
    console.error('[POST /api/chantiers/[id]/affectations]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE — retirer un ouvrier
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await getCurrentUser()
    if (!me)                         return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (me.role !== 'CHEF_CHANTIER') return NextResponse.json({ error: 'Accès refusé'   }, { status: 403 })

    const { id: chantierId } = await params
    const { userId } = await req.json()

    const userToErase = await prisma.utilisateur.findUnique({ where: { id: userId } })

    await prisma.affectationChantier.deleteMany({
      where: { chantierId, userId },
    })

    if (userToErase) {
      await prisma.actionJournal.create({
        data: {
          action: 'RETRAIT_OUVRIER',
          chantierId,
          auteurId: me.id,
          details: `Retrait de ${userToErase.nom}`,
        }
      })
    }

    return NextResponse.json({ message: 'Ouvrier retiré' })

  } catch (err) {
    console.error('[DELETE /api/chantiers/[id]/affectations]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}