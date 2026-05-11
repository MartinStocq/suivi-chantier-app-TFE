import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updateProfilAction, updateAvatarAction } from '@/app/actions/profil'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    utilisateur: {
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock Supabase
const mockUpload = vi.fn().mockResolvedValue({ data: {}, error: null })
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        upload: mockUpload,
      })),
    },
  })),
}))

describe('profil actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://test.com'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
  })

  describe('updateProfilAction', () => {
    it('updates user profile correctly', async () => {
      vi.mocked(getCurrentUser).mockResolvedValueOnce({ id: 'u1' } as any)
      
      await updateProfilAction({ nom: 'New Name', telephone: '0123456789' })

      expect(prisma.utilisateur.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: {
          nom: 'New Name',
          telephone: '0123456789',
        },
      })
      expect(revalidatePath).toHaveBeenCalled()
    })

    it('throws error for invalid phone', async () => {
      vi.mocked(getCurrentUser).mockResolvedValueOnce({ id: 'u1' } as any)
      
      await expect(updateProfilAction({ nom: 'Name', telephone: 'invalid' }))
        .rejects.toThrow('Format de téléphone invalide')
    })
  })

  describe('updateAvatarAction', () => {
    it('uploads avatar and updates user', async () => {
      vi.mocked(getCurrentUser).mockResolvedValueOnce({ id: 'u1' } as any)
      
      // Mock File
      const fileContent = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]) // JPEG header
      const file = new File([fileContent], 'avatar.jpg', { type: 'image/jpeg' })
      
      const formData = new FormData()
      formData.append('avatar', file)

      await updateAvatarAction(formData)

      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringContaining('avatars/u1.jpg'),
        expect.any(File),
        expect.objectContaining({ upsert: true })
      )
      
      expect(prisma.utilisateur.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { avatarPath: expect.stringContaining('avatars/u1.jpg') },
      })
    })

    it('throws error for unsupported extension', async () => {
      vi.mocked(getCurrentUser).mockResolvedValueOnce({ id: 'u1' } as any)
      
      const file = new File(['dummy content'], 'avatar.txt', { type: 'text/plain' })
      const formData = new FormData()
      formData.append('avatar', file)

      await expect(updateAvatarAction(formData)).rejects.toThrow('Extension de fichier non supportée')
    })
  })
})
