import { vi, describe, it, expect, beforeEach } from 'vitest'
import { GET, PUT, DELETE } from '@/app/api/chantiers/[id]/route'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

vi.mock('@/lib/meteo', () => ({
  getCoordinates: vi.fn().mockResolvedValue({ latitude: 50.45, longitude: 3.95 }),
}))

vi.mock('@/lib/notifications', () => ({
  notifyProjectMembers: vi.fn().mockResolvedValue({}),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        remove: vi.fn().mockResolvedValue({ error: null }),
      })),
    },
  })),
}))

describe('API Chantiers [id]', () => {
  const params = Promise.resolve({ id: 'chantier-1' })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    it('should return 404 if chantier not found', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u1' } as any)
      vi.mocked(prisma.chantier.findUnique).mockResolvedValue(null)

      const response = await GET(new Request('http://l'), { params })
      expect(response.status).toBe(404)
    })

    it('should return chantier data if found', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u1' } as any)
      vi.mocked(prisma.chantier.findUnique).mockResolvedValue({ id: 'chantier-1', titre: 'Test' } as any)

      const response = await GET(new Request('http://l'), { params })
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.id).toBe('chantier-1')
    })
  })

  describe('PUT', () => {
    it('should update chantier if data is valid', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u1', role: 'CHEF_CHANTIER' } as any)
      vi.mocked(prisma.chantier.findUnique).mockResolvedValue({ id: 'chantier-1', statut: 'A_VENIR', titre: 'Old' } as any)
      
      const body = {
        titre: 'Updated Titre',
        dateDebutPrevue: new Date().toISOString(),
        client: { nom: 'Client B' },
        adresse: { rue: 'Rue X', numero: '1', codePostal: '1000', ville: 'Bxl' }
      }
      const req = new Request('http://l', { method: 'PUT', body: JSON.stringify(body) })

      vi.mocked(prisma.chantier.update).mockResolvedValue({ id: 'chantier-1', ...body } as any)

      const response = await PUT(req as any, { params })
      expect(response.status).toBe(200)
      expect(prisma.chantier.update).toHaveBeenCalled()
    })
  })

  describe('DELETE', () => {
    it('should delete chantier and cleanup storage', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u1', role: 'CHEF_CHANTIER' } as any)
      vi.mocked(prisma.photo.findMany).mockResolvedValue([{ storagePath: 'p1.jpg' }] as any)

      const response = await DELETE(new Request('http://l', { method: 'DELETE' }), { params })
      expect(response.status).toBe(200)
      expect(prisma.chantier.delete).toHaveBeenCalledWith({ where: { id: 'chantier-1' } })
    })
  })
})
