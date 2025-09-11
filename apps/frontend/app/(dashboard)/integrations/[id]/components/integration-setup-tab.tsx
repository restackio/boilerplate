"use client";

import { useState } from "react";
import { Badge } from "@workspace/ui/components/ui/badge";
import { Button } from "@workspace/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/ui/card";
import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { Switch } from "@workspace/ui/components/ui/switch";
import {
  Settings,
  Globe,
  Server,
  Edit,
  Save,
  X,
  ExternalLink,
} from "lucide-react";
import { McpServer } from "../../../../../hooks/use-workspace-scoped-actions";

interface IntegrationSetupTabProps {
  server: McpServer;
}

export function IntegrationSetupTab({ server }: IntegrationSetupTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    server_label: server.server_label,
    server_url: server.server_url || "",
    server_description: server.server_description || "",
    local: server.local,
  });

  const handleSave = async () => {
    // TODO: Implement save functionality
    console.log("Saving:", formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      server_label: server.server_label,
      server_url: server.server_url || "",
      server_description: server.server_description || "",
      local: server.local,
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Basic Information
          </CardTitle>
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="server_label">Integration Name</Label>
              {isEditing ? (
                <Input
                  id="server_label"
                  value={formData.server_label}
                  onChange={(e) => setFormData({ ...formData, server_label: e.target.value })}
                />
              ) : (
                <div className="p-2 bg-muted rounded-md">{server.server_label}</div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="local">Integration Type</Label>
              <div className="flex items-center space-x-2">
                {isEditing ? (
                  <>
                    <Switch
                      id="local"
                      checked={formData.local}
                      onCheckedChange={(checked) => setFormData({ ...formData, local: checked })}
                    />
                    <Label htmlFor="local">{formData.local ? "Local" : "Remote"}</Label>
                  </>
                ) : (
                  <Badge variant={server.local ? "secondary" : "default"}>
                    {server.local ? "Local" : "Remote"}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {!formData.local && (
            <div className="space-y-2">
              <Label htmlFor="server_url">Server URL</Label>
              {isEditing ? (
                <Input
                  id="server_url"
                  type="url"
                  value={formData.server_url}
                  onChange={(e) => setFormData({ ...formData, server_url: e.target.value })}
                  placeholder="https://example.com/mcp"
                />
              ) : (
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                  <Globe className="h-4 w-4" />
                  <span className="flex-1">{server.server_url}</span>
                  {server.server_url && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={server.server_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="server_description">Description</Label>
            {isEditing ? (
              <Textarea
                id="server_description"
                value={formData.server_description}
                onChange={(e) => setFormData({ ...formData, server_description: e.target.value })}
                placeholder="Describe what this integration does..."
                rows={3}
              />
            ) : (
              <div className="p-2 bg-muted rounded-md min-h-[80px]">
                {server.server_description || "No description provided"}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                <div>
                  <div className="font-medium">Server Connection</div>
                  <div className="text-sm text-muted-foreground">
                    {server.local ? "Local server running" : "Remote server accessible"}
                  </div>
                </div>
              </div>
              <Badge variant="default" className="text-xs">Active</Badge>
            </div>

            {server.created_at && (
              <div className="text-sm text-muted-foreground">
                Created: {new Date(server.created_at).toLocaleDateString()}
              </div>
            )}
            {server.updated_at && (
              <div className="text-sm text-muted-foreground">
                Last updated: {new Date(server.updated_at).toLocaleDateString()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
