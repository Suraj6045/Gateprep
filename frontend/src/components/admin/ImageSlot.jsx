import Upload from 'lucide-react/dist/esm/icons/upload'

const openImage = (url) => {
  window.open(url, '_blank')
}

const imageKeyHandler = (url) => (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    openImage(url)
  }
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
}) {
  return imageUrl ? (
    <div className={`flex items-start ${wrapperGap}`}>
      <img
        src={imageUrl}
        alt={imgAlt}
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        loading="lazy"
        decoding="async"
        onKeyDown={imageKeyHandler(imageUrl)}
        className={`${maxHeight} rounded border theme-border cursor-pointer focus-visible:ring-2 focus-visible:ring-ring outline-none ${imgExtraClass}`}
        onClick={() => openImage(imageUrl)}
      />
      <button onClick={() => onDeleteImage(deleteTarget, deleteExtraArg)} className="text-xs text-destructive hover:opacity-80 mt-1">
        Remove
      </button>
    </div>
  ) : (
    <label className="flex items-center gap-2 cursor-pointer w-fit">
      <div className={`flex items-center gap-1.5 ${uploadPadX} py-1.5 rounded border border-dashed theme-border text-xs theme-muted hover:border-ring hover:text-ring transition-colors`}>
        <Upload size={uploadIconSize}/> {uploadLabel}
      </div>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={event => { if (event.target.files[0]) onUploadImage(event.target.files[0]) }}
      />
    </label>
  )
}