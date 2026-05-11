import { vi, describe, it, expect, beforeEach } from 'vitest'
import { GET, POST } from '@/app/api/chantiers/route'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { NextResponse } from 'next/server'

// Mocking the dependencies that aren't already fully mocked in setup.ts
vi.mock('@/lib/meteo', () => ({
  getCoordinates: vi.fn().mockResolvedValue({ latitude: 50.45, longitude: 3.95 }),
}))

vi.mock('@/lib/notifications', () => ({
  createInAppNotification: vi.fn().mockResolvedValue({}),
}))

describe('GET /api/chantiers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 if user is not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null)
    const response = await GET()
    expect(response.status).toBe(401)
  })

  it('should return chantiers list if authenticated', async () => {
    const mockUser = { id: 'user-1', role: 'CHEF_CHANTIER' }
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser as any)
    vi.mocked(prisma.chantier.findMany).mockResolvedValue([{ id: 'c1', titre: 'Chantier 1' }] as any)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(1)
    expect(data[0].titre).toBe('Chantier 1')
  })
})

describe('POST /api/chantiers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 403 if user is not CHEF_CHANTIER', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u1', role: 'OUVRIER' } as any)
    const req = new Request('http://localhost/api/chantiers', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const response = await POST(req as any)
    expect(response.status).toBe(403)
  })

  it('should create a new chantier with valid data', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u1', role: 'CHEF_CHANTIER' } as any)
    
    const body = {
      titre: 'Nouveau Chantier',
      dateDebutPrevue: new Date().toISOString(),
      client: { nom: 'Client A' },
      adresse: {
        rue: 'Rue de la Paix',
        numero: '10',
        codePostal: '7000',
        ville: 'Mons'
      }
    }

    const req = new Request('http://localhost/api/chantiers', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    vi.mocked(prisma.chantier.create).mockResolvedValue({ id: 'new-id', ...body } as any)

    const response = await POST(req as any)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.id).toBe('new-id')
    expect(prisma.chantier.create).toHaveBeenCalled()
  })

  it('should return 400 if title is missing', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u1', role: 'CHEF_CHANTIER' } as any)
    
    const body = {
      dateDebutPrevue: new Date().toISOString(),
      client: { nom: 'Client A' },
      adresse: { rue: 'Rue', numero: '1', codePostal: '1000', ville: 'Bxl' }
    }

    const req = new Request('http://localhost/api/chantiers', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    const response = await POST(req as any)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Le titre est requis')
  })
})
