import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ApprouverButton from '@/components/ApprouverButton'

describe('ApprouverButton', () => {
  beforeEach(() => {
    fetchMock.resetMocks()
  })

  it('renders both buttons', () => {
    render(<ApprouverButton userId="123" />)
    expect(screen.getByText('Approuver')).toBeInTheDocument()
    expect(screen.getByText('Refuser')).toBeInTheDocument()
  })

  it('calls API with approuver action when Approuver is clicked', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    } as Response)
    
    render(<ApprouverButton userId="123" />)
    
    const approveButton = screen.getByText('Approuver')
    fireEvent.click(approveButton)
    
    expect(approveButton).toBeDisabled()
    
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('/api/users/123', expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ action: 'approuver' })
      }))
    })
    fetchSpy.mockRestore()
  })

  it('calls API with refuser action when Refuser is clicked', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    } as Response)
    
    render(<ApprouverButton userId="123" />)
    
    const refuseButton = screen.getByText('Refuser')
    fireEvent.click(refuseButton)
    
    expect(refuseButton).toBeDisabled()
    
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('/api/users/123', expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ action: 'refuser' })
      }))
    })
    fetchSpy.mockRestore()
  })
})
