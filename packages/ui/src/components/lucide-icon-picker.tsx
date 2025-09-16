"use client";

import { useState, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../lib/utils";
import { getLucideIcon } from "../lib/get-lucide-icon";
import { iconNames } from "lucide-react/dynamic";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";

// Convert kebab-case to PascalCase (e.g., "arrow-up" -> "ArrowUp")
function kebabToPascal(str: string): string {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

// Simple fuzzy search function
function fuzzySearch(query: string, text: string): number {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  // Exact match gets highest score
  if (textLower === queryLower) return 1000;
  
  // Starts with query gets high score
  if (textLower.startsWith(queryLower)) return 500;
  
  // Contains query gets medium score
  if (textLower.includes(queryLower)) return 100;
  
  // Fuzzy matching - check if all characters of query exist in order
  let queryIndex = 0;
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      queryIndex++;
    }
  }
  
  // If all characters found in order, return score based on how close they are
  if (queryIndex === queryLower.length) {
    return Math.max(1, 50 - (textLower.length - queryLower.length));
  }
  
  return 0;
}


interface LucideIconPickerProps {
  value?: string;
  onValueChange?: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function LucideIconPicker({
  value = "Building",
  onValueChange,
  label = "Icon",
  placeholder = "Select an icon...",
  className,
  disabled = false,
}: LucideIconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Get all available Lucide icons using official iconNames (memoized for performance)
  const allIcons = useMemo(() => {
    // Convert official kebab-case names to PascalCase for React components
    const icons = iconNames.map(kebabToPascal);
    
    // Remove duplicates (some icons have aliases that convert to the same PascalCase name)
    const uniqueIcons = Array.from(new Set(icons)).sort(); 
    return uniqueIcons;
  }, []);

  // Fuzzy search through all icons when searching, show first 50 icons when not searching
  const filteredIcons = useMemo(() => {
    if (!search.trim()) {
      // Show first 50 icons alphabetically when no search
      return allIcons.slice(0, 50);
    }

    // Score all icons and return top matches
    const scored = allIcons
      .map(iconName => ({
        name: iconName,
        score: fuzzySearch(search, iconName)
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 50) // Limit to top 50 results for performance
      .map(item => item.name);

    return scored;
  }, [search, allIcons]);

  const CurrentIcon = getLucideIcon(value);

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label>{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            <div className="flex items-center gap-2">
              <CurrentIcon className="h-4 w-4" />
              <span>{value}</span>
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-3">
            <Input
              placeholder="Search icons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-3"
            />
            <div className="h-64 overflow-y-auto">
              <div className="space-y-1">
                {filteredIcons.map((iconName) => {
                  const IconComponent = getLucideIcon(iconName);
                  const isSelected = value === iconName;
                  return (
                    <Button
                      key={iconName}
                      variant={isSelected ? "default" : "ghost"}
                      size="sm"
                      className="w-full h-10 flex items-center gap-3 px-3 justify-start"
                      onClick={() => {
                        onValueChange?.(iconName);
                        setOpen(false);
                      }}
                    >
                      <IconComponent className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm truncate">{iconName}</span>
                    </Button>
                  );
                })}
              </div>
              {filteredIcons.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No icons found for "{search}"
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}