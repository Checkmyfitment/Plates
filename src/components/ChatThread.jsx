import { useRef, useState } from 'react'
import { uploadChatPhoto, validatePhotoFile } from '../lib/storage'
import { translateText, targetLanguageFor } from '../lib/translate'
import ReportModal from './ReportModal'

export default function ChatThread({ chat, currentUserId, viewerProfile, onBack, onSend }) {
  const [text, setText] = useState('')
  const [pendingPhoto, setPendingPhoto] = useState(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [reporting, setReporting] = useState(false)
  // keyed by message id (or index, for a message that hasn't been assigned
  // one yet) — cached once translated so toggling back and forth doesn't
  // re-hit the translation API
  const [translations, setTranslations] = useState({})
  const fileInputRef = useRef(null)

  const toggleTranslate = async (key, originalText) => {
    const existing = translations[key]
    if (existing && (existing.text || existing.failed)) {
      setTranslations((prev) => ({ ...prev, [key]: { ...prev[key], visible: !prev[key].visible } }))
      return
    }
    setTranslations((prev) => ({ ...prev, [key]: { loading: true, visible: true } }))
    const result = await translateText(originalText, targetLanguageFor(viewerProfile))
    setTranslations((prev) => ({ ...prev, [key]: { loading: false, visible: true, text: result, failed: !result } }))
  }
  // guards against a rapid double-click sending the same message twice —
  // two clicks in the same tick both read `text` before React commits the
  // setText('') from the first, so state alone can't block the second
  const sendingRef = useRef(false)

  const submit = (e) => {
    e.preventDefault()
    if (sendingRef.current) return
    const trimmed = text.trim()
    if (!trimmed && !pendingPhoto) return
    sendingRef.current = true
    onSend(trimmed, pendingPhoto)
    setText('')
    setPendingPhoto(null)
    queueMicrotask(() => {
      sendingRef.current = false
    })
  }

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPhotoError('')
    try {
      validatePhotoFile(file)
    } catch (err) {
      setPhotoError(err.message)
      return
    }
    setUploadingPhoto(true)
    try {
      const url = await uploadChatPhoto(currentUserId, file)
      setPendingPhoto(url)
    } catch (err) {
      console.error('Failed to upload photo', err)
      setPhotoError(err.message || 'Could not upload photo. Try again.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-6 pb-3 flex items-center gap-3 border-b" style={{ borderColor: 'var(--rule)' }}>
        <button
          onClick={onBack}
          aria-label="Back"
          className="text-lg p-2 -m-2 rounded-full hover:bg-[var(--paper-dim)] transition-colors"
          style={{ color: 'var(--forest-dark)' }}
        >
          ←
        </button>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 overflow-hidden"
          style={{ background: chat.bg }}
        >
          {chat.photoUrl ? (
            <img src={chat.photoUrl} alt={chat.listingTitle} className="w-full h-full object-cover" />
          ) : (
            chat.photo
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-tight truncate">{chat.seller}</p>
          <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>{chat.listingTitle}</p>
        </div>
        {chat.counterpartId && (
          <button
            onClick={() => setReporting(true)}
            aria-label="Report this person"
            className="text-xs px-2 py-1 -m-1 shrink-0"
            style={{ color: 'var(--ink-soft)' }}
          >
            🚩 Report
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2">
        {chat.messages.map((m, i) => {
          const key = m.id ?? i
          const translation = translations[key]
          const subtleColor = m.from === 'me' ? 'rgba(255,255,255,0.75)' : 'var(--ink-soft)'
          return (
            <div
              key={key}
              className="max-w-[75%] text-sm rounded-2xl overflow-hidden"
              style={{
                alignSelf: m.from === 'me' ? 'flex-end' : 'flex-start',
                background: m.from === 'me' ? 'var(--forest)' : 'var(--card)',
                color: m.from === 'me' ? 'white' : 'var(--ink)',
                border: m.from === 'me' ? 'none' : '1px solid var(--rule)',
              }}
            >
              {m.photoUrl && (
                <img src={m.photoUrl} alt="Shared photo" className="w-full max-h-64 object-cover" />
              )}
              {m.text && (
                <div className="px-3 py-2">
                  <div>{m.text}</div>
                  <button
                    type="button"
                    onClick={() => toggleTranslate(key, m.text)}
                    className="pressable text-xs mt-1 underline"
                    style={{ color: subtleColor }}
                  >
                    {translation?.visible ? 'Hide translation' : '🌐 Translate'}
                  </button>
                  {translation?.visible && (
                    <div className="text-xs mt-1 pt-1" style={{ color: subtleColor, borderTop: `1px solid ${subtleColor}` }}>
                      {translation.loading
                        ? 'Translating…'
                        : translation.text || "Couldn't translate this message."}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {photoError && (
        <p className="px-5 text-xs" style={{ color: 'var(--plum)' }}>{photoError}</p>
      )}

      {pendingPhoto && (
        <div className="px-5 pb-2 flex items-center gap-2">
          <img src={pendingPhoto} alt="Photo to send" className="w-14 h-14 rounded-lg object-cover" />
          <button
            type="button"
            onClick={() => setPendingPhoto(null)}
            className="pressable text-xs underline"
            style={{ color: 'var(--ink-soft)' }}
          >
            Remove
          </button>
        </div>
      )}

      <form onSubmit={submit} className="px-5 py-3 flex gap-2 border-t" style={{ borderColor: 'var(--rule)' }}>
        <input type="file" accept="image/*" onChange={handlePhoto} disabled={uploadingPhoto} ref={fileInputRef} className="hidden" />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingPhoto}
          aria-label="Attach a photo"
          className="pressable px-3 rounded-xl text-lg disabled:opacity-50"
          style={{ border: '1px solid var(--rule)', color: 'var(--ink-soft)' }}
        >
          {uploadingPhoto ? '…' : '📷'}
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message the seller…"
          className="field flex-1"
          maxLength={1000}
        />
        <button
          type="submit"
          disabled={!text.trim() && !pendingPhoto}
          className="px-4 rounded-xl text-sm font-medium disabled:opacity-50 hover:opacity-90 active:opacity-80 transition-opacity"
          style={{ background: 'var(--mustard)', color: 'var(--forest-dark)' }}
        >
          Send
        </button>
      </form>

      {reporting && (
        <ReportModal
          reporterId={currentUserId}
          listingId={chat.listingId}
          reportedUserId={chat.counterpartId}
          title={`Report ${chat.seller}`}
          onClose={() => setReporting(false)}
        />
      )}
    </div>
  )
}
