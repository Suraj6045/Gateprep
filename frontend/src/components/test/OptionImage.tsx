export interface OptionImageProps {
  src?: string | null
  letter: string
}

export default function OptionImage({ src, letter }: OptionImageProps): React.ReactElement | null {
  if (!src) return null
  return (
    <img
      src={src}
      alt={`option ${letter}`}
      width={320}
      height={137}
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
