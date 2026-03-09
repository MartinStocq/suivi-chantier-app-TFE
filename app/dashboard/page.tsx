'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
  }, [])

  return (
    <div>
      <h1>Dashboard</h1>
      {user ? (
        <p>Connecté en tant que : {user.email}</p>
      ) : (
        <p>Non connecté</p>
      )}
    </div>
  )
}
