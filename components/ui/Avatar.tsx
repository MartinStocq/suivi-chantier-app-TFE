const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

interface Props {
  nom: string
  avatarPath?: string | null
  size?: number  // taille en pixels, défaut 32
}

export default function Avatar({ nom, avatarPath, size = 32 }: Props) {
  const url = avatarPath
    ? `${SUPABASE_URL}/storage/v1/object/public/photos/${avatarPath}`
    : null

  return (
    <div
      className="rounded-full bg-gray-900 flex items-center justify-center text-white font-semibold shrink-0 overflow-hidden"
      style={{ width: size, height: size, fontSize: size * 0.375 }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={nom}
          style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
        />
      ) : (
        nom.charAt(0).toUpperCase()
      )}
    </div>
  )
}