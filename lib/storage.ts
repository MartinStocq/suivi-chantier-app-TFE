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
  const allowedExts = ['jpg', 'jpeg', 'png', 'webp']
  const ext = file.name.split('.').pop()?.toLowerCase() || ''

  if (!allowedExts.includes(ext)) {
    throw new Error('Extension de fichier non supportée (JPG, PNG, WEBP uniquement)')
  }

  // Vérification du type MIME réel (magic bytes)
  const header = await file.slice(0, 12).arrayBuffer()
  const arr = new Uint8Array(header)
  let headerHex = ""
  for (let i = 0; i < Math.min(arr.length, 12); i++) {
    headerHex += arr[i].toString(16).padStart(2, '0')
  }

  let isValidMime = false
  if (headerHex.startsWith('ffd8ff')) isValidMime = true // JPEG
  else if (headerHex.startsWith('89504e47')) isValidMime = true // PNG
  else if (headerHex.startsWith('52494646') && headerHex.slice(16, 24) === '57454250') isValidMime = true // WEBP

  if (!isValidMime) {
    throw new Error('Le contenu du fichier ne correspond pas à une image supportée')
  }

  // Max 5MB pour les photos de chantier
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Le fichier est trop volumineux (max 5 Mo)')
  }

  const supabase = getSupabase()
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

/**
 * Génère une URL signée pour une photo (si le bucket est privé)
 * Note: Cette fonction doit être appelée côté serveur idéalement
 */
export async function getSignedPhotoUrl(storagePath: string, expiresIn = 3600): Promise<string> {
  const supabase = getSupabase()
  const { data, error } = await supabase.storage
    .from('photos')
    .createSignedUrl(storagePath, expiresIn)
  
  if (error) {
    console.error('Error generating signed URL:', error)
    return getPhotoUrl(storagePath) // Fallback to public URL
  }
  return data.signedUrl
}
