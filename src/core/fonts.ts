// Font files for 3D text (drei <Text>, troika) and canvas textures.
// The CSS @font-face rules come from @fontsource (imported in main.tsx); family name below.
// Complete font files (Arabic + Latin + digits + punctuation) so troika never needs a CDN fallback font.
import arabicMedium from '@ibm/plex-sans-arabic/fonts/complete/woff/IBMPlexSansArabic-Medium.woff?url';
import arabicBold from '@ibm/plex-sans-arabic/fonts/complete/woff/IBMPlexSansArabic-Bold.woff?url';

export const FONT_FAMILY = '"IBM Plex Sans Arabic"';
/** URLs usable as drei <Text font={...}> (woff works with troika). */
export const FONT_AR_MEDIUM: string = arabicMedium;
export const FONT_AR_BOLD: string = arabicBold;

/** Resolves when both weights are loaded for canvas drawing (never rejects). */
export const fontsReady: Promise<void> =
  typeof document === 'undefined' || !document.fonts
    ? Promise.resolve()
    : Promise.all([
        document.fonts.load(`500 32px ${FONT_FAMILY}`, 'الراشد'),
        document.fonts.load(`700 32px ${FONT_FAMILY}`, 'الراشد'),
      ]).then(
        () => undefined,
        () => undefined,
      );
