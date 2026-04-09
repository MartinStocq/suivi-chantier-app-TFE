import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export async function getSupabaseUser() {
  const cookieStore = await cookies()

  // Client READ-ONLY — ne tente pas de set les cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {
          // Volontairement vide — pas de modification de cookies ici
          // Les cookies sont rafraîchis uniquement dans le middleware
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

export async function getCurrentUser() {
  const supabaseUser = await getSupabaseUser()
  if (!supabaseUser) return null

  const user = await prisma.utilisateur.findUnique({
    where: { id: supabaseUser.id },
    select: {
      id:       true,
      nom:      true,
      email:    true,
      role:     true,
      approuve: true,
    }
  })

  return user
}
