import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { StatutChantier } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import { getCoordinates } from '@/lib/meteo'
import { notifyProjectMembers } from '@/lib/notifications'

import { sendMail } from '@/lib/mail'

// Helper pour envoyer l'alerte manuelle aux ouvriers immédiatement
async function triggerManualSuspensionAlert(chantierId: string, titre: string) {
  const current = await prisma.chantier.findUnique({
    where: { id: chantierId },
    include: {
      createdBy: true,
      client: true,
      adresse: true,
      affectations: { include: { user: true } }
    }
  });

  if (current) {
    console.log(`[ALERT] Envoi des emails pour la suspension de ${titre}...`);
    
    const recipients = new Map<string, { email: string, nom: string }>();
    if (current.createdBy.email) {
      recipients.set(current.createdBy.id, { email: current.createdBy.email, nom: current.createdBy.nom });
    }
    for (const a of current.affectations) {
      if (a.user.email) {
        recipients.set(a.user.id, { email: a.user.email, nom: a.user.nom });
      }
    }

    const adresseComplete = `${current.adresse.rue} ${current.adresse.numero}, ${current.adresse.codePostal} ${current.adresse.ville}`;

    for (const contact of recipients.values()) {
      await sendMail({
        to: contact.email,
        subject: `⚠️ Chantier Suspendu : ${current.titre}`,
        text: `Bonjour ${contact.nom},\n\nLe chantier "${current.titre}" (Client: ${current.client.nom}, Adresse: ${adresseComplete}) vient d'être suspendu.\n\nL'équipe de Suivi de Chantier`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #fecaca; border-radius: 12px; max-width: 600px; background: #fffcfc;">
            <h2 style="color: #b91c1c; margin-top: 0;">Chantier Suspendu</h2>
            <p>Bonjour <strong>${contact.nom}</strong>,</p>
            <p>Le chantier <strong>${current.titre}</strong> a été mis en pause.</p>
            
            <div style="margin: 20px 0; padding: 15px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 14px;">
              <p style="margin: 0 0 5px 0;"><strong>Client :</strong> ${current.client.nom}</p>
              <p style="margin: 0;"><strong>Adresse :</strong> ${adresseComplete}</p>
            </div>

            <div style="background: #fee2e2; padding: 20px; border-radius: 8px; color: #991b1b; text-align: center; margin: 25px 0;">
              <span style="font-size: 18px; font-weight: bold;">STATUT : SUSPENDU</span>
            </div>
            
            <hr style="border: none; border-top: 1px solid #fee2e2; margin: 25px 0;" />
            <p style="font-size: 11px; color: #999;">Notification manuelle - Suivi de Chantier App</p>
          </div>
        `
      }).catch(err => console.error(`Erreur email pour ${contact.email}:`, err));
    }
  }
}

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
        
        // Déclenchement de l'alerte différée si SUSPENDU manuellement
        if (targetStatut === StatutChantier.SUSPENDU) {
          triggerManualSuspensionAlert(id, existing.titre);
        }

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

    if (!titre?.trim())               return NextResponse.json({ error: 'Le titre est requis'          }, { status: 400 })
    if (titre.trim().length > 150)    return NextResponse.json({ error: 'Le titre est trop long (max 150 caractères)' }, { status: 400 })
    if (description?.trim() && description.trim().length > 2000) {
      return NextResponse.json({ error: 'La description est trop longue (max 2000 caractères)' }, { status: 400 })
    }
    if (!dateDebutPrevue)             return NextResponse.json({ error: 'La date de début est requise' }, { status: 400 })
    if (!client?.nom?.trim())         return NextResponse.json({ error: 'Le nom du client est requis'  }, { status: 400 })
    if (client.nom.trim().length > 100) return NextResponse.json({ error: 'Le nom du client est trop long (max 100 caractères)' }, { status: 400 })
    if (!adresse?.rue?.trim())        return NextResponse.json({ error: 'La rue est requise'           }, { status: 400 })
    if (!adresse?.numero?.trim())     return NextResponse.json({ error: 'Le numéro est requis'         }, { status: 400 })
    if (!adresse?.codePostal?.trim()) return NextResponse.json({ error: 'Le code postal est requis'   }, { status: 400 })
    if (!adresse?.ville?.trim())      return NextResponse.json({ error: 'La ville est requise'         }, { status: 400 })

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

    const chantier = await prisma.chantier.update({
      where: { id: id },
      data: {
        titre:           titre.trim(),
        description:     description?.trim() ?? null,
        statut:          parseStatut(statut),
        dateDebutPrevue: new Date(dateDebutPrevue),
        dateFinPrevue:   dateFinPrevue ? new Date(dateFinPrevue) : null,
        client:  { 
          update: { 
            nom:       client.nom.trim(), 
            telephone: client.telephone?.trim() ?? null, 
            email:     client.email?.trim()     ?? null 
          } 
        },
        adresse: { 
          update: { 
            rue:        adresse.rue.trim(), 
            numero:     adresse.numero.trim(), 
            codePostal: adresse.codePostal.trim(), 
            ville:      adresse.ville.trim(), 
            pays:       adresse.pays?.trim() ?? 'Belgique',
            latitude:   lat,
            longitude:  lon,
          } 
        },
      },
      include: { client: true, adresse: true },
    })

    if (statut && existing.statut !== parseStatut(statut)) {
      console.log(`[API PUT] Full update: Status changed to ${parseStatut(statut)}. Notifying...`);
      
      const newStatut = parseStatut(statut);
      if (newStatut === StatutChantier.SUSPENDU) {
        triggerManualSuspensionAlert(chantier.id, chantier.titre);
      }

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