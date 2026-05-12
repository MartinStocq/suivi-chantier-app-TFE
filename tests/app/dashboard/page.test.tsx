import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Dashboard from '@/app/dashboard/page'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Mock des fonctions de lib
vi.mock('@/lib/chantiers', () => ({
  autoUpdateChantierStatuts: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/meteo', () => ({
  autoUpdateMeteo: vi.fn().mockResolvedValue(undefined),
}))

// Mock des composants pour simplifier
vi.mock('@/components/layout/AppLayout', () => ({
  default: ({ children }: any) => <div data-testid="app-layout">{children}</div>,
}))
vi.mock('@/components/layout/TopBar', () => ({
  default: ({ title, subtitle }: any) => <div><h1>{title}</h1><h2>{subtitle}</h2></div>,
}))
vi.mock('@/components/chantiers/PointageForm', () => ({
  default: () => <div data-testid="pointage-form">Pointage Form</div>,
}))
vi.mock('@/components/ApprouverButton', () => ({
  default: () => <button>Approuver</button>,
}))
vi.mock('@/components/SearchBar', () => ({
  default: () => <input placeholder="Search" />,
}))
vi.mock('@/components/ui/Avatar', () => ({
  default: () => <div>Avatar</div>,
}))

describe('Dashboard Page', () => {
  const mockStats = [
    { statut: 'EN_COURS', _count: 2 },
    { statut: 'TERMINE', _count: 1 },
  ]

  const mockChantiers = [
    {
      id: '1',
      titre: 'Chantier A',
      statut: 'EN_COURS',
      client: { nom: 'Client X' },
      adresse: { ville: 'Bruxelles' },
      createdAt: new Date(),
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Ensure methods exist before mocking if they are not in setup.ts
    if (!prisma.chantier.groupBy) prisma.chantier.groupBy = vi.fn() as any
    if (!prisma.utilisateur.findMany) prisma.utilisateur.findMany = vi.fn() as any
    if (!prisma.pointage.findMany) prisma.pointage.findMany = vi.fn() as any
    if (!prisma.pointage.aggregate) prisma.pointage.aggregate = vi.fn() as any

    vi.mocked(prisma.chantier.groupBy).mockResolvedValue(mockStats as any)
    vi.mocked(prisma.chantier.findMany).mockResolvedValue(mockChantiers as any)
    vi.mocked(prisma.utilisateur.findMany).mockResolvedValue([])
    vi.mocked(prisma.pointage.findMany).mockResolvedValue([])
    vi.mocked(prisma.pointage.aggregate).mockResolvedValue({ _sum: { duree: 0 } } as any)
  })

  it('renders correctly for CHEF_CHANTIER', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'chef-1',
      nom: 'Jean Chef',
      role: 'CHEF_CHANTIER',
    } as any)

    const jsx = await Dashboard({ searchParams: Promise.resolve({}) })
    render(jsx)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText(/Bienvenue, Jean Chef/i)).toBeInTheDocument()
    expect(screen.getByText('Chantier A')).toBeInTheDocument()
    expect(screen.getByText(/Nouveau chantier/i)).toBeInTheDocument()
    expect(screen.getByTestId('pointage-form')).toBeInTheDocument()
  })

  it('renders correctly for OUVRIER', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'ouvrier-1',
      nom: 'Pierre Ouvrier',
      role: 'OUVRIER',
    } as any)

    const jsx = await Dashboard({ searchParams: Promise.resolve({}) })
    render(jsx)

    expect(screen.getByText(/Bienvenue, Pierre Ouvrier/i)).toBeInTheDocument()
    expect(screen.getByTestId('pointage-form')).toBeInTheDocument()
    expect(screen.queryByText(/Nouveau chantier/i)).not.toBeInTheDocument()
  })
})
