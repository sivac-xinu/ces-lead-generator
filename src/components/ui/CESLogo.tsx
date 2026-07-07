import logoUrl from '/ces-logo.png'

interface CESLogoProps {
  width?: number
  className?: string
}

export function CESLogo({ width = 120, className }: CESLogoProps) {
  return (
    <img
      src={logoUrl}
      alt="CES logo"
      width={width}
      className={className}
      style={{ height: 'auto' }}
    />
  )
}
