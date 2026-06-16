import { useState, useRef } from 'react'
import { Upload, X, Loader2 } from 'lucide-react'
import api from '@/services/api'

const MAX_SIZE_MB = 5
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

export const ImageUpload = ({ value, onChange, carpeta = 'general' }) => {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const inputRef = useRef()

    const handleFile = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        setError('')

        // ── Validar tamaño antes de subir ──────────────────
        if (file.size > MAX_SIZE_BYTES) {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
            setError(`La imagen pesa ${sizeMB}MB. El máximo permitido es ${MAX_SIZE_MB}MB.`)
            e.target.value = '' // limpiar el input para permitir reintentar con el mismo archivo
            return
        }

        setLoading(true)
        try {
            const form = new FormData()
            form.append('imagen', file)
            const { data } = await api.post(`/upload/imagen?carpeta=${carpeta}`, form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
            onChange(data.data.url)
        } catch (err) {
            // Si el backend tambien rechaza por tamaño (ej: limite distinto), mostrar su mensaje
            setError(err.response?.data?.message || 'Error al subir imagen')
        } finally {
            setLoading(false)
            e.target.value = ''
        }
    }

    return (
        <div className="space-y-2">
            {/* Preview */}
            {value && (
                <div className="relative w-full h-40 rounded-xl overflow-hidden border border-border bg-muted">
                    <img src={value} alt="Preview" className="w-full h-full object-contain" />
                    <button
                        type="button"
                        onClick={() => onChange('')}
                        className="absolute top-2 right-2 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}

            {/* Upload button */}
            {!value && (
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={loading}
                    className="w-full h-40 rounded-xl border-2 border-dashed border-border hover:border-brand-400 bg-muted/40 hover:bg-brand-50/30 dark:hover:bg-brand-950/20 flex flex-col items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                    {loading
                        ? <Loader2 className="h-7 w-7 text-brand-500 animate-spin" />
                        : <Upload className="h-7 w-7 text-muted-foreground" />
                    }
                    <span className="text-sm text-muted-foreground">
                        {loading ? 'Subiendo...' : 'Haz clic para subir imagen'}
                    </span>
                    <span className="text-xs text-muted-foreground">JPG, PNG o WEBP · máx. 5MB</span>
                </button>
            )}

            {error && (
                <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/20 px-3 py-2 rounded-lg">
                    ⚠ {error}
                </p>
            )}
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>
    )
}