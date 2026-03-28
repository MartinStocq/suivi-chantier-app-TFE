import { getCurrentUser } from '@/lib/auth'
import LogoutButton from '@/components/LogoutButton'

interface Props { title: string; subtitle?: string }

export default async function TopBar({ title, subtitle }: Props) {
  const user = await getCurrentUser()

  return (
    <header className="h-14 border-b border-gray-100 bg-white flex items-center justify-between px-8">
      <div>
        <h1 className="text-sm font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">{user?.nom}</p>
          <p className="text-xs text-gray-400">
            {user?.role === 'CHEF_CHANTIER' ? 'Chef de chantier' : 'Ouvrier'}
          </p>
        </div>
        <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-semibold">
          {user?.nom?.charAt(0).toUpperCase()}
        </div>
        <LogoutButton />
      </div>
    </header>
  )
}
