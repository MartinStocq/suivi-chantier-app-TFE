import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import ChantierStats from '@/components/chantiers/ChantierStats'

describe('ChantierStats', () => {
  it('renders all stat categories with correct values', () => {
    const props = {
      total: 10,
      enCours: 4,
      enAttente: 3,
      termine: 2,
      suspendu: 1
    }
    
    render(<ChantierStats {...props} />)
    
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText(/Total/i)).toBeInTheDocument()
    
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText(/En cours/i)).toBeInTheDocument()
    
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText(/En attente/i)).toBeInTheDocument()
    
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText(/Terminés/i)).toBeInTheDocument()
    
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText(/Suspendus/i)).toBeInTheDocument()
  })
})
