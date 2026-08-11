export default function Logo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="120" rx="24" fill="#0f0d0a" />
      <g transform="translate(0,6)">
        <path d="M47 42 C34 25 19 23 8 32 C23 31 34 35 43 48 Z" fill="#FF5A1F" />
        <path d="M73 42 C86 25 101 23 112 32 C97 31 86 35 77 48 Z" fill="#FF5A1F" />
        <path
          d="M50 54 L35 70 L50 86"
          stroke="#F4EFE6"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M70 54 L85 70 L70 86"
          stroke="#F4EFE6"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <rect x="55.5" y="50" width="9" height="42" rx="4.5" fill="#F4EFE6" />
      </g>
    </svg>
  );
}
