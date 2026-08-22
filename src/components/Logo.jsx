// Small brand mark: a plate with a few bites of food on it.
// Colors are pulled from the CSS custom properties in src/index.css so it
// always matches the app's palette.
export default function Logo({ size = 28 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="0.5" y="0.5" width="31" height="31" rx="9" fill="var(--forest-dark)" />
      <circle cx="16" cy="17" r="11" fill="var(--paper)" stroke="var(--mustard-deep)" strokeWidth="1.4" />
      <circle cx="16" cy="17" r="7.5" fill="none" stroke="var(--rule)" strokeWidth="1" />
      <circle cx="12.5" cy="14.5" r="2.6" fill="var(--mustard)" />
      <circle cx="20" cy="14.5" r="2.4" fill="var(--plum)" />
      <circle cx="16" cy="20" r="2.9" fill="var(--forest)" />
    </svg>
  )
}
