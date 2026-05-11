import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import LogoutButton from '@/components/LogoutButton'
import { supabase } from '@/lib/supabase'

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}))

describe('LogoutButton', () => {
  it('renders correctly', () => {
    render(<LogoutButton />)
    expect(screen.getByText('Déconnexion')).toBeInTheDocument()
  })

  it('calls signOut and redirects on click', async () => {
    render(<LogoutButton />)
    const button = screen.getByRole('button')
    
    await fireEvent.click(button)
    
    expect(supabase.auth.signOut).toHaveBeenCalled()
  })
})
