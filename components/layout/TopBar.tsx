import { getCurrentUser } from '@/lib/auth'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'
import Avatar from '@/components/ui/Avatar'
import NotificationBell from './NotificationBell'
import MenuToggle from './MenuToggle'

interface Props {
  title: string
  subtitle?: string
}

export default async function TopBar({ title, subtitle }: Props) {
  const user = await getCurrentUser()

  return (
    <header className="h-14 border-b border-gray-100 bg-white flex items-center justify-between px-4 md:px-8 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <MenuToggle />
        <div>
          <h1 className="text-sm font-semibold text-gray-900 truncate max-w-[150px] md:max-w-none">{title}</h1>
          {subtitle && <p className="text-[10px] md:text-xs text-gray-400 mt-0.5 truncate max-w-[150px] md:max-w-none">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        <NotificationBell />

        <Link href="/parametres" className="flex items-center gap-3 hover:opacity-75 transition">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-900">{user?.nom}</p>
            <p className="text-[10px] text-gray-400">
              {user?.role === 'CHEF_CHANTIER' ? 'Chef de chantier' : 'Ouvrier'}
            </p>
          </div>
          <Avatar nom={user?.nom ?? ''} avatarPath={user?.avatarPath} size={32} />
        </Link>

        <LogoutButton />
      </div>
    </header>
  )
}