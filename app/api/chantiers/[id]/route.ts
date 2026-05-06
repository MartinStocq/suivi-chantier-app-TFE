import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { StatutChantier } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import { getCoordinates } from '@/lib/meteo'
import { notifyProjectMembers } from '@/lib/notifications'

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
    const existing = await prisma.chantier.findUnique({ where: { id }, select: { id: true, statut: true, titre: true } })
    if (!existing) return NextResponse.json({ error: 'Chantier non trouvé' }, { status: 404 })

    const body = await req.json()
    const { titre, description, statut, dateDebutPrevue, dateFinPrevue, client, adresse } = body

    const targetStatut = statut ? parseStatut(statut) : undefined
    const targetDateDebut = dateDebutPrevue ? new Date(dateDebutPrevue) : undefined

    if (statut && !titre && !client && !adresse) {
      console.log(`[API PUT] Quick status update for ${id} to ${targetStatut}`);
      const chantier = await prisma.chantier.update({ where: { id }, data: { statut: targetStatut } })
      
      if (existing.statut !== targetStatut) {
        console.log(`[API PUT] Status changed from ${existing.statut}. Notifying members...`);
        await prisma.actionJournal.create({
          data: {
            action: 'CHANGEMENT_STATUT',
            chantierId: id,
            auteurId: me.id,
            details: `Statut passé de ${existing.statut} à ${targetStatut}`,
          }
        })

        await notifyProjectMembers(
          id,
          "Changement de statut",
          `Le statut du chantier "${existing.titre}" est passé de ${existing.statut} à ${targetStatut}.`,
          me.id
        )
      }

      return NextResponse.json(chantier)
    }

    if (!titre)               return NextResponse.json({ error: 'Le titre est requis'          }, { status: 400 })
    if (!dateDebutPrevue)     return NextResponse.json({ error: 'La date de début est requise' }, { status: 400 })
    if (!client?.nom)         return NextResponse.json({ error: 'Le nom du client est requis'  }, { status: 400 })
    if (!adresse?.rue)        return NextResponse.json({ error: 'La rue est requise'           }, { status: 400 })
    if (!adresse?.numero)     return NextResponse.json({ error: 'Le numéro est requis'         }, { status: 400 })
    if (!adresse?.codePostal) return NextResponse.json({ error: 'Le code postal est requis'   }, { status: 400 })
    if (!adresse?.ville)      return NextResponse.json({ error: 'La ville est requise'         }, { status: 400 })

    let lat = adresse.latitude ? parseFloat(adresse.latitude) : null
    let lon = adresse.longitude ? parseFloat(adresse.longitude) : null

    // Si pas de coordonnées manuelles, on géocode
    if (!lat || !lon) {
      const query = `${adresse.rue} ${adresse.numero}, ${adresse.ville}, ${adresse.pays || 'Belgique'}`
      const coords = await getCoordinates(query)
      if (coords) {
        lat = coords.latitude
        lon = coords.longitude
      }
    }

    const chantier = await prisma.chantier.update({
      where: { id: id },
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
            latitude: lat,
            longitude: lon,
          } 
        },
      },
      include: { client: true, adresse: true },
    })

    if (statut && existing.statut !== parseStatut(statut)) {
      console.log(`[API PUT] Full update: Status changed to ${parseStatut(statut)}. Notifying...`);
      await prisma.actionJournal.create({
        data: {
          action: 'CHANGEMENT_STATUT',
          chantierId: chantier.id,
          auteurId: me.id,
          details: `Statut passé de ${existing.statut} à ${parseStatut(statut)}`,
        }
      })
      
      await notifyProjectMembers(
        chantier.id,
        "Mise à jour du chantier",
        `Le chantier "${chantier.titre}" a été mis à jour (Statut, Dates ou Infos).`,
        me.id
      )
    } else {
      console.log(`[API PUT] Full update: No status change. Notifying...`);
      // Notification générique si pas de changement de statut mais d'autres modifs
      await notifyProjectMembers(
        chantier.id,
        "Mise à jour du chantier",
        `Les informations du chantier "${chantier.titre}" ont été modifiées.`,
        me.id
      )
    }

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