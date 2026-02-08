import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        className="w-8 h-8 flex items-center justify-center border-2 border-border bg-secondary hover:border-primary/50 hover:bg-secondary/80 transition-default"
        aria-label="Toggle theme"
      >
        <Sun className="w-4 h-4 text-text-primary" />
      </button>
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="w-8 h-8 flex items-center justify-center border-2 border-border bg-secondary hover:border-primary/50 hover:bg-secondary/80 transition-default"
      aria-label="Toggle theme"
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4 text-text-primary hover:text-primary transition-colors" />
      ) : (
        <Moon className="w-4 h-4 text-text-primary hover:text-primary transition-colors" />
      )}
    </button>
  );
}

