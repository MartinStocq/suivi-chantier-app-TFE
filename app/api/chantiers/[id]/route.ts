import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { StatutChantier } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

function parseStatut(val: unknown): StatutChantier {
  const str = String(val ?? '').toUpperCase().replace(/[^A-Z]/g, '')
  const all = Object.values(StatutChantier)
  const exact = all.find(v => v === val)
  if (exact) return exact
  const fuzzy = all.find(v => v.replace(/_/g, '') === str)
  return fuzzy ?? all[0]
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await getCurrentUser()
    if (!me) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { id } = await params
    const chantier = await prisma.chantier.findUnique({
      where: { id },
      include: {
        client:       true,
        adresse:      true,
        createdBy:    true,
        affectations: { include: { user: true } },
        photos:       { orderBy: { takenAt: 'desc' } },
        _count:       { select: { photos: true, affectations: true } },
      },
    })

    if (!chantier) return NextResponse.json({ error: 'Non trouvé' }, { status: 404 })
    return NextResponse.json(chantier)

  } catch (err) {
    console.error('[GET /api/chantiers/[id]]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await getCurrentUser()
    if (!me)                         return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (me.role !== 'CHEF_CHANTIER') return NextResponse.json({ error: 'Accès refusé'    }, { status: 403 })

    const { id } = await params
    const existing = await prisma.chantier.findUnique({ where: { id }, select: { id: true } })
    if (!existing) return NextResponse.json({ error: 'Chantier non trouvé' }, { status: 404 })

    const body = await req.json()
    const { titre, description, statut, dateDebutPrevue, dateFinPrevue, client, adresse } = body

    if (statut && !titre && !client && !adresse) {
      const chantier = await prisma.chantier.update({ where: { id }, data: { statut: parseStatut(statut) } })
      return NextResponse.json(chantier)
    }

    if (!titre)               return NextResponse.json({ error: 'Le titre est requis'          }, { status: 400 })
    if (!dateDebutPrevue)     return NextResponse.json({ error: 'La date de début est requise' }, { status: 400 })
    if (!client?.nom)         return NextResponse.json({ error: 'Le nom du client est requis'  }, { status: 400 })
    if (!adresse?.rue)        return NextResponse.json({ error: 'La rue est requise'           }, { status: 400 })
    if (!adresse?.numero)     return NextResponse.json({ error: 'Le numéro est requis'         }, { status: 400 })
    if (!adresse?.codePostal) return NextResponse.json({ error: 'Le code postal est requis'   }, { status: 400 })
    if (!adresse?.ville)      return NextResponse.json({ error: 'La ville est requise'         }, { status: 400 })

    const chantier = await prisma.chantier.update({
      where: { id },
      data: {
        titre,
        description:     description ?? null,
        statut:          parseStatut(statut),
        dateDebutPrevue: new Date(dateDebutPrevue),
        dateFinPrevue:   dateFinPrevue ? new Date(dateFinPrevue) : null,
        client:  { update: { nom: client.nom, telephone: client.telephone ?? null, email: client.email ?? null } },
        adresse: { 
          update: { 
            rue: adresse.rue, 
            numero: adresse.numero, 
            codePostal: adresse.codePostal, 
            ville: adresse.ville, 
            pays: adresse.pays ?? 'Belgique',
            latitude: adresse.latitude ? parseFloat(adresse.latitude) : null,
            longitude: adresse.longitude ? parseFloat(adresse.longitude) : null,
          } 
        },
      },
      include: { client: true, adresse: true },
    })

    return NextResponse.json(chantier)

  } catch (err) {
    console.error('[PUT /api/chantiers/[id]]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
  }
}

// FIX #4 — Supprime les fichiers Storage avant la suppression en base
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await getCurrentUser()
    if (!me)                         return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (me.role !== 'CHEF_CHANTIER') return NextResponse.json({ error: 'Accès refusé'   }, { status: 403 })

    const { id } = await params

    // Récupère tous les paths avant suppression
    const photos = await prisma.photo.findMany({
      where:  { chantierId: id },
      select: { storagePath: true },
    })

    // Nettoie le Storage
    if (photos.length > 0) {
      const supabase = getSupabaseAdmin()
      await supabase.storage.from('photos').remove(photos.map(p => p.storagePath))
    }

    await prisma.chantier.delete({ where: { id } })
    return NextResponse.json({ message: 'Supprimé' })

  } catch (err) {
    console.error('[DELETE /api/chantiers/[id]]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}