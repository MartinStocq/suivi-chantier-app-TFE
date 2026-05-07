import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { StatutChantier } from '@prisma/client'
import { getCoordinates } from '@/lib/meteo'
import { createInAppNotification } from '@/lib/notifications'

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

    if (!titre?.trim())               return NextResponse.json({ error: 'Le titre est requis'           }, { status: 400 })
    if (titre.trim().length > 150)    return NextResponse.json({ error: 'Le titre est trop long (max 150 caractères)' }, { status: 400 })
    if (description?.trim() && description.trim().length > 2000) {
      return NextResponse.json({ error: 'La description est trop longue (max 2000 caractères)' }, { status: 400 })
    }
    if (!dateDebutPrevue)             return NextResponse.json({ error: 'La date de début est requise'  }, { status: 400 })
    if (!client?.nom?.trim())         return NextResponse.json({ error: 'Le nom du client est requis'   }, { status: 400 })
    if (client.nom.trim().length > 100) {
      return NextResponse.json({ error: 'Le nom du client est trop long (max 100 caractères)' }, { status: 400 })
    }
    if (!adresse?.rue?.trim())        return NextResponse.json({ error: 'La rue est requise'            }, { status: 400 })
    if (!adresse?.numero?.trim())     return NextResponse.json({ error: 'Le numéro est requis'          }, { status: 400 })
    if (!adresse?.codePostal?.trim()) return NextResponse.json({ error: 'Le code postal est requis'    }, { status: 400 })
    if (!adresse?.ville?.trim())      return NextResponse.json({ error: 'La ville est requise'          }, { status: 400 })

    const targetStatut = parseStatut(statut)
    const targetDateDebut = new Date(dateDebutPrevue)

    // Sécurité : Pas de "Suspendu" dans le futur
    if (targetStatut === StatutChantier.SUSPENDU && targetDateDebut.getTime() > new Date().setHours(23,59,59,999)) {
      return NextResponse.json({ error: "Impossible de créer un chantier 'Suspendu' avant sa date de début." }, { status: 400 })
    }

    let lat = adresse.latitude ? parseFloat(adresse.latitude) : null
    let lon = adresse.longitude ? parseFloat(adresse.longitude) : null

    // Si pas de coordonnées manuelles, on géocode
    if (!lat || !lon) {
      const query = `${adresse.rue.trim()} ${adresse.numero.trim()}, ${adresse.ville.trim()}, ${adresse.pays?.trim() || 'Belgique'}`
      const coords = await getCoordinates(query)
      if (coords) {
        lat = coords.latitude
        lon = coords.longitude
      }
    }

    const chantier = await prisma.chantier.create({
      data: {
        titre:           titre.trim(),
        description:     description?.trim() ?? null,
        statut:          parseStatut(statut),
        dateDebutPrevue: new Date(dateDebutPrevue),
        dateFinPrevue:   dateFinPrevue ? new Date(dateFinPrevue) : null,
        createdBy: { connect: { id: me.id } },
        client: {
          create: {
            nom:       client.nom.trim(),
            telephone: client.telephone?.trim() ?? null,
            email:     client.email?.trim()     ?? null,
          },
        },
        adresse: {
          create: {
            rue:        adresse.rue.trim(),
            numero:     adresse.numero.trim(),
            codePostal: adresse.codePostal.trim(),
            ville:      adresse.ville.trim(),
            pays:       adresse.pays?.trim()    ?? 'Belgique',
            latitude:   lat,
            longitude:  lon,
          },
        },
      },
      include: { client: true, adresse: true },
    })

    await prisma.actionJournal.create({
      data: {
        action: 'CREATION_CHANTIER',
        chantierId: chantier.id,
        auteurId: me.id,
        details: `Création du chantier "${chantier.titre}"`,
      }
    })

    await createInAppNotification(
      me.id,
      "Nouveau chantier créé",
      `Le chantier "${chantier.titre}" a été créé avec succès.`,
      `/chantiers/${chantier.id}`
    )

    return NextResponse.json(chantier, { status: 201 })

  } catch (err) {
    console.error('[POST /api/chantiers]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}