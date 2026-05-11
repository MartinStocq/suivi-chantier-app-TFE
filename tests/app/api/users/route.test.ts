import { vi, describe, it, expect, beforeEach } from 'vitest'
import { GET, POST } from '@/app/api/users/route'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

describe('API Users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    it('should return 403 if user is not CHEF_CHANTIER', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u1', role: 'OUVRIER' } as any)
      const response = await GET()
      expect(response.status).toBe(403)
    })

    it('should return users list for CHEF_CHANTIER', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ id: 'u1', role: 'CHEF_CHANTIER' } as any)
      vi.mocked(prisma.utilisateur.findMany).mockResolvedValue([{ id: 'u2', nom: 'User 2' }] as any)

      const response = await GET()
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
    })
  })

  describe('POST', () => {
    it('should upsert user', async () => {
      const body = { id: 'new-u', nom: 'New User', email: 'new@test.com' }
      const req = new Request('http://l', { method: 'POST', body: JSON.stringify(body) })
      
      vi.mocked(prisma.utilisateur.upsert).mockResolvedValue({ ...body, role: 'OUVRIER' } as any)

      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBe('new-u')
      expect(prisma.utilisateur.upsert).toHaveBeenCalled()
    })

    it('should return 400 if missing data', async () => {
      const req = new Request('http://l', { method: 'POST', body: JSON.stringify({ id: '1' }) })
      const response = await POST(req as any)
      expect(response.status).toBe(400)
    })
  })
})
