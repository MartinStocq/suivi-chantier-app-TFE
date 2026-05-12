'use client'
import { Menu } from 'lucide-react'
import { useLayout } from './LayoutContext'

export default function MenuToggle() {
  const { toggleSidebar } = useLayout()

  return (
    <button 
      onClick={toggleSidebar}
      className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-900 transition-colors"
      aria-label="Ouvrir le menu"
    >
      <Menu size={20} />
    </button>
  )
}
