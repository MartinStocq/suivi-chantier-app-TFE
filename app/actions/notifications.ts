'use server'

import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function getNotifications() {
  const user = await getCurrentUser()
  if (!user) return []

  return prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 20
  })
}

export async function getUnreadCount() {
  const user = await getCurrentUser()
  if (!user) return 0

  return prisma.notification.count({
    where: { 
      userId: user.id,
      lu: false
    }
  })
}

export async function markAsRead(id: string) {
  const user = await getCurrentUser()
  if (!user) return { error: 'Non authentifié' }

  await prisma.notification.update({
    where: { id, userId: user.id },
    data: { lu: true }
  })

  revalidatePath('/')
  return { success: true }
}

export async function markAllAsRead() {
  const user = await getCurrentUser()
  if (!user) return { error: 'Non authentifié' }

  await prisma.notification.updateMany({
    where: { userId: user.id, lu: false },
    data: { lu: true }
  })

  revalidatePath('/')
  return { success: true }
}
