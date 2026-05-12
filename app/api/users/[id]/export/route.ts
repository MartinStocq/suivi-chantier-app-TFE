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
    const chef = await getCurrentUser()
    if (!chef || chef.role !== 'CHEF_CHANTIER') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const { id: targetUserId } = await params
    const { searchParams } = new URL(req.url)
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString())
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())

    // 1. Récupération de l'ouvrier et de ses pointages pour le mois
    const startOfMonth = new Date(year, month - 1, 1)
    const endOfMonth = new Date(year, month, 0, 23, 59, 59)

    const ouvrier = await prisma.utilisateur.findUnique({
      where: { id: targetUserId },
      include: {
        pointages: {
          where: {
            date: {
              gte: startOfMonth,
              lte: endOfMonth
            }
          },
          orderBy: { date: 'asc' },
          include: { chantier: { select: { titre: true } } }
        }
      }
    })

    if (!ouvrier) {
      return NextResponse.json({ error: 'Ouvrier non trouvé' }, { status: 404 })
    }

    // 2. Génération du PDF
    const fileName = `Rapport-${ouvrier.nom}-${month}-${year}`.replace(/\s+/g, '_')
    return await generateUserPDF(ouvrier, month, year, fileName)

  } catch (error: any) {
    console.error('User Export Error:', error)
    return NextResponse.json({ error: error.message || 'Erreur interne' }, { status: 500 })
  }
}

async function generateUserPDF(ouvrier: any, month: number, year: number, fileName: string) {
  const doc = new jsPDF()
  
  // Couleurs du design system
  const primaryColor: [number, number, number] = [41, 128, 185] // Bleu Pro
  const secondaryColor: [number, number, number] = [52, 73, 94] // Gris Foncé
  const successColor: [number, number, number] = [39, 174, 96]  // Vert (Travail)
  const warningColor: [number, number, number] = [230, 126, 34] // Orange (Maladie/Congé)

  const monthName = new Date(year, month - 1).toLocaleDateString('fr-BE', { month: 'long' })

  // --- HEADER ---
  doc.setFillColor(...primaryColor)
  doc.rect(0, 0, 210, 40, 'F')
  
  doc.setTextColor(255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text('RELEVÉ D\'ACTIVITÉ MENSUEL', 14, 20)
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`${monthName.toUpperCase()} ${year}`, 14, 30)

  // --- INFOS OUVRIER ---
  doc.setTextColor(...secondaryColor)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('INFORMATIONS COLLABORATEUR', 14, 55)
  
  doc.setDrawColor(...primaryColor)
  doc.setLineWidth(0.8)
  doc.line(14, 57, 45, 57)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('NOM :', 14, 67)
  doc.setFont('helvetica', 'normal')
  doc.text(ouvrier.nom.toUpperCase(), 45, 67)

  doc.setFont('helvetica', 'bold')
  doc.text('EMAIL :', 14, 73)
  doc.setFont('helvetica', 'normal')
  doc.text(ouvrier.email, 45, 73)

  doc.setFont('helvetica', 'bold')
  doc.text('RÔLE :', 14, 79)
  doc.setFont('helvetica', 'normal')
  doc.text(ouvrier.role === 'CHEF_CHANTIER' ? 'Chef de Chantier' : 'Ouvrier', 45, 79)

  // --- RÉCAPITULATIF PAR TYPE ---
  const totals = {
    TRAVAIL: 0,
    MALADIE: 0,
    CONGE_PAYE: 0,
    CONGE_SANS_SOLDE: 0,
    INTEMPERIE: 0
  }

  ouvrier.pointages.forEach((p: any) => {
    totals[p.type as keyof typeof totals] += p.duree
  })

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('SYNTHÈSE DU MOIS', 14, 95)
  doc.line(14, 97, 45, 97)

  const recapData = [
    ['Heures de Travail', `${totals.TRAVAIL.toFixed(2).replace('.', ',')} h`],
    ['Absences Maladie', `${totals.MALADIE.toFixed(2).replace('.', ',')} h`],
    ['Congés Payés', `${totals.CONGE_PAYE.toFixed(2).replace('.', ',')} h`],
    ['Intempéries', `${totals.INTEMPERIE.toFixed(2).replace('.', ',')} h`],
  ]

  autoTable(doc, {
    startY: 102,
    body: recapData,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 }, 1: { halign: 'right' } }
  })

  // --- DÉTAILS JOURNALIERS ---
  const currentY = (doc as any).lastAutoTable.finalY + 15
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('DÉTAIL DES PRESTATIONS', 14, currentY)
  doc.line(14, currentY + 2, 45, currentY + 2)

  const rows = ouvrier.pointages.map((p: any) => {
    const typeLabels: Record<string, string> = {
      TRAVAIL: 'Travail',
      MALADIE: 'Maladie',
      CONGE_PAYE: 'Congé Payé',
      CONGE_SANS_SOLDE: 'Congé sans solde',
      INTEMPERIE: 'Intempérie'
    }
    return [
      new Date(p.date).toLocaleDateString('fr-BE'),
      p.chantier?.titre || `Absence : ${typeLabels[p.type] || 'Générale'}`,
      p.type.replace('_', ' '),
      `${p.duree.toFixed(2).replace('.', ',')} h`,
      p.commentaire || '-'
    ]
  })

  autoTable(doc, {
    startY: currentY + 7,
    head: [['DATE', 'CHANTIER', 'TYPE', 'DURÉE', 'OBSERVATIONS']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: secondaryColor, fontSize: 9 },
    styles: { fontSize: 8 },
    columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } }
  })

  // --- TOTAL GÉNÉRAL ---
  const totalGeneral = Object.values(totals).reduce((a, b) => a + b, 0)
  const finalY = (doc as any).lastAutoTable.finalY + 10
  
  doc.setFillColor(245, 247, 249)
  doc.rect(14, finalY, 182, 10, 'F')
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...primaryColor)
  doc.text(`TOTAL TOUTES CATÉGORIES CONFONDUES : ${totalGeneral.toFixed(2).replace('.', ',')} HEURES`, 105, finalY + 6.5, { align: 'center' })

  // --- FOOTER ---
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(`Page ${i} sur ${pageCount} - Suivi Chantier App`, 105, 290, { align: 'center' })
  }

  const pdfOutput = doc.output('arraybuffer')
  return new NextResponse(pdfOutput, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}.pdf"`
    }
  })
}
