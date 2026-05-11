import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import Avatar from '@/components/ui/Avatar'

describe('Avatar', () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  })

  it('renders initials when no avatarPath is provided', () => {
    render(<Avatar nom="John Doe" />)
    expect(screen.getByText('J')).toBeInTheDocument()
  })

  it('renders image when avatarPath is provided', () => {
    const avatarPath = 'avatar.png'
    render(<Avatar nom="John Doe" avatarPath={avatarPath} />)
    
    const img = screen.getByRole('img')
    expect(img).toBeInTheDocument()
    // The URL depends on process.env.NEXT_PUBLIC_SUPABASE_URL which might be set at module load time
    expect(img.getAttribute('src')).toContain(`/storage/v1/object/public/photos/${avatarPath}`)
    expect(img).toHaveAttribute('alt', 'John Doe')
  })

  it('applies custom size', () => {
    const { container } = render(<Avatar nom="John Doe" size={48} />)
    const div = container.firstChild as HTMLElement
    expect(div).toHaveStyle({ width: '48px', height: '48px' })
  })
})
