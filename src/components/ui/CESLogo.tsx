interface CESLogoProps {
  width?: number
  className?: string
}

export function CESLogo({ width = 120, className }: CESLogoProps) {
  const height = (width / 120) * 70

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 120 70"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="CES logo"
    >
      <g transform="translate(60,35) rotate(-5) translate(-60,-35)">
        <rect
          x="8"
          y="5"
          width="104"
          height="60"
          rx="14"
          ry="14"
          fill="#00356C"
        />
      </g>
      <text
        x="60"
        y="46"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="800"
        fontSize="34"
        letterSpacing="-1"
        fill="#ffffff"
      >
        CES
      </text>
      <rect x="47" y="51" width="20" height="5" rx="1" fill="#F99D1C" />
    </svg>
  )
}
