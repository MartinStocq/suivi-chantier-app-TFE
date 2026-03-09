import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { id, nom, email } = await req.json()

  if (!id) return NextResponse.json({ error: 'ID manquant' }, { status: 400 })

  const user = await prisma.utilisateur.create({
    data: {
      id: id as string,  // ← force le type string
      nom,
      email,
      role: 'OUVRIER'
    }
  })

  return NextResponse.json(user)
}
