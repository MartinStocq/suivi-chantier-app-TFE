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
        const existingProfil = await prisma.utilisateur.findUnique({
          where:  { id: user.id },
          select: { approuve: true },
        })

        if (!existingProfil) {
          // FIX #6 — Nouveau compte Google → non approuvé, redirige vers attente
          await prisma.utilisateur.create({
            data: {
              id:       user.id,
              email:    user.email!,
              nom:      user.user_metadata?.full_name ?? user.email!.split('@')[0],
              role:     'OUVRIER',
              approuve: false,
            },
          })
          return NextResponse.redirect(`${origin}/attente-validation`)
        }

        // FIX #6 — Compte existant mais non approuvé → attente
        if (!existingProfil.approuve) {
          return NextResponse.redirect(`${origin}/attente-validation`)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}



