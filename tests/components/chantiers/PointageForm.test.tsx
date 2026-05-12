import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import PointageForm from '@/components/chantiers/PointageForm'
import { addPointageAction, getUserBusyDatesAction } from '@/app/actions/pointage'

// Mock the actions
vi.mock('@/app/actions/pointage', () => ({
  addPointageAction: vi.fn(),
  getUserBusyDatesAction: vi.fn(() => Promise.resolve([])),
}))

const mockChantiers = [
  {
    id: 'chantier-1',
    titre: 'Chantier Test',
    dateDebutPrevue: '2023-01-01',
    dateFinPrevue: '2023-12-31',
  },
]

describe('PointageForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getUserBusyDatesAction).mockResolvedValue([])
  })

  it('renders the form correctly', async () => {
    render(<PointageForm chantiers={mockChantiers} currentUserId="u1" />)
    
    expect(screen.getByText('Enregistrer une activité')).toBeInTheDocument()
    expect(screen.getByLabelText(/Chantier/i)).toBeInTheDocument()
    expect(screen.getByText(/Date ou période sélectionnée/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Heure début/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Heure fin/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Observations/i)).toBeInTheDocument()
  })

  it('shows error message if required fields are missing', async () => {
    const { container } = render(<PointageForm chantiers={mockChantiers} currentUserId="u1" />)
    
    await waitFor(() => expect(getUserBusyDatesAction).toHaveBeenCalled())

    // Trigger submit directly on the form to bypass browser validation
    const form = container.querySelector('form')
    fireEvent.submit(form!)
    
    expect(await screen.findByText(/Veuillez remplir tous les champs obligatoires/i)).toBeInTheDocument()
    expect(addPointageAction).not.toHaveBeenCalled()
  })

  it('submits the form with correct data', async () => {
    render(<PointageForm chantiers={mockChantiers} currentUserId="u1" />)
    
    // Wait for initial load
    await waitFor(() => expect(getUserBusyDatesAction).toHaveBeenCalled())

    // Select chantier
    fireEvent.change(screen.getByLabelText(/Chantier/i), { target: { value: 'chantier-1' } })
    
    // Fill hours
    fireEvent.change(screen.getByLabelText(/Heure début/i), { target: { value: '08:00' } })
    fireEvent.change(screen.getByLabelText(/Heure fin/i), { target: { value: '12:00' } })
    fireEvent.change(screen.getByLabelText(/Observations/i), { target: { value: 'Test comment' } })
    
    // Get today's day number
    const todayDate = new Date()
    const today = todayDate.getDate().toString()
    const todayButton = screen.getAllByRole('button').find(b => b.textContent === today)
    if (todayButton) fireEvent.click(todayButton)
    
    const submitButton = screen.getByRole('button', { name: /Valider le pointage/i })
    fireEvent.click(submitButton)
    
    // Format date as YYYY-MM-DD in local time
    const year = todayDate.getFullYear()
    const month = String(todayDate.getMonth() + 1).padStart(2, '0')
    const day = String(todayDate.getDate()).padStart(2, '0')
    const todayStr = `${year}-${month}-${day}`

    await waitFor(() => {
      expect(addPointageAction).toHaveBeenCalledWith(expect.objectContaining({
        chantierId: 'chantier-1',
        date: todayStr,
        debut: '08:00',
        fin: '12:00',
        commentaire: 'Test comment',
      }))
    })

    expect(await screen.findByText(/Enregistrement effectué avec succès/i)).toBeInTheDocument()
  })

  it('handles submission error', async () => {
    vi.mocked(addPointageAction).mockRejectedValueOnce(new Error('Erreur API'))
    
    render(<PointageForm chantiers={mockChantiers} currentUserId="u1" />)
    await waitFor(() => expect(getUserBusyDatesAction).toHaveBeenCalled())
    
    fireEvent.change(screen.getByLabelText(/Chantier/i), { target: { value: 'chantier-1' } })
    
    const submitButton = screen.getByRole('button', { name: /Valider le pointage/i })
    fireEvent.click(submitButton)
    
    expect(await screen.findByText(/Erreur API/i)).toBeInTheDocument()
  })
})
