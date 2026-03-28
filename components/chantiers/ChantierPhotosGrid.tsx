import Link from 'next/link'

interface Photo {
  id: string
  type: 'AVANT' | 'APRES'
  storagePath: string
}

interface Props {
  photos: Photo[]
  totalPhotos: number
  chantierId: string
}

export default function ChantierPhotosGrid({ photos, totalPhotos, chantierId }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold text-gray-900">📷 Photos ({totalPhotos})</h2>
        <Link href={`/chantiers/${chantierId}/photos`} className="text-sm text-green-600 hover:underline font-medium">
          {totalPhotos > 6 ? `Voir toutes (${totalPhotos})` : '+ Ajouter'}
        </Link>
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-4xl mb-2">📸</p>
          <p className="text-gray-400 text-sm">Aucune photo pour ce chantier</p>
          <Link href={`/chantiers/${chantierId}/photos`} className="text-sm text-green-600 hover:underline mt-2 inline-block">
            Ajouter des photos
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map(photo => (
            <div key={photo.id} className="aspect-square bg-gray-100 rounded-xl overflow-hidden relative">
              <span className={`absolute top-1 left-1 text-xs px-1.5 py-0.5 rounded-full font-medium z-10 ${
                photo.type === 'AVANT' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
              }`}>
                {photo.type}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
