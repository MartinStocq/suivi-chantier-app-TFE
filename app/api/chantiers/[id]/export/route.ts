import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'CHEF_CHANTIER') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const { id } = await params
    const { searchParams } = new URL(req.url)
    const format = searchParams.get('format') || 'pdf'

    // 1. Récupération exhaustive des données (incluant photos)
    const chantier = await prisma.chantier.findUnique({
      where: { id },
      include: {
        client: true,
        adresse: true,
        createdBy: { select: { nom: true } },
        photos: { orderBy: { takenAt: 'asc' } },
        affectations: {
          include: { user: { select: { nom: true, email: true } } }
        },
        pointages: {
          orderBy: { date: 'asc' },
          include: { utilisateur: { select: { nom: true } } }
        }
      }
    })

    if (!chantier) {
      return NextResponse.json({ error: 'Chantier non trouvé' }, { status: 404 })
    }

    // 2. Journalisation
    await prisma.rapportExport.create({
      data: {
        format: format.toUpperCase() === 'CSV' ? 'CSV' : 'PDF',
        type: 'COMPTABILITE_IMAGE',
        chantierId: id,
        exportedById: user.id
      }
    })

    // Nom du fichier : Client - Ville
    const fileName = `${chantier.client.nom}-${chantier.adresse.ville}`.replace(/[/\\?%*:|"<>]/g, '_')

    // 3. Génération
    if (format === 'csv') {
      return generateCSV(chantier, fileName)
    } else {
      return await generatePDF(chantier, fileName)
    }
  } catch (error: any) {
    console.error('Export Error:', error)
    return NextResponse.json({ error: error.message || 'Erreur interne' }, { status: 500 })
  }
}

function sanitizeCSVField(val: any): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  // Prévention de l'injection de formules CSV (Excel/Sheets)
  if (['=', '+', '-', '@'].some(char => str.startsWith(char))) {
    return `'${str}`
  }
  return str
}

function generateCSV(chantier: any, fileName: string) {
  const lines: string[] = []

  // --- HEADER ---
  lines.push(`RAPPORT D'ACTIVITÉ;${sanitizeCSVField(chantier.titre.toUpperCase())};`)
  lines.push(`DATE D'EXPORT;${new Date().toLocaleDateString('fr-BE')};`)
  lines.push('')

  // --- CLIENT & CHANTIER ---
  lines.push('SECTION 1 : INFORMATIONS GÉNÉRALES')
  lines.push(`Client;${sanitizeCSVField(chantier.client.nom)};`)
  lines.push(`Adresse;${sanitizeCSVField(`${chantier.adresse.rue} ${chantier.adresse.numero}, ${chantier.adresse.codePostal} ${chantier.adresse.ville}`)};`)
  lines.push(`Statut Actuel;${chantier.statut.replace('_', ' ')};`)
  lines.push(`Date de Début;${new Date(chantier.dateDebutPrevue).toLocaleDateString('fr-BE')};`)
  if (chantier.dateFinPrevue) {
    lines.push(`Date de Fin;${new Date(chantier.dateFinPrevue).toLocaleDateString('fr-BE')};`)
  }
  lines.push('')

  // --- EQUIPE ---
  lines.push('SECTION 2 : ÉQUIPE AFFECTÉE')
  lines.push('NOM;EMAIL;RÔLE SUR LE CHANTIER')
  chantier.affectations.forEach((a: any) => {
    lines.push(`${sanitizeCSVField(a.user.nom.toUpperCase())};${sanitizeCSVField(a.user.email)};${a.roleSurChantier.replace('_', ' ')}`)
  })
  lines.push('')

  // --- POINTAGES ---
  lines.push('SECTION 3 : RÉCAPITULATIF DES PRESTATIONS')
  lines.push('OUVRIER;DATE;DÉBUT;FIN;DURÉE (H);COMMENTAIRE / TÂCHES')
  
  let totalHeures = 0
  chantier.pointages.forEach((p: any) => {
    const dateStr = new Date(p.date).toLocaleDateString('fr-BE')
    const debutStr = new Date(p.debut).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })
    const finStr = new Date(p.fin).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })
    const dureeStr = p.duree.toFixed(2).replace('.', ',')
    lines.push(`${sanitizeCSVField(p.utilisateur.nom.toUpperCase())};${dateStr};${debutStr};${finStr};${dureeStr};${sanitizeCSVField(p.commentaire || '-')}`)
    totalHeures += p.duree
  })
  
  lines.push('')
  lines.push(`TOTAL GÉNÉRAL;;;;${totalHeures.toFixed(2).replace('.', ',')};HEURES CUMULÉES`)

  const csvContent = lines.join('\n')
  const buffer = Buffer.from('\uFEFF' + csvContent, 'utf-8')

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}.csv"`
    }
  })
}

async function generatePDF(chantier: any, fileName: string) {
  const doc = new jsPDF()
  const totalHeures = chantier.pointages.reduce((acc: number, p: any) => acc + p.duree, 0)

  // --- DESIGN SYSTEM ---
  const primaryColor: [number, number, number] = [41, 128, 185] // Bleu Pro
  const secondaryColor: [number, number, number] = [52, 73, 94] // Gris Foncé Pro
  const accentColor: [number, number, number] = [189, 195, 199] // Gris Clair

  // --- HEADER MODERNE ---
  doc.setFillColor(...primaryColor)
  doc.rect(0, 0, 210, 45, 'F')
  
  doc.setTextColor(255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(26)
  doc.text('RAPPORT DE CHANTIER', 14, 22)
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`RÉFÉRENCE : ${chantier.id.substring(0, 8).toUpperCase()}`, 14, 30)
  
  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(0.5)
  doc.line(14, 33, 100, 33)
  
  doc.setFontSize(12)
  doc.text(`${chantier.titre.toUpperCase()}`, 14, 40)

  // --- BLOC INFOS (DÉTAILS) ---
  doc.setTextColor(...secondaryColor)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('1. INFORMATIONS GÉNÉRALES', 14, 60)
  
  doc.setDrawColor(...primaryColor)
  doc.setLineWidth(0.8)
  doc.line(14, 62, 35, 62)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('CLIENT :', 14, 72)
  doc.setFont('helvetica', 'normal')
  doc.text(chantier.client.nom, 45, 72)

  doc.setFont('helvetica', 'bold')
  doc.text('ADRESSE :', 14, 78)
  doc.setFont('helvetica', 'normal')
  doc.text(`${chantier.adresse.rue} ${chantier.adresse.numero}, ${chantier.adresse.codePostal} ${chantier.adresse.ville}`, 45, 78)

  doc.setFont('helvetica', 'bold')
  doc.text('PÉRIODE :', 14, 84)
  doc.setFont('helvetica', 'normal')
  doc.text(`Du ${new Date(chantier.dateDebutPrevue).toLocaleDateString('fr-BE')} au ${chantier.dateFinPrevue ? new Date(chantier.dateFinPrevue).toLocaleDateString('fr-BE') : 'En cours'}`, 45, 84)

  doc.setFont('helvetica', 'bold')
  doc.text('EXPORTÉ LE :', 14, 90)
  doc.setFont('helvetica', 'normal')
  doc.text(`${new Date().toLocaleDateString('fr-BE')} à ${new Date().toLocaleTimeString('fr-BE')}`, 45, 90)

  // --- SECTION 2 : ÉQUIPE ---
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('2. ÉQUIPE AFFECTÉE', 14, 105)
  doc.line(14, 107, 35, 107)

  const equipeRows = chantier.affectations.map((a: any) => [
    a.user.nom.toUpperCase(),
    a.user.email,
    a.roleSurChantier.replace('_', ' ')
  ])

  autoTable(doc, {
    startY: 112,
    head: [['NOM DE L\'OUVRIER', 'EMAIL CONTACT', 'RÔLE SUR SITE']],
    body: equipeRows,
    theme: 'grid',
    headStyles: { fillColor: secondaryColor, fontSize: 9, halign: 'center' },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: 'bold' } }
  })

  let currentY = (doc as any).lastAutoTable.finalY + 15

  // --- SECTION 3 : PRESTATIONS ---
  if (currentY > 240) { doc.addPage(); currentY = 20; }
  
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('3. RÉCAPITULATIF DES PRESTATIONS', 14, currentY)
  doc.line(14, currentY + 2, 35, currentY + 2)

  const pointageRows = chantier.pointages.map((p: any) => [
    p.utilisateur.nom.toUpperCase(),
    new Date(p.date).toLocaleDateString('fr-BE'),
    new Date(p.debut).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' }),
    new Date(p.fin).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' }),
    `${p.duree.toFixed(2).replace('.', ',')} h`,
    p.commentaire || '-'
  ])

  autoTable(doc, {
    startY: currentY + 7,
    head: [['OUVRIER', 'DATE', 'DÉBUT', 'FIN', 'DURÉE', 'COMMENTAIRE']],
    body: pointageRows,
    theme: 'striped',
    headStyles: { fillColor: primaryColor, fontSize: 9, halign: 'center' },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: { 4: { halign: 'right', fontStyle: 'bold' }, 5: { cellWidth: 50 } }
  })

  currentY = (doc as any).lastAutoTable.finalY + 12
  
  // Total stylisé
  doc.setFillColor(245, 247, 249)
  doc.rect(14, currentY, 182, 10, 'F')
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...primaryColor)
  doc.text(`TOTAL GÉNÉRAL DES HEURES CUMULÉES : ${totalHeures.toFixed(2).replace('.', ',')} HEURES`, 105, currentY + 6.5, { align: 'center' })
  doc.setTextColor(0)
  
  currentY += 25

  // --- FOOTER ---
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(`Page ${i} sur ${pageCount} - Rapport généré par Suivi Chantier App`, 105, 290, { align: 'center' })
  }

  const pdfOutput = doc.output('arraybuffer')

  return new NextResponse(pdfOutput, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}.pdf"`
    }
  })
}
