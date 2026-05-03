import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import AppLayout from '@/components/layout/AppLayout'
import TopBar from '@/components/layout/TopBar'
import ProfilForm from '@/components/parametres/ProfilForm'

export default async function ParametresPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const utilisateur = await prisma.utilisateur.findUnique({
    where: { id: user.id },
  })
  if (!utilisateur) redirect('/login')

  const avatarUrl = utilisateur.avatarPath
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${utilisateur.avatarPath}`
    : null

  return (
    <AppLayout>
      <TopBar title="Paramètres" subtitle="Mon profil" />
      <main className="flex-1 px-8 py-8 flex justify-center">
        <div className="w-full max-w-xl">
          <ProfilForm
            nom={utilisateur.nom}
            email={utilisateur.email}
            telephone={utilisateur.telephone ?? ''}
            role={utilisateur.role}
            avatarUrl={avatarUrl}
            createdAt={utilisateur.createdAt.toISOString()}
          />
        </div>
      </main>
    </AppLayout>
  )
}