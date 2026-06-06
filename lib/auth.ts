import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { unstable_noStore as noStore } from 'next/cache'

export async function getSupabaseUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

export async function getCurrentUser() {
  noStore()
  const supabaseUser = await getSupabaseUser()
  if (!supabaseUser) return null

  let user = await prisma.utilisateur.findUnique({
    where: { id: supabaseUser.id },
    select: {
      id:         true,
      nom:        true,
      email:      true,
      role:       true,
      approuve:   true,
      telephone:  true,
      avatarPath: true,
    },
  })

  // Auto-réparation du profil si manquant (ex: après db:reset)
  if (!user && supabaseUser.email) {
    try {
      user = await prisma.utilisateur.create({
        data: {
          id: supabaseUser.id,
          email: supabaseUser.email,
          nom: supabaseUser.user_metadata?.nom || supabaseUser.user_metadata?.full_name || supabaseUser.email.split('@')[0],
          approuve: false, // Par défaut, doit être approuvé par un admin
          role: 'OUVRIER',
        },
        select: {
          id:         true,
          nom:        true,
          email:      true,
          role:       true,
          approuve:   true,
          telephone:  true,
          avatarPath: true,
        },
      })
      console.log(`Profil auto-réparé pour l'utilisateur : ${supabaseUser.email}`)
    } catch (error) {
      console.error("Erreur lors de l'auto-réparation du profil :", error)
      return null
    }
  }

  return user
}