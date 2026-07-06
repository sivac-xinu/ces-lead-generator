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
      <path
        d="M20 4C12 4 7 8 5 14L2 52C1 60 6 66 14 66L100 68C108 68 114 64 116 56L118 16C119 8 114 3 106 3L20 4Z"
        fill="#00356C"
      />
      <text
        x="62"
        y="45"
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
