interface CESLogoProps {
  width?: number
  light?: boolean
  className?: string
}

export function CESLogo({ width = 120, light = true, className }: CESLogoProps) {
  const height = (width / 120) * 42
  const textColor = light ? '#ffffff' : '#00356C'

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 120 42"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="CES logo"
    >
      <rect x="0" y="0" width="5" height="42" rx="2.5" fill="#F99D1C" />
      <text
        x="16"
        y="31"
        fontFamily="Satoshi, 'Segoe UI', system-ui, sans-serif"
        fontWeight="800"
        fontSize="32"
        letterSpacing="-0.5"
        fill={textColor}
      >
        CES
      </text>
      <circle cx="111" cy="27" r="4.5" fill="#F99D1C" />
    </svg>
  )
}
