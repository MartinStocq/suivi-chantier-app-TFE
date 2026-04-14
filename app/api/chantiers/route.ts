import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { StatutChantier } from '@prisma/client'

function parseStatut(val: unknown): StatutChantier {
  const str = String(val ?? '').toUpperCase().replace(/[^A-Z]/g, '')
  const all = Object.values(StatutChantier)
  const exact = all.find(v => v === val)
  if (exact) return exact
  const fuzzy = all.find(v => v.replace(/_/g, '') === str)
  return fuzzy ?? all[0]
}

// ─── GET /api/chantiers ───────────────────────────────────────────────────────
export async function GET() {
  try {
    const me = await getCurrentUser()
    if (!me) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const chantiers = await prisma.chantier.findMany({
      include: {
        client:  true,
        adresse: true,
        _count:  { select: { affectations: true, photos: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(chantiers)
  } catch (err) {
    console.error('[GET /api/chantiers]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ─── POST /api/chantiers ──────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const me = await getCurrentUser()
    if (!me)                         return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (me.role !== 'CHEF_CHANTIER') return NextResponse.json({ error: 'Accès refusé'   }, { status: 403 })

    const body = await req.json()
    const { titre, description, statut, dateDebutPrevue, dateFinPrevue, client, adresse } = body

    if (!titre)               return NextResponse.json({ error: 'Le titre est requis'           }, { status: 400 })
    if (!dateDebutPrevue)     return NextResponse.json({ error: 'La date de début est requise'  }, { status: 400 })
    if (!client?.nom)         return NextResponse.json({ error: 'Le nom du client est requis'   }, { status: 400 })
    if (!adresse?.rue)        return NextResponse.json({ error: 'La rue est requise'            }, { status: 400 })
    if (!adresse?.numero)     return NextResponse.json({ error: 'Le numéro est requis'          }, { status: 400 })
    if (!adresse?.codePostal) return NextResponse.json({ error: 'Le code postal est requis'    }, { status: 400 })
    if (!adresse?.ville)      return NextResponse.json({ error: 'La ville est requise'          }, { status: 400 })

    const chantier = await prisma.chantier.create({
      data: {
        titre,
        description:     description   ?? null,
        statut:          parseStatut(statut),
        dateDebutPrevue: new Date(dateDebutPrevue),
        dateFinPrevue:   dateFinPrevue ? new Date(dateFinPrevue) : null,
        createdBy: { connect: { id: me.id } },
        client: {
          create: {
            nom:       client.nom,
            telephone: client.telephone ?? null,
            email:     client.email     ?? null,
          },
        },
        adresse: {
          create: {
            rue:        adresse.rue,
            numero:     adresse.numero,
            codePostal: adresse.codePostal,
            ville:      adresse.ville,
            pays:       adresse.pays    ?? 'Belgique',
          },
        },
      },
      include: { client: true, adresse: true },
    })

    return NextResponse.json(chantier, { status: 201 })

  } catch (err) {
    console.error('[POST /api/chantiers]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}