import { getCurrentUser } from '@/lib/auth'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'
import Avatar from '@/components/ui/Avatar'

interface Props {
  title: string
  subtitle?: string
}

export default async function TopBar({ title, subtitle }: Props) {
  const user = await getCurrentUser()

  return (
    <header className="h-14 border-b border-gray-100 bg-white flex items-center justify-between px-8">
      <div>
        <h1 className="text-sm font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">

        <Link href="/parametres" className="flex items-center gap-3 hover:opacity-75 transition">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{user?.nom}</p>
            <p className="text-xs text-gray-400">
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