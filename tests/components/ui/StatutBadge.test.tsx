import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import StatutBadge from '@/components/ui/StatutBadge'
import { StatutChantier } from '@prisma/client'

describe('StatutBadge', () => {
  it('renders correctly for EN_ATTENTE', () => {
    render(<StatutBadge statut={StatutChantier.EN_ATTENTE} />)
    expect(screen.getByText('En attente')).toBeInTheDocument()
  })

  it('renders correctly for EN_COURS', () => {
    render(<StatutBadge statut={StatutChantier.EN_COURS} />)
    expect(screen.getByText('En cours')).toBeInTheDocument()
  })

  it('renders correctly for TERMINE', () => {
    render(<StatutBadge statut={StatutChantier.TERMINE} />)
    expect(screen.getByText('Terminé')).toBeInTheDocument()
  })

  it('renders correctly for SUSPENDU', () => {
    render(<StatutBadge statut={StatutChantier.SUSPENDU} />)
    expect(screen.getByText('Suspendu')).toBeInTheDocument()
  })
})
