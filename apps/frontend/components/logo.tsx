"use client";

import { useTheme } from "next-themes";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function Logo({
  ...props
}) {
  const { systemTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering theme-dependent content after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR and before mount, use a default image to prevent hydration mismatch
  if (!mounted) {
    return (
      <Image
        src="/logo--light.svg"
        width="150"
        height="150"
        alt="Boilerplate"
        className="h-50 w-50"
        {...props}
      />
    );
  }

  const currentTheme = (theme === "system" ? systemTheme : theme);
  return currentTheme === "dark" ? (
    <Image
      src="/logo--dark.svg"
      width="150"
      height="150"
      alt="Boilerplate"
      className="h-50 w-50"
      {...props}
    />
  ) : (
    <Image
      src="/logo--light.svg"
      width="150"
      height="150"
      alt="Boilerplate"
      className="h-50 w-50"
      {...props}
    />
  );
}
