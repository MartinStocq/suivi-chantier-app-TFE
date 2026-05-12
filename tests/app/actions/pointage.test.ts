import { describe, it, expect, vi, beforeEach } from 'vitest'
import { addPointageAction } from '@/app/actions/pointage'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    affectationChantier: {
      findFirst: vi.fn(),
    },
    pointage: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    actionJournal: {
      create: vi.fn(() => Promise.resolve({})),
    },
  },
}))

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('addPointageAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws error if user is not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null)
    
    await expect(addPointageAction({
      chantierId: 'c1',
      date: '2023-05-20',
      debut: '08:00',
      fin: '12:00'
    })).rejects.toThrow('Non authentifié')
  })

  it('throws error for invalid date', async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce({ id: 'u1', role: 'ADMIN' } as any)
    
    await expect(addPointageAction({
      chantierId: 'c1',
      date: 'invalid-date',
      debut: '08:00',
      fin: '12:00'
    })).rejects.toThrow('Date invalide')
  })

  it('throws error if end time is before start time', async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce({ id: 'u1', role: 'ADMIN' } as any)
    
    await expect(addPointageAction({
      chantierId: 'c1',
      date: '2023-05-20',
      debut: '12:00',
      fin: '08:00'
    })).rejects.toThrow("L'heure de fin doit être après l'heure de début")
  })

  it('calculates duration correctly and creates pointage', async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce({ id: 'u1', role: 'ADMIN' } as any)
    vi.mocked(prisma.pointage.findFirst).mockResolvedValueOnce(null)
    vi.mocked(prisma.pointage.create).mockResolvedValueOnce({
      id: 'p1',
      duree: 2.5,
      chantier: { titre: 'Chantier Test' },
      utilisateur: { nom: 'Admin' }
    } as any)

    await addPointageAction({
      chantierId: 'c1',
      date: '2023-05-20',
      debut: '08:00',
      fin: '10:30',
      commentaire: 'Travail'
    })

    expect(prisma.pointage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        duree: 2.5,
        commentaire: 'Travail'
      }),
      include: {
        chantier: { select: { titre: true } },
        utilisateur: { select: { nom: true } }
      }
    })

    expect(prisma.actionJournal.create).toHaveBeenCalled()
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard')
  })

  it('checks affectation for workers', async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce({ id: 'u1', role: 'OUVRIER' } as any)
    vi.mocked(prisma.affectationChantier.findFirst).mockResolvedValueOnce(null)

    await expect(addPointageAction({
      chantierId: 'c1',
      date: '2023-05-20',
      debut: '08:00',
      fin: '12:00'
    })).rejects.toThrow("L'utilisateur n'est pas affecté à ce chantier")

    expect(prisma.affectationChantier.findFirst).toHaveBeenCalledWith({
      where: { chantierId: 'c1', userId: 'u1' }
    })
  })
})
