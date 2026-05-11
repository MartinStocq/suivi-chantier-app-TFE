import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { expect, test, vi, describe, beforeEach } from 'vitest'
import NotificationBell from '@/components/layout/NotificationBell'
import * as actions from '@/app/actions/notifications'

// Mock dependencies
vi.mock('@/app/actions/notifications', () => ({
  getNotifications: vi.fn(),
  getUnreadCount: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

const mockNotifications = [
  {
    id: '1',
    titre: 'Nouveau chantier',
    message: 'Vous avez été affecté au chantier Test',
    lu: false,
    createdAt: new Date(),
    lien: '/chantiers/1'
  }
]

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(actions.getNotifications as any).mockResolvedValue(mockNotifications)
    ;(actions.getUnreadCount as any).mockResolvedValue(1)
  })

  test('renders bell icon and unread count', async () => {
    await act(async () => {
      render(<NotificationBell />)
    })
    
    expect(screen.getByRole('button')).toBeDefined()
    expect(screen.getByText('1')).toBeDefined()
  })

  test('opens dropdown and displays notifications', async () => {
    await act(async () => {
      render(<NotificationBell />)
    })
    
    const bellButton = screen.getByRole('button')
    fireEvent.click(bellButton)
    
    expect(screen.getByText('Notifications')).toBeDefined()
    expect(screen.getByText('Nouveau chantier')).toBeDefined()
    expect(screen.getByText('Vous avez été affecté au chantier Test')).toBeDefined()
  })

  test('marks as read when clicking a notification', async () => {
    ;(actions.markAsRead as any).mockResolvedValue({ success: true })
    
    await act(async () => {
      render(<NotificationBell />)
    })
    
    fireEvent.click(screen.getByRole('button'))
    
    const notification = screen.getByText('Nouveau chantier')
    fireEvent.click(notification)
    
    expect(actions.markAsRead).toHaveBeenCalledWith('1')
  })

  test('marks all as read', async () => {
    ;(actions.markAllAsRead as any).mockResolvedValue({ success: true })
    
    await act(async () => {
      render(<NotificationBell />)
    })
    
    fireEvent.click(screen.getByRole('button'))
    
    const markAllButton = screen.getByText('Tout marquer comme lu')
    fireEvent.click(markAllButton)
    
    expect(actions.markAllAsRead).toHaveBeenCalled()
  })
})
