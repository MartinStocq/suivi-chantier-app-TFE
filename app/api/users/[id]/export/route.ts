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
    const me = await getCurrentUser()
    if (!me || me.role !== 'CHEF_CHANTIER') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const { id } = await params
    const { searchParams } = new URL(req.url)
    
    // Récupérer le mois et l'année (défaut mois actuel)
    const now = new Date()
    const month = parseInt(searchParams.get('month') || (now.getMonth() + 1).toString())
    const year = parseInt(searchParams.get('year') || now.getFullYear().toString())

    const user = await prisma.utilisateur.findUnique({
      where: { id },
      include: {
        pointages: {
          where: {
            date: {
              gte: new Date(year, month - 1, 1),
              lt: new Date(year, month, 1)
            }
          },
          orderBy: { date: 'asc' },
          include: { chantier: { select: { titre: true } } }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    const fileName = `Prestations_${user.nom}_${month}_${year}`.replace(/[/\\?%*:|"<>]/g, '_')

    return await generateWorkerPDF(user, month, year, fileName)
  } catch (error: any) {
    console.error('User Export Error:', error)
    return NextResponse.json({ error: error.message || 'Erreur interne' }, { status: 500 })
  }
}

async function generateWorkerPDF(user: any, month: number, year: number, fileName: string) {
  const doc = new jsPDF()
  
  // Calculs totaux
  const totals = {
    TRAVAIL: 0,
    MALADIE: 0,
    CONGE_PAYE: 0,
    CONGE_SANS_SOLDE: 0,
    INTEMPERIE: 0
  }

  user.pointages.forEach((p: any) => {
    if (totals.hasOwnProperty(p.type)) {
      totals[p.type as keyof typeof totals] += p.duree
    }
  })

  const primaryColor: [number, number, number] = [41, 128, 185]
  const secondaryColor: [number, number, number] = [52, 73, 94]

  // Header
  doc.setFillColor(...primaryColor)
  doc.rect(0, 0, 210, 40, 'F')
  doc.setTextColor(255)
  doc.setFontSize(22)
  doc.text('RÉCAPITULATIF MENSUEL DES PRESTATIONS', 14, 20)
  doc.setFontSize(12)
  doc.text(`OUVRIER : ${user.nom.toUpperCase()} | PÉRIODE : ${month}/${year}`, 14, 30)

  // Résumé des totaux
  doc.setTextColor(...secondaryColor)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('RÉSUMÉ DES HEURES', 14, 55)
  doc.line(14, 57, 40, 57)

  const summaryRows = [
    ['Heures de Travail', `${totals.TRAVAIL.toFixed(2)} h`],
    ['Maladie', `${totals.MALADIE.toFixed(2)} h`],
    ['Congés Payés', `${totals.CONGE_PAYE.toFixed(2)} h`],
    ['Congés Sans Solde', `${totals.CONGE_SANS_SOLDE.toFixed(2)} h`],
    ['Intempéries', `${totals.INTEMPERIE.toFixed(2)} h`],
    ['TOTAL GÉNÉRAL', `${(Object.values(totals).reduce((a, b) => a + b, 0)).toFixed(2)} h`]
  ]

  autoTable(doc, {
    startY: 62,
    head: [['TYPE', 'TOTAL']],
    body: summaryRows,
    theme: 'grid',
    headStyles: { fillColor: secondaryColor },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    margin: { right: 120 } // Prendre moins de place
  })

  // Détails des pointages
  doc.setFontSize(14)
  doc.text('DÉTAIL DES JOURNÉES', 14, (doc as any).lastAutoTable.finalY + 15)
  doc.line(14, (doc as any).lastAutoTable.finalY + 17, 40, (doc as any).lastAutoTable.finalY + 17)

  const detailRows = user.pointages.map((p: any) => [
    new Date(p.date).toLocaleDateString('fr-BE'),
    p.chantier.titre,
    p.type.replace('_', ' '),
    `${p.duree.toFixed(2)} h`,
    p.commentaire || '-'
  ])

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 22,
    head: [['DATE', 'CHANTIER', 'TYPE', 'DURÉE', 'COMMENTAIRE']],
    body: detailRows,
    theme: 'striped',
    headStyles: { fillColor: primaryColor },
    styles: { fontSize: 9 },
    columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } }
  })

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-BE')} - Page ${i}/${pageCount}`, 105, 285, { align: 'center' })
  }

  const pdfOutput = doc.output('arraybuffer')
  return new NextResponse(pdfOutput, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}.pdf"`
    }
  })
}
