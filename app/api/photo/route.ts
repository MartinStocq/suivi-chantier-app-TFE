import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { TypePhoto } from '@prisma/client'

export async function POST(req: NextRequest) {
  const { storagePath, type, chantierId, takenById } = await req.json()

  if (!storagePath || !chantierId || !takenById) {
    return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
  }

  const photo = await prisma.photo.create({
    data: {
      storagePath,
      type: type as TypePhoto,
      chantierId,
      takenById
    }
  })

  return NextResponse.json(photo)
}
