'use client'
import PhotoUpload from '@/components/PhotoUpload'

export default function PhotosPage() {
  return (
    <div>
      <h1>Test upload</h1>
      <PhotoUpload
        chantierId="test"
        takenById="test-user"
        type="AVANT"
      />
    </div>
  )
}

