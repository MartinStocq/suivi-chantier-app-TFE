'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

interface LayoutContextType {
  isSidebarOpen: boolean
  toggleSidebar: () => void
  closeSidebar: () => void
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined)

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const pathname = usePathname()

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)
  const closeSidebar = () => setIsSidebarOpen(false)

  // Fermer la sidebar automatiquement lors d'un changement de page sur mobile
  useEffect(() => {
    closeSidebar()
  }, [pathname])

  return (
    <LayoutContext.Provider value={{ isSidebarOpen, toggleSidebar, closeSidebar }}>
      {children}
    </LayoutContext.Provider>
  )
}

export function useLayout() {
  const context = useContext(LayoutContext)
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider')
  }
  return context
}
