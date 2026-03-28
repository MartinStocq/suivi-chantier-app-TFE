'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, HardHat, Plus, Users, Settings } from 'lucide-react'

interface Props {
  role: 'CHEF_CHANTIER' | 'OUVRIER'
}

export default function Sidebar({ role }: Props) {
  const pathname = usePathname()

  const navItems = [
    { href: '/dashboard',     label: 'Dashboard', icon: LayoutDashboard, show: true },
    { href: '/chantiers',     label: 'Chantiers', icon: HardHat,         show: true },
    { href: '/chantiers/new', label: 'Nouveau',   icon: Plus,            show: role === 'CHEF_CHANTIER' },
    { href: '/utilisateurs',  label: 'Équipe',    icon: Users,           show: true },
    { href: '/parametres',    label: 'Paramètres',icon: Settings,        show: true },
  ]

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-white border-r border-gray-100 flex flex-col z-30">
      <div className="px-6 py-5 border-b border-gray-100">
        <span className="text-base font-semibold text-gray-900 tracking-tight">Suivi Chantier</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.filter(i => i.show).map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Icon size={16} strokeWidth={1.75} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t border-gray-100">
        <p className="text-xs text-gray-400">© 2026 Suivi Chantier</p>
      </div>
    </aside>
  )
}
