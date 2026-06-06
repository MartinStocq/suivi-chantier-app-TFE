import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AttenteValidationClient from './AttenteValidationClient'

export default async function AttenteValidationPage() {
  const user = await getCurrentUser()

  // Si l'utilisateur est déjà approuvé, on le redirige vers le dashboard
  if (user?.approuve) {
    redirect('/dashboard')
  }

  // Si pas de user du tout, retour login
  if (!user) {
    redirect('/login')
  }

  return <AttenteValidationClient />
}
