import { useState } from 'react'
import { uploadListingPhoto, validatePhotoFile } from '../lib/storage'

const MAX_GALLERY_PHOTOS = 3

export default function PhotoGalleryPicker({ photoUrls, onChange, currentUserId }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const addPhoto = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    try {
      validatePhotoFile(file)
    } catch (err) {
      setError(err.message)
      return
    }
    setUploading(true)
    try {
      const url = await uploadListingPhoto(currentUserId, file)
      onChange([...photoUrls, url])
    } catch (err) {
      console.error('Failed to upload photo', err)
      setError(err.message || 'Could not upload photo. Try again.')
    } finally {
      setUploading(false)
    }
  }

  const removePhoto = (url) => onChange(photoUrls.filter((u) => u !== url))

  return (
    <div className="flex flex-col gap-1 text-xs" style={{ color: 'var(--ink-soft)' }}>
      More photos (optional)
      <div className="flex items-center gap-2 flex-wrap">
        {photoUrls.map((url) => (
          <div
            key={url}
            className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0"
            style={{ border: '1px solid var(--rule)' }}
          >
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removePhoto(url)}
              aria-label="Remove photo"
              className="pressable absolute top-0.5 right-0.5 w-5 h-5 rounded-full text-xs flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }}
            >
              ✕
            </button>
          </div>
        ))}
        {photoUrls.length < MAX_GALLERY_PHOTOS && (
          <label
            className="w-16 h-16 rounded-xl border border-dashed flex items-center justify-center text-xl cursor-pointer shrink-0"
            style={{ borderColor: 'var(--rule)', color: 'var(--ink-soft)', opacity: uploading ? 0.6 : 1 }}
          >
            {uploading ? '…' : '+'}
            <input type="file" accept="image/*" onChange={addPhoto} disabled={uploading} className="hidden" />
          </label>
        )}
      </div>
      {error && <span style={{ color: 'var(--plum)' }}>{error}</span>}
    </div>
  )
}
