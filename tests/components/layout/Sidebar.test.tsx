import { render, screen } from '@testing-library/react'
import { expect, test, vi, describe } from 'vitest'
import Sidebar from '@/components/layout/Sidebar'
import { usePathname } from 'next/navigation'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/dashboard'),
}))

describe('Sidebar', () => {
  test('renders all links for CHEF_CHANTIER', () => {
    vi.mocked(usePathname).mockReturnValue('/dashboard')
    render(<Sidebar role="CHEF_CHANTIER" />)
    
    expect(screen.getByText('Dashboard')).toBeDefined()
    expect(screen.getByText('Chantiers')).toBeDefined()
    expect(screen.getByText('Nouveau')).toBeDefined()
    expect(screen.getByText('Journal')).toBeDefined()
    expect(screen.getByText('Équipe')).toBeDefined()
    expect(screen.getByText('Paramètres')).toBeDefined()
  })

  test('hides Nouveau and Journal for OUVRIER', () => {
    vi.mocked(usePathname).mockReturnValue('/dashboard')
    render(<Sidebar role="OUVRIER" />)
    
    expect(screen.getByText('Dashboard')).toBeDefined()
    expect(screen.getByText('Chantiers')).toBeDefined()
    expect(screen.queryByText('Nouveau')).toBeNull()
    expect(screen.queryByText('Journal')).toBeNull()
    expect(screen.getByText('Équipe')).toBeDefined()
    expect(screen.getByText('Paramètres')).toBeDefined()
  })

  test('highlights active link', () => {
    vi.mocked(usePathname).mockReturnValue('/chantiers')
    
    render(<Sidebar role="CHEF_CHANTIER" />)
    
    const chantiersLink = screen.getByText('Chantiers').closest('a')
    expect(chantiersLink?.className).toContain('bg-gray-100')
    expect(chantiersLink?.className).toContain('text-gray-900')
    
    const dashboardLink = screen.getByText('Dashboard').closest('a')
    expect(dashboardLink?.className).not.toContain('bg-gray-100')
  })
})
