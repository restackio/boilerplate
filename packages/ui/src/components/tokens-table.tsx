"use client";

import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { DataTableFilter } from "./table/index";
import { createColumnConfigHelper } from "./table/core/filters";
import { useDataTableFilters } from "./table/hooks/use-data-table-filters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { EmptyState } from "./ui/empty-state";
import {
  Key,
  Shield,
  Calendar,
  CheckCircle,
  AlertCircle,
  Trash2,
  Plus,
  Star,
  StarOff,
} from "lucide-react";

export interface TokenData {
  id: string;
  user_id: string;
  workspace_id: string;
  mcp_server_id: string;
  auth_type: string;
  token_type: string;
  expires_at: string | null;
  scope: string[] | null;
  connected_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  is_default: boolean;
}

interface TokensTableProps {
  data: TokenData[];
  onDeleteToken?: (tokenId: string) => void;
  onMakeDefault?: (tokenId: string) => void;
  onAddOAuth?: () => void;
  onAddBearerToken?: () => void;
  isLoading?: boolean;
}

// Column configuration helper
const dtf = createColumnConfigHelper<TokenData>();

// Column configurations
export const tokenColumnsConfig = [
  dtf
    .text()
    .id("auth_type")
    .accessor((row: TokenData) => row.auth_type)
    .displayName("Type")
    .icon(Key)
    .build(),
  dtf
    .text()
    .id("status")
    .accessor((row: TokenData) => {
      if (row.expires_at) {
        const expiresAt = new Date(row.expires_at);
        const now = new Date();
        return expiresAt < now ? "Expired" : "Active";
      }
      return "Active";
    })
    .displayName("Status")
    .icon(CheckCircle)
    .build(),
  dtf
    .text()
    .id("connected_at")
    .accessor((row: TokenData) => 
      row.connected_at ? new Date(row.connected_at).toLocaleDateString() : "Unknown"
    )
    .displayName("Connected")
    .icon(Calendar)
    .build(),
  dtf
    .text()
    .id("expires_at")
    .accessor((row: TokenData) => 
      row.expires_at ? new Date(row.expires_at).toLocaleDateString() : "Never"
    )
    .displayName("Expires")
    .icon(Calendar)
    .build(),
] as const;

// Token type badges
const getAuthTypeBadge = (authType: string) => {
  switch (authType) {
    case "oauth":
      return <Badge variant="default" className="text-xs">OAuth</Badge>;
    case "bearer":
      return <Badge variant="secondary" className="text-xs">Bearer</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{authType}</Badge>;
  }
};

// Status badges
const getStatusBadge = (token: TokenData) => {
  if (token.expires_at) {
    const expiresAt = new Date(token.expires_at);
    const now = new Date();
    if (expiresAt < now) {
      return <Badge variant="destructive" className="text-xs flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        Expired
      </Badge>;
    }
  }
  return <Badge variant="default" className="text-xs flex items-center gap-1">
    <CheckCircle className="h-3 w-3" />
    Active
  </Badge>;
};

// Default badge
const getDefaultBadge = (isDefault: boolean) => {
  if (isDefault) {
    return <Badge variant="default" className="text-xs flex items-center gap-1 bg-yellow-100 text-yellow-800 border-yellow-300">
      <Star className="h-3 w-3 fill-current" />
      Default
    </Badge>;
  }
  return null;
};

export function TokensTable({ 
  data, 
  onDeleteToken,
  onMakeDefault,
  onAddOAuth,
  onAddBearerToken,
  isLoading = false
}: TokensTableProps) {

  // Create data table filters instance
  const { columns, filters, actions, strategy, filteredData } =
    useDataTableFilters({
      strategy: "client",
      data,
      columnsConfig: tokenColumnsConfig,
    });

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show empty state if no data
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Key className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No tokens found</h3>
        <p className="text-muted-foreground mb-4 max-w-md">
          Connect to this integration using OAuth or add a Bearer token to get started.
        </p>
        <div className="flex gap-2">
          {onAddOAuth && (
            <Button onClick={onAddOAuth}>
              <Shield className="h-4 w-4 mr-2" />
              Connect with OAuth
            </Button>
          )}
          {onAddBearerToken && (
            <Button variant="outline" onClick={onAddBearerToken}>
              <Key className="h-4 w-4 mr-2" />
              Add Bearer Token
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <DataTableFilter
          filters={filters}
          columns={columns}
          actions={actions}
          strategy={strategy}
        />
        
        <div className="flex gap-2 shrink-0">
          {onAddOAuth && (
            <Button onClick={onAddOAuth} size="sm">
              <Shield className="h-4 w-4 mr-2" />
              Connect with OAuth
            </Button>
          )}
          {onAddBearerToken && (
            <Button variant="outline" onClick={onAddBearerToken} size="sm">
              <Key className="h-4 w-4 mr-2" />
              Add Bearer Token
            </Button>
          )}
        </div>
      </div>

      <div className="w-full overflow-hidden">
        <div className="rounded-md border overflow-x-auto max-w-full">
          <Table className="w-full" style={{ tableLayout: 'fixed' }}>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/7">Type</TableHead>
                <TableHead className="w-1/7">Status</TableHead>
                <TableHead className="w-1/7">Default</TableHead>
                <TableHead className="hidden sm:table-cell w-1/7">Connected</TableHead>
                <TableHead className="hidden md:table-cell w-1/7">Expires</TableHead>
                <TableHead className="hidden lg:table-cell w-2/7">Scope</TableHead>
                <TableHead className="w-1/7">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((token) => {
                return (
                  <TableRow key={token.id}>
                    <TableCell>
                      <div className="space-y-1">
                        {getAuthTypeBadge(token.auth_type)}
                        {/* Show additional info on mobile when columns are hidden */}
                        <div className="sm:hidden flex flex-col gap-1 mt-2 text-xs">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>Connected: {token.connected_at 
                              ? new Date(token.connected_at).toLocaleDateString()
                              : "Unknown"
                            }</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>Expires: {token.expires_at 
                              ? new Date(token.expires_at).toLocaleDateString()
                              : "Never"
                            }</span>
                          </div>
                          {token.is_default && (
                            <div className="flex items-center gap-2">
                              {getDefaultBadge(token.is_default)}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(token)}
                    </TableCell>
                    <TableCell>
                      {getDefaultBadge(token.is_default)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {token.connected_at 
                          ? new Date(token.connected_at).toLocaleDateString()
                          : "Unknown"
                        }
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {token.expires_at ? (
                        <div className="text-sm text-muted-foreground">
                          {new Date(token.expires_at).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {token.scope && token.scope.length > 0 ? (
                          token.scope.map((scope, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {scope}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">No scope</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {!token.is_default && onMakeDefault && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onMakeDefault(token.id)}
                            className="text-muted-foreground hover:text-foreground"
                            title="Make this token the default"
                          >
                            <StarOff className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteToken?.(token.id)}
                          className="text-destructive hover:text-destructive"
                          title="Delete token"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

