import { render, screen } from '@testing-library/react'
import { expect, test, vi, describe } from 'vitest'
import TopBar from '@/components/layout/TopBar'
import { LayoutProvider } from '@/components/layout/LayoutContext'

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

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/dashboard'),
}))

describe('TopBar', () => {
  test('renders title and subtitle', async () => {
    const Result = await TopBar({ title: 'Mon Titre', subtitle: 'Mon Sous-titre' })
    render(
      <LayoutProvider>
        {Result}
      </LayoutProvider>
    )
    
    expect(screen.getByText('Mon Titre')).toBeDefined()
    expect(screen.getByText('Mon Sous-titre')).toBeDefined()
    expect(screen.getByText('Jean Dupont')).toBeDefined()
    expect(screen.getByText('Chef de chantier')).toBeDefined()
    expect(screen.getByTestId('notification-bell')).toBeDefined()
    expect(screen.getByTestId('avatar')).toBeDefined()
  })

  test('renders only title when subtitle is missing', async () => {
    const Result = await TopBar({ title: 'Titre Seul' })
    render(
      <LayoutProvider>
        {Result}
      </LayoutProvider>
    )
    
    expect(screen.getByText('Titre Seul')).toBeDefined()
    expect(screen.queryByText('Mon Sous-titre')).toBeNull()
  })
})
