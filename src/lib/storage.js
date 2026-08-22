import { supabase } from './supabaseClient'

const MAX_PHOTO_BYTES = 5 * 1024 * 1024

export function validatePhotoFile(file) {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.')
  if (file.size > MAX_PHOTO_BYTES) throw new Error('Image is too large (max 5MB).')
}

async function uploadPhoto(bucket, userId, file) {
  validatePhotoFile(file)
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${userId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, { cacheControl: '3600' })
  if (error) throw error
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

export const uploadListingPhoto = (userId, file) => uploadPhoto('listing-photos', userId, file)
export const uploadAvatarPhoto = (userId, file) => uploadPhoto('avatars', userId, file)
export const uploadChatPhoto = (userId, file) => uploadPhoto('chat-photos', userId, file)
