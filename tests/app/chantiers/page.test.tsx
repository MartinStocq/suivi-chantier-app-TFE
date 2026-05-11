import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ChantiersPage from '@/app/chantiers/page'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getForecast, getWeatherData } from '@/lib/meteo'

// Mock des fonctions de lib
vi.mock('@/lib/chantiers', () => ({
  autoUpdateChantierStatuts: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/meteo', () => ({
  autoUpdateMeteo: vi.fn().mockResolvedValue(undefined),
  getForecast: vi.fn(),
  getWeatherData: vi.fn(),
}))

// Mock des composants
vi.mock('@/components/layout/AppLayout', () => ({
  default: ({ children }: any) => <div data-testid="app-layout">{children}</div>,
}))
vi.mock('@/components/layout/TopBar', () => ({
  default: ({ title, subtitle }: any) => (
    <div>
      <h1>{title}</h1>
      <h2>{subtitle}</h2>
    </div>
  ),
}))
vi.mock('@/components/chantiers/ChantierCalendar', () => ({
  default: ({ chantiers }: any) => (
    <div data-testid="chantier-calendar">
      Calendar with {chantiers.length} chantiers
    </div>
  ),
}))

describe('Chantiers Page', () => {
  const mockChantiers = [
    {
      id: '1',
      titre: 'Chantier en cours',
      statut: 'EN_COURS',
      dateDebutPrevue: new Date('2024-01-01'),
      dateFinPrevue: new Date('2024-12-31'),
      client: { nom: 'Client A' },
      adresse: {
        ville: 'Namur',
        latitude: 50.467,
        longitude: 4.867,
      },
      createdAt: new Date(),
      _count: { affectations: 2, photos: 5 },
    },
    {
      id: '2',
      titre: 'Chantier futur',
      statut: 'PLANIFIE',
      dateDebutPrevue: new Date('2025-01-01'),
      dateFinPrevue: new Date('2025-06-30'),
      client: { nom: 'Client B' },
      adresse: {
        ville: 'Bruxelles',
        latitude: 50.850,
        longitude: 4.350,
      },
      createdAt: new Date(),
      _count: { affectations: 0, photos: 0 },
    },
  ]

  const mockForecast = [
    { date: '2024-01-01', weatherCode: 0, tempMax: 20, tempMin: 10 },
  ]

  const mockCurrentWeather = {
    temperature: 15,
    weatherCode: 1,
    time: new Date().toISOString(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.chantier.findMany).mockResolvedValue(mockChantiers as any)
    vi.mocked(getForecast).mockResolvedValue(mockForecast)
    vi.mocked(getWeatherData).mockResolvedValue(mockCurrentWeather)
  })

  it('renders correctly for CHEF_CHANTIER', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'chef-1',
      nom: 'Jean Chef',
      role: 'CHEF_CHANTIER',
    } as any)

    const jsx = await ChantiersPage()
    render(jsx)

    expect(screen.getByText('Chantiers')).toBeInTheDocument()
    expect(screen.getByText('2 chantiers')).toBeInTheDocument()
    
    // Check if "Chantier en cours" is rendered in the "En cours" section
    expect(screen.getByText('Chantier en cours')).toBeInTheDocument()
    expect(screen.getByText('Client A')).toBeInTheDocument()
    expect(screen.getAllByText(/En cours/i)[0]).toBeInTheDocument()
    
    // Check weather info
    expect(screen.getByText('15°')).toBeInTheDocument()
    expect(getWeatherData).toHaveBeenCalledTimes(1) // Only for "Chantier en cours"
    expect(getForecast).toHaveBeenCalledTimes(2) // For both chantiers
    
    // Check if calendar is rendered
    expect(screen.getByTestId('chantier-calendar')).toBeInTheDocument()
    expect(screen.getByText('Calendar with 2 chantiers')).toBeInTheDocument()
  })

  it('redirects to login if no user', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null)
    
    const { redirect } = await import('next/navigation')
    
    try {
      await ChantiersPage()
    } catch (e) {
      // Next.js redirect throws an error in some environments, 
      // but here we just want to see if it was called.
    }
    
    expect(redirect).toHaveBeenCalledWith('/login')
  })
})
