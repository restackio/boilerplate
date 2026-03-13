"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@workspace/ui/components/ui/button";
import { Input } from "@workspace/ui/components/ui/input";
import { Search, Plus, Loader2 } from "lucide-react";
import { getRemoteMcpDirectory } from "@/app/actions/workflow";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";

export interface RemoteMcpEntry {
  id: string;
  name: string;
  server_label: string;
  server_url: string;
  description: string;
  tags: string[];
  /** Authentication: 'oauth', 'bearer', 'both', or 'none' */
  auth_type?: string | null;
}

interface AddFromDirectoryProps {
  onSuccess?: () => void;
}

export function AddFromDirectory({ onSuccess }: AddFromDirectoryProps) {
  const { workspaceId } = useDatabaseWorkspace();
  const { createMcpServer } = useWorkspaceScopedActions();
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<RemoteMcpEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  const fetchDirectory = useCallback(async (searchQuery?: string) => {
    setLoading(true);
    try {
      const result = await getRemoteMcpDirectory(searchQuery || undefined);
      if (result.success && result.entries) {
        setEntries(
          result.entries.map((e: Record<string, unknown>) => ({
            id: String(e.id ?? ""),
            name: String(e.name ?? ""),
            server_label: String(e.server_label ?? ""),
            server_url: String(e.server_url ?? ""),
            description: String(e.description ?? ""),
            tags: Array.isArray(e.tags) ? (e.tags as string[]) : [],
            auth_type: e.auth_type != null ? String(e.auth_type) : null,
          })),
        );
      } else {
        setEntries([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDirectory();
  }, [fetchDirectory]);

  const handleSearch = () => {
    fetchDirectory(query.trim() || undefined);
  };

  const handleAdd = async (entry: RemoteMcpEntry) => {
    if (!workspaceId) return;
    setAddingId(entry.id);
    try {
      const result = await createMcpServer({
        server_label: entry.server_label,
        server_url: entry.server_url,
        local: false,
        server_description: entry.description || undefined,
      });
      if (result?.success) {
        onSuccess?.();
      }
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div>
      <div className="mb-3 flex gap-2">
        <Input
          placeholder="Search by name, description, or tag..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="max-w-sm"
        />
        <Button variant="secondary" size="icon" onClick={handleSearch}>
          <Search className="h-4 w-4" />
        </Button>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading directory...
        </div>
      ) : entries.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">
          No remote MCPs found. Try a different search.
        </p>
      ) : (
        <div className="grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {entries
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col gap-1 rounded-md border bg-background p-3 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{entry.name}</span>
                  {entry.auth_type && (
                    <span
                      className="rounded px-1.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground"
                      title={
                        entry.auth_type === "oauth"
                          ? "Use OAuth to connect"
                          : entry.auth_type === "bearer"
                            ? "Use a Bearer token (API key)"
                            : entry.auth_type === "both"
                              ? "OAuth or Bearer token"
                              : "Auth type"
                      }
                    >
                      {entry.auth_type === "oauth"
                        ? "OAuth"
                        : entry.auth_type === "bearer"
                          ? "Bearer"
                          : entry.auth_type === "both"
                            ? "OAuth / Bearer"
                            : entry.auth_type}
                    </span>
                  )}
                </div>
                <p className="line-clamp-2 text-muted-foreground h-10">
                  {entry.description || entry.server_url}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-1 w-fit"
                  onClick={() => handleAdd(entry)}
                  disabled={addingId !== null}
                >
                  {addingId === entry.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="mr-1 h-3 w-3" />
                      Add
                    </>
                  )}
                </Button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
