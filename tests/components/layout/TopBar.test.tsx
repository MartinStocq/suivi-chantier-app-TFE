import { render, screen } from '@testing-library/react'
import { expect, test, vi, describe } from 'vitest'
import TopBar from '@/components/layout/TopBar'

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(() => Promise.resolve({
    id: '1',
    nom: 'Jean Dupont',
    role: 'CHEF_CHANTIER',
    avatarPath: null
  }))
}))

vi.mock('@/components/layout/NotificationBell', () => ({
  default: () => <div data-testid="notification-bell" />
}))

vi.mock('@/components/LogoutButton', () => ({
  default: () => <button>Logout</button>
}))

vi.mock('@/components/ui/Avatar', () => ({
  default: ({ nom }: { nom: string }) => <div data-testid="avatar" aria-label={nom} />
}))

describe('TopBar', () => {
  test('renders title and subtitle', async () => {
    // TopBar is a server component, we need to await it if it's async
    // In Vitest/JSDOM, we can often just await the result of the component call if it's a function
    const Result = await TopBar({ title: 'Mon Titre', subtitle: 'Mon Sous-titre' })
    render(Result)
    
    expect(screen.getByText('Mon Titre')).toBeDefined()
    expect(screen.getByText('Mon Sous-titre')).toBeDefined()
    expect(screen.getByText('Jean Dupont')).toBeDefined()
    expect(screen.getByText('Chef de chantier')).toBeDefined()
    expect(screen.getByTestId('notification-bell')).toBeDefined()
    expect(screen.getByTestId('avatar')).toBeDefined()
  })

  test('renders only title when subtitle is missing', async () => {
    const Result = await TopBar({ title: 'Titre Seul' })
    render(Result)
    
    expect(screen.getByText('Titre Seul')).toBeDefined()
    expect(screen.queryByText('Mon Sous-titre')).toBeNull()
  })
})
