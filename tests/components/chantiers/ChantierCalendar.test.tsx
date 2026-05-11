import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ChantierCalendar from '@/components/chantiers/ChantierCalendar'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}))

const mockChantiers = [
  {
    id: '1',
    titre: 'Chantier Test 1',
    statut: 'EN_COURS',
    dateDebutPrevue: new Date().toISOString(),
    dateFinPrevue: new Date().toISOString(),
    client: { nom: 'Client A' },
  },
  {
    id: '2',
    titre: 'Chantier Test 2',
    statut: 'EN_ATTENTE',
    dateDebutPrevue: new Date().toISOString(),
    dateFinPrevue: null,
    client: { nom: 'Client B' },
  }
]

describe('ChantierCalendar', () => {
  it('renders the calendar with month and year', () => {
    render(<ChantierCalendar chantiers={[]} />)
    const today = new Date()
    const monthLabel = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
    ][today.getMonth()]
    
    expect(screen.getByText(new RegExp(`${monthLabel} ${today.getFullYear()}`, 'i'))).toBeInTheDocument()
  })

  it('renders chantier badges in the grid', () => {
    render(<ChantierCalendar chantiers={mockChantiers} />)
    expect(screen.getAllByText('Chantier Test 1').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Chantier Test 2').length).toBeGreaterThan(0)
  })

  it('shows "Nouveau" button only for chefs', () => {
    const { rerender } = render(<ChantierCalendar chantiers={[]} isChef={false} />)
    expect(screen.queryByText(/Nouveau/i)).not.toBeInTheDocument()

    rerender(<ChantierCalendar chantiers={[]} isChef={true} />)
    expect(screen.getByText(/Nouveau/i)).toBeInTheDocument()
  })

  it('navigates to next and previous month', () => {
    const { container } = render(<ChantierCalendar chantiers={[]} />)
    const today = new Date()
    const currentMonth = today.getMonth()
    
    // The buttons are in the first flex div of the header
    const navButtons = container.querySelectorAll('button')
    const prevButton = navButtons[0]
    const nextButton = navButtons[1]
    
    fireEvent.click(nextButton)
    
    const nextMonthIndex = (currentMonth + 1) % 12
    const nextMonthLabel = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
    ][nextMonthIndex]
    
    expect(screen.getByText(new RegExp(nextMonthLabel, 'i'))).toBeInTheDocument()

    fireEvent.click(prevButton)
    const monthLabel = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
    ][currentMonth]
    expect(screen.getByText(new RegExp(monthLabel, 'i'))).toBeInTheDocument()
  })
})
