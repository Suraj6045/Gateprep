import { Upload } from 'lucide-react'
import type { ChangeEvent, KeyboardEvent, ReactElement } from 'react'

export type ImageDeleteTarget = 'question' | 'A' | 'B' | 'C' | 'D'

const openImage = (url: string): void => {
  window.open(url, '_blank')
}

const imageKeyHandler = (url: string) => (event: KeyboardEvent<HTMLImageElement>): void => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    openImage(url)
  }
}

export interface ImageSlotProps {
  imageUrl: string | null
  ariaLabel: string
  imgAlt: string
  maxHeight: string
  imgExtraClass?: string
  wrapperGap: string
  uploadLabel: string
  uploadIconSize: number
  uploadPadX: string
  onUploadImage: (file: File) => void
  onDeleteImage: (questionId: number, target: ImageDeleteTarget) => void
  deleteTarget: number
  deleteExtraArg: ImageDeleteTarget
}

export default function ImageSlot({
  imageUrl,
  ariaLabel,
  imgAlt,
  maxHeight,
  imgExtraClass = '',
  wrapperGap,
  uploadLabel,
  uploadIconSize,
  uploadPadX,
  onUploadImage,
  onDeleteImage,
  deleteTarget,
  deleteExtraArg,
}: ImageSlotProps): ReactElement {
  return imageUrl ? (
    <div className={`flex items-start ${wrapperGap}`}>
      <img
        src={imageUrl}
        alt={imgAlt}
        width={320}
        height={180}
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        loading="lazy"
        decoding="async"
        onKeyDown={imageKeyHandler(imageUrl)}
        className={`${maxHeight} object-contain rounded border theme-border cursor-pointer focus-visible:ring-2 focus-visible:ring-ring outline-none ${imgExtraClass}`}
        onClick={() => openImage(imageUrl)}
      />
      <button onClick={() => onDeleteImage(deleteTarget, deleteExtraArg)} className="text-xs text-destructive hover:opacity-80 mt-1">
        Remove
      </button>
    </div>
  ) : (
    <label className="flex items-center gap-2 cursor-pointer w-fit">
      <div className={`flex items-center gap-1.5 ${uploadPadX} py-1.5 rounded border border-dashed border-muted-foreground/60 text-xs theme-muted hover:border-ring hover:text-ring transition-colors`}>
        <Upload size={uploadIconSize}/> {uploadLabel}
      </div>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          const file = event.target.files?.[0]
          if (file) onUploadImage(file)
        }}
      />
    </label>
  )
}