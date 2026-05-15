import { useFonts as useExpoFonts } from 'expo-font';

/**
 * Tomato Grotesk font loader.
 *
 * SETUP — once the .otf files are in src/assets/fonts/:
 *   TomatoGrotesk-Regular.otf
 *   TomatoGrotesk-Medium.otf
 *   TomatoGrotesk-SemiBold.otf
 *
 * Uncomment the three `require` lines below. Until then the hook returns
 * `[true, null]` immediately so the app boots; AppText falls back to the
 * system font.
 *
 * Why commented and not live: Metro resolves `require()` paths at bundle
 * time. With the files missing, the bundler errors out and nothing else
 * is testable.
 */
export const useFonts = () => {
  return useExpoFonts({
    'TomatoGrotesk-Regular':  require('../assets/fonts/TomatoGrotesk-Regular.otf'),
    'TomatoGrotesk-Medium':   require('../assets/fonts/TomatoGrotesk-Medium.otf'),
    'TomatoGrotesk-SemiBold': require('../assets/fonts/TomatoGrotesk-SemiBold.otf'),
  });
};

export default useFonts;
