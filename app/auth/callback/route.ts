import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
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

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        console.log(`[AUTH CALLBACK] Login for ${user.email} (ID: ${user.id})`)
        
        // 1. Chercher par ID (UUID Supabase)
        let profil = await prisma.utilisateur.findUnique({
          where: { id: user.id },
        })

        // 2. Si non trouvé par ID, chercher par email (cas de réinstallation ou changement de projet Supabase)
        if (!profil) {
          profil = await prisma.utilisateur.findUnique({
            where: { email: user.email! },
          })

          if (profil) {
            console.log(`[AUTH CALLBACK] User found by email, updating ID to ${user.id}`)
            profil = await prisma.utilisateur.update({
              where: { email: user.email! },
              data:  { id: user.id },
            })
          }
        }

        // 3. Si toujours rien, créer le profil
        if (!profil) {
          console.log(`[AUTH CALLBACK] Creating new profile for ${user.email}`)
          try {
            profil = await prisma.utilisateur.create({
              data: {
                id:       user.id,
                email:    user.email!,
                nom:      user.user_metadata?.full_name ?? user.email!.split('@')[0],
                role:     'OUVRIER',
                approuve: false,
              },
            })
          } catch (err) {
            console.error(`[AUTH CALLBACK] Error creating profile:`, err)
            return NextResponse.redirect(`${origin}/login?error=db`)
          }
        }

        // 4. Vérifier l'approbation
        if (!profil.approuve) {
          console.log(`[AUTH CALLBACK] Account not approved, redirecting to attente-validation`)
          return NextResponse.redirect(`${origin}/attente-validation`)
        }
      }

      console.log(`[AUTH CALLBACK] Success, redirecting to ${next}`)
      return NextResponse.redirect(`${origin}${next}`)
    } else {
      console.error('[AUTH CALLBACK] Exchange error:', error.message)
      return NextResponse.redirect(`${origin}/login?error=exchange&msg=${encodeURIComponent(error.message)}`)
    }
  } else {
    console.warn('[AUTH CALLBACK] No code found in URL')
    return NextResponse.redirect(`${origin}/login?error=nocode`)
  }
}



