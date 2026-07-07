interface CESLogoProps {
  width?: number
  className?: string
}

export function CESLogo({ width = 120, className }: CESLogoProps) {
  return (
    <img
      src="/ces-logo.png"
      alt="CES logo"
      width={width}
      className={className}
      style={{ height: 'auto' }}
    />
  )
}
