import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useEffect } from "react";
import { API } from "@/shared/services/api";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem>
      <ThemeSync>{children}</ThemeSync>
    </NextThemesProvider>
  );
}

function ThemeSync({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const { user } = useAuth();

  useEffect(() => {
    if (user && theme) {
      API.put("/profile", { themePreference: theme }).catch(() => {});
    }
  }, [user, theme]);

  return <>{children}</>;
}

import { useTheme as useNextTheme } from "next-themes";

export function useTheme() {
  return useNextTheme();
}
