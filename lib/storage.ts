import { createBrowserClient } from '@supabase/ssr'

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function uploadPhoto(
  file: File,
  chantierId: string
): Promise<string> {
  const supabase = getSupabase()
  const ext = file.name.split('.').pop()
  const path = `chantiers/${chantierId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('photos')
    .upload(path, file, { upsert: false })

  if (error) throw new Error(error.message)
  return path
}

export function getPhotoUrl(storagePath: string): string {
  const supabase = getSupabase()
  const { data } = supabase.storage
    .from('photos')
    .getPublicUrl(storagePath)
  return data.publicUrl
}
