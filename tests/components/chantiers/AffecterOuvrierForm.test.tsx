import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { expect, test, vi, describe, beforeEach } from 'vitest'
import AffecterOuvrierForm from '@/components/chantiers/AffecterOuvrierForm'

// Mock next/navigation
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}))

const mockOuvriers = [
  { id: '1', nom: 'Ouvrier 1', email: 'o1@test.com', avatarPath: null },
  { id: '2', nom: 'Ouvrier 2', email: 'o2@test.com', avatarPath: null },
]

const mockAffectations = [
  { userId: '1', user: mockOuvriers[0] }
]

describe('AffecterOuvrierForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  test('renders affected and available workers', () => {
    render(
      <AffecterOuvrierForm 
        chantierId="c1" 
        tousOuvriers={mockOuvriers} 
        affectations={mockAffectations} 
      />
    )
    
    expect(screen.getByText('Ouvrier 1')).toBeDefined()
    expect(screen.getByText('Ouvrier 2')).toBeDefined()
    expect(screen.getByText('Retirer')).toBeDefined()
    expect(screen.getByText('Affecter')).toBeDefined()
  })

  test('calls API to affect a worker', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({ ok: true })
    
    render(
      <AffecterOuvrierForm 
        chantierId="c1" 
        tousOuvriers={mockOuvriers} 
        affectations={[]} 
      />
    )
    
    const affecterButtons = screen.getAllByText('Affecter')
    fireEvent.click(affecterButtons[0]) // Affecter Ouvrier 1
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/chantiers/c1/affectations',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ userId: '1' })
        })
      )
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  test('calls API to remove a worker', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({ ok: true })
    
    render(
      <AffecterOuvrierForm 
        chantierId="c1" 
        tousOuvriers={mockOuvriers} 
        affectations={mockAffectations} 
      />
    )
    
    const retirerButton = screen.getByText('Retirer')
    fireEvent.click(retirerButton)
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/chantiers/c1/affectations',
        expect.objectContaining({
          method: 'DELETE',
          body: JSON.stringify({ userId: '1' })
        })
      )
      expect(mockRefresh).toHaveBeenCalled()
    })
  })
})
