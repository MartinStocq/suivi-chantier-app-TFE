// app/api/photos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'      // import nommé (cohérent avec les autres routes)
import { getCurrentUser } from '@/lib/auth'
import { TypePhoto } from '@prisma/client'

export async function POST(req: NextRequest) {
  try {
    const me = await getCurrentUser()
    if (!me) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { storagePath, type, chantierId, takenById } = await req.json()

    if (!storagePath || !chantierId || !takenById) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    // Un ouvrier ne peut uploader que pour lui-même
    if (me.role !== 'CHEF_CHANTIER' && me.id !== takenById) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const photo = await prisma.photo.create({
      data: {
        storagePath,
        type: type as TypePhoto,
        chantierId,
        takenById,
      },
    })

    return NextResponse.json(photo, { status: 201 })

  } catch (err) {
    console.error('[POST /api/photos]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}