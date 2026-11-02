interface LogoProps {
  size?: keyof typeof sizeMap
  className?: string
}

const sizeMap = {
  xs: 'h-6 w-6 text-xs rounded',
  sm: 'h-7 w-7 text-sm rounded-md',
  md: 'h-8 w-8 text-base rounded',
  lg: 'h-9 w-9 text-lg rounded',
}

export default function Logo({ size = 'md', className = '' }: LogoProps) {
  const sizeClasses = sizeMap[size] || sizeMap.md

  return (
    <div
      className={[
        'bg-primary flex items-center justify-center font-bold text-primary-foreground select-none shrink-0 leading-none',
        sizeClasses,
        className,
      ].filter(Boolean).join(' ')}
      aria-hidden="true"
    >
      <span className="translate-y-[-0.5px]">G</span>
    </div>
  )
}
