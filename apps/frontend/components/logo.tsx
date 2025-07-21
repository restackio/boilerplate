"use client";

import { useTheme } from "next-themes";
import Image from "next/image";

export default function Logo({
  ...props
}) {
  const { systemTheme, theme } = useTheme();
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
