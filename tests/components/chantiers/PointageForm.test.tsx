import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import PointageForm from '@/components/chantiers/PointageForm'
import { addPointageAction } from '@/app/actions/pointage'

// Mock the action
vi.mock('@/app/actions/pointage', () => ({
  addPointageAction: vi.fn(),
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
  })

  it('renders the form correctly', () => {
    render(<PointageForm chantiers={mockChantiers} />)
    
    expect(screen.getByText('Pointer mes heures')).toBeInTheDocument()
    expect(screen.getByLabelText(/Chantier/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Début/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Fin/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Commentaire/i)).toBeInTheDocument()
  })

  it('shows error message if required fields are missing', async () => {
    const { container } = render(<PointageForm chantiers={mockChantiers} />)
    
    const form = container.querySelector('form')
    fireEvent.submit(form!)
    
    expect(await screen.findByText(/Veuillez remplir tous les champs obligatoires/i)).toBeInTheDocument()
    expect(addPointageAction).not.toHaveBeenCalled()
  })

  it('submits the form with correct data', async () => {
    render(<PointageForm chantiers={mockChantiers} />)
    
    // Select chantier
    fireEvent.change(screen.getByLabelText(/Chantier/i), { target: { value: 'chantier-1' } })
    
    // Fill other fields
    fireEvent.change(screen.getByLabelText(/Date/i), { target: { value: '2023-05-20' } })
    fireEvent.change(screen.getByLabelText(/Début/i), { target: { value: '08:00' } })
    fireEvent.change(screen.getByLabelText(/Fin/i), { target: { value: '12:00' } })
    fireEvent.change(screen.getByLabelText(/Commentaire/i), { target: { value: 'Test comment' } })
    
    const submitButton = screen.getByRole('button', { name: /Enregistrer mes heures/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(addPointageAction).toHaveBeenCalledWith({
        chantierId: 'chantier-1',
        date: '2023-05-20',
        debut: '08:00',
        fin: '12:00',
        commentaire: 'Test comment',
      })
    })

    expect(await screen.findByText(/Heures enregistrées avec succès/i)).toBeInTheDocument()
  })

  it('handles submission error', async () => {
    vi.mocked(addPointageAction).mockRejectedValueOnce(new Error('Erreur API'))
    
    render(<PointageForm chantiers={mockChantiers} />)
    
    fireEvent.change(screen.getByLabelText(/Chantier/i), { target: { value: 'chantier-1' } })
    fireEvent.change(screen.getByLabelText(/Date/i), { target: { value: '2023-05-20' } })
    fireEvent.change(screen.getByLabelText(/Début/i), { target: { value: '08:00' } })
    fireEvent.change(screen.getByLabelText(/Fin/i), { target: { value: '12:00' } })
    
    const submitButton = screen.getByRole('button', { name: /Enregistrer mes heures/i })
    fireEvent.click(submitButton)
    
    expect(await screen.findByText(/Erreur API/i)).toBeInTheDocument()
  })
})
