import { expect, test, vi, describe, beforeEach } from 'vitest'
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from '@/app/actions/notifications'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    notification: {
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('notifications actions', () => {
  const mockUser = { id: 'user1' }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(getCurrentUser as any).mockResolvedValue(mockUser)
  })

  test('getNotifications returns notifications for current user', async () => {
    const mockNotifs = [{ id: '1', titre: 'Test' }]
    ;(prisma.notification.findMany as any).mockResolvedValue(mockNotifs)

    const result = await getNotifications()

    expect(prisma.notification.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user1' }
    }))
    expect(result).toEqual(mockNotifs)
  })

  test('getUnreadCount returns count of unread notifications', async () => {
    ;(prisma.notification.count as any).mockResolvedValue(5)

    const result = await getUnreadCount()

    expect(prisma.notification.count).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user1', lu: false }
    }))
    expect(result).toBe(5)
  })

  test('markAsRead updates notification and revalidates', async () => {
    const result = await markAsRead('notif1')

    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: 'notif1', userId: 'user1' },
      data: { lu: true }
    })
    expect(revalidatePath).toHaveBeenCalledWith('/')
    expect(result).toEqual({ success: true })
  })

  test('markAllAsRead updates all unread notifications', async () => {
    const result = await markAllAsRead()

    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user1', lu: false },
      data: { lu: true }
    })
    expect(revalidatePath).toHaveBeenCalledWith('/')
    expect(result).toEqual({ success: true })
  })

  test('actions return early if no user', async () => {
    ;(getCurrentUser as any).mockResolvedValue(null)

    expect(await getNotifications()).toEqual([])
    expect(await getUnreadCount()).toBe(0)
    expect(await markAsRead('1')).toEqual({ error: 'Non authentifié' })
    expect(await markAllAsRead()).toEqual({ error: 'Non authentifié' })
  })
})
