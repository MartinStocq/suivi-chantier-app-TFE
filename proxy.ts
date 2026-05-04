// proxy.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  const isPublicRoute = pathname.startsWith('/login') ||
                        pathname.startsWith('/register') ||
                        pathname.startsWith('/attente-validation') ||
                        pathname.startsWith('/auth/callback')

  // 1. Pas connecté → login
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 2. Connecté → vérifie approbation (avant tout redirect)
  if (user && !isPublicRoute) {
    const profil = await prisma.utilisateur.findUnique({
      where: { id: user.id },
      select: { approuve: true },
    })

    if (!profil?.approuve) {
      return NextResponse.redirect(new URL('/attente-validation', request.url))
    }
  }

  // 3. Connecté + approuvé → redirige depuis login/register vers dashboard
  if (user && (pathname.startsWith('/login') || pathname.startsWith('/register'))) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|$).*)'],
}