import * as LucideIcons from "lucide-react";
import { Building, type LucideIcon } from "lucide-react";

/**
 * Get a Lucide icon component by name
 * @param iconName - The name of the Lucide icon (e.g., "Building", "Users", "Code")
 * @returns The Lucide icon component, or Building as fallback
 */
export function getLucideIcon(iconName?: string): LucideIcon {
  if (!iconName) return Building;
  
  // Direct PascalCase lookup
  const IconComponent = (LucideIcons as any)[iconName];
  
  // Return the icon component if it exists, otherwise fallback to Building
  return IconComponent || Building;
}

/**
 * Check if a Lucide icon exists
 * @param iconName - The name of the Lucide icon
 * @returns true if the icon exists, false otherwise
 */
export function isValidLucideIcon(iconName: string): boolean {
  return !!(LucideIcons as any)[iconName];
}