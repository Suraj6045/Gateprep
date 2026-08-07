export default function OptionImage({ src, letter }) {
  if (!src) return null
  return (
    <img
      src={src}
      alt={`option ${letter}`}
      loading="lazy"
      decoding="async"
      className="mt-2 w-full max-w-sm max-h-32 object-contain rounded cursor-pointer bg-muted aspect-[21/9]"
      onClick={(event) => {
        event.stopPropagation()
        window.open(src, '_blank')
      }}
    />
  )
}
