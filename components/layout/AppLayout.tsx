import { getCurrentUser } from '@/lib/auth'
import Sidebar from './Sidebar'
import { LayoutProvider } from './LayoutContext'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  return (
    <LayoutProvider>
      <div className="flex min-h-screen bg-gray-50 overflow-x-hidden">
        <Sidebar role={user?.role ?? 'OUVRIER'} />
        <div className="flex-1 flex flex-col min-h-screen lg:ml-60 w-full max-w-full">
          {children}
        </div>
      </div>
    </LayoutProvider>
  )
}
  