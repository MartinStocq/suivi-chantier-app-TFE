import Link from 'next/link'
import Image from 'next/image'

interface Photo {
  id: string
  storagePath: string
  type: string
}

interface Props {
  photos: Photo[]
  totalPhotos: number
  chantierId: string
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

function photoUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/photos/${path}`
}

export default function ChantierPhotosGrid({ photos, totalPhotos, chantierId }: Props) {
  if (photos.length === 0) {
    return (
      <div className="border border-dashed border-gray-200 rounded-lg py-12 text-center">
        <p className="text-sm text-gray-400 mb-3">Aucune photo pour ce chantier</p>
        <Link
          href={`/chantiers/${chantierId}/photos`}
          className="text-xs font-medium text-gray-700 hover:text-gray-900 transition underline underline-offset-2"
        >
          Ajouter des photos
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo) => (
          <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
            <Image
              src={photoUrl(photo.storagePath)}
              alt={photo.type}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 33vw, 200px"
            />
            <span className="absolute bottom-1.5 left-1.5 text-xs px-1.5 py-0.5 bg-black/50 text-white rounded font-medium">
              {photo.type === 'AVANT' ? 'Avant' : 'Après'}
            </span>
          </div>
        ))}
      </div>

      {totalPhotos > 6 && (
        <Link
          href={`/chantiers/${chantierId}/photos`}
          className="block text-center text-xs text-gray-500 hover:text-gray-700 transition font-medium"
        >
          Voir toutes les photos ({totalPhotos})
        </Link>
      )}
    </div>
  )
}
