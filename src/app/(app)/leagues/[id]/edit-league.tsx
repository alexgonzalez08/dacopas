'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Pencil, X, Loader2, ImageIcon, Check } from 'lucide-react'

export default function EditLeague({
  leagueId,
  initialName,
  initialDescription,
  initialImageUrl,
  externalOpen,
  onExternalClose,
}: {
  leagueId: string
  initialName: string
  initialDescription: string | null
  initialImageUrl: string | null
  externalOpen?: boolean
  onExternalClose?: () => void
}) {
  const [open, setOpen] = useState(false)
  const isOpen = externalOpen !== undefined ? externalOpen : open
  const closeModal = () => { setOpen(false); onExternalClose?.() }
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription ?? '')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(initialImageUrl)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const imageRef = useRef<HTMLInputElement>(null)

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      let imageUrl: string | null = initialImageUrl

      if (imageFile) {
        const ext = imageFile.name.split('.').pop()
        const path = `${user!.id}/${leagueId}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('league-images')
          .upload(path, imageFile, { upsert: true })
        if (uploadError) throw new Error(`Error al subir imagen: ${uploadError.message}`)
        const { data: { publicUrl } } = supabase.storage.from('league-images').getPublicUrl(path)
        imageUrl = publicUrl
      }

      const { error: updateError } = await supabase
        .from('leagues')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          image_url: imageUrl,
        })
        .eq('id', leagueId)

      if (updateError) throw updateError

      setSaved(true)
      setTimeout(() => {
        closeModal()
        setSaved(false)
        // Recargar la página para reflejar los cambios
        window.location.reload()
      }, 800)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    closeModal()
    setName(initialName)
    setDescription(initialDescription ?? '')
    setImageFile(null)
    setImagePreview(initialImageUrl)
    setError(null)
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm" onClick={handleClose}>
          <div className="w-full max-w-sm bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <h2 className="font-bold text-white flex items-center gap-2">
                <Pencil className="w-4 h-4 text-yellow-400" /> Editar torneo
              </h2>
              <button onClick={handleClose} className="text-slate-500 hover:text-white transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 space-y-4">
              {/* Imagen */}
              <div
                onClick={() => imageRef.current?.click()}
                className="relative w-full h-32 rounded-xl border-2 border-dashed border-slate-700 hover:border-yellow-500/50 transition cursor-pointer overflow-hidden flex items-center justify-center bg-slate-800"
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-slate-500">
                    <ImageIcon className="w-6 h-6" />
                    <span className="text-xs">Cambiar imagen (opcional)</span>
                  </div>
                )}
              </div>
              <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />

              {/* Nombre */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Nombre del torneo</label>
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)} required
                  className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:outline-none focus:border-yellow-500"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Descripción <span className="text-slate-600 text-xs">(opcional)</span>
                </label>
                <textarea
                  value={description} onChange={e => setDescription(e.target.value)}
                  rows={3} maxLength={300}
                  placeholder="¿De qué trata este torneo?"
                  className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:outline-none focus:border-yellow-500 resize-none text-sm"
                />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button type="submit" disabled={saving || saved}
                className="w-full py-3 bg-yellow-500 text-slate-900 font-semibold rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition flex items-center justify-center gap-2">
                {saving
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                  : saved
                    ? <><Check className="w-4 h-4" /> Guardado</>
                    : 'Guardar cambios'
                }
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
