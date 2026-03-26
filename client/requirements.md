## Packages
react-qr-code | QR Code generation for Patient Health ID
framer-motion | Page transitions and animations
date-fns | Date formatting

## Notes
Tailwind Config - extend fontFamily:
fontFamily: {
  sans: ["var(--font-sans)"],
  display: ["var(--font-display)"],
}
Colors config should use the CSS variables defined in index.css.
Auth uses Bearer token in localStorage, integrated into queryClient.ts.
