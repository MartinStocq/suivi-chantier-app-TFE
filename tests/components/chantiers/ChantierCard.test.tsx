import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ChantierCard from '@/components/chantiers/ChantierCard'
import { StatutChantier } from '@prisma/client'

// Mock next/link as it can be problematic in some test environments
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

const mockChantier = {
  id: '1',
  titre: 'Chantier Test',
  statut: StatutChantier.EN_COURS,
  dateDebutPrevue: new Date('2024-01-01'),
  dateFinPrevue: null,
  client: { nom: 'Client Test' },
  adresse: { rue: 'Rue du Test', numero: '10', ville: 'TestVille' },
  _count: { affectations: 5, photos: 10 },
}

describe('ChantierCard', () => {
  it('displays chantier information correctly', () => {
    render(<ChantierCard chantier={mockChantier} />)

    expect(screen.getByText('Chantier Test')).toBeInTheDocument()
    expect(screen.getByText('Client Test')).toBeInTheDocument()
    expect(screen.getByText('En cours')).toBeInTheDocument()
    expect(screen.getByText(/Rue du Test 10, TestVille/)).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument() // affectations
    expect(screen.getByText('10')).toBeInTheDocument() // photos
    
    // Check link
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/chantiers/1')
  })
})
