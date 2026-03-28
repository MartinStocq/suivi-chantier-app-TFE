import { getCurrentUser } from '@/lib/auth'
import Sidebar from './Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role={user?.role ?? 'OUVRIER'} />
      <div className="flex-1 ml-60 flex flex-col min-h-screen">
        {children}
      </div>
    </div>
  )
}
  