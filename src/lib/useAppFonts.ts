import { useFonts, Fraunces_400Regular, Fraunces_600SemiBold } from "@expo-google-fonts/fraunces";
import { Karla_400Regular, Karla_700Bold } from "@expo-google-fonts/karla";

// Loads the brand typefaces (see fonts.heading / fonts.body in lib/theme.ts).
// Richard: this needs the packages installed before it'll build - run:
//   npx expo install @expo-google-fonts/fraunces @expo-google-fonts/karla expo-font expo-splash-screen
export function useAppFonts(): boolean {
  const [loaded] = useFonts({
    Fraunces_400Regular,
    Fraunces_600SemiBold,
    Karla_400Regular,
    Karla_700Bold,
  });
  return loaded;
}
