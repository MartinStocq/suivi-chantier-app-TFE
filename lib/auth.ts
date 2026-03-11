import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import type { Role } from '@prisma/client'

// Récupère le user Supabase + son profil PostgreSQL (avec le rôle)
export async function getCurrentUser() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Récupère le profil depuis PostgreSQL (contient le rôle)
  const profil = await prisma.utilisateur.findUnique({
    where: { id: user.id }
  })

  if (!profil) return null

  return {
    id: user.id,
    email: user.email!,
    nom: profil.nom,
    role: profil.role, // 'OUVRIER' | 'CHEF_CHANTIER'
  }
}

// Helper : vérifie si le user est Chef
export async function isChef(): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.role === 'CHEF_CHANTIER'
}

// Helper : vérifie si le user est Ouvrier
export async function isOuvrier(): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.role === 'OUVRIER'
}
