import { Bricolage_Grotesque } from 'next/font/google';

// Same font as the start page. Pages add `font.variable` to their wrapper.
export const font = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-lp',
  display: 'swap',
});
