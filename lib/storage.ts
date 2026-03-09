import { supabase } from './supabase'

async function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image()
    img.src = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const MAX = 1200
      const ratio = Math.min(MAX / img.width, MAX / img.height)
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        resolve(new File([blob!], file.name, { type: 'image/jpeg' }))
      }, 'image/jpeg', 0.7)
    }
  })
}

export const uploadPhoto = async (file: File, chantierId: string): Promise<string> => {
  const compressed = await compressImage(file)
  const fileExt = file.name.split('.').pop()
  const filePath = `chantiers/${chantierId}/${Date.now()}.${fileExt}`

  const { error } = await supabase.storage
    .from('photos')
    .upload(filePath, compressed)

  if (error) throw error

  return filePath
}

export const getPhotoUrl = (storagePath: string): string => {
  const { data } = supabase.storage
    .from('photos')
    .getPublicUrl(storagePath)
  return data.publicUrl
}
