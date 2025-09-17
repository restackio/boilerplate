"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Button } from "@workspace/ui/components/ui/button";
import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import { Textarea } from "@workspace/ui/components/ui/textarea";
// Card components not currently used but available for future UI improvements

import { Trash2, RefreshCw } from "lucide-react";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { Team } from "@/hooks/use-workspace-scoped-actions";
import { LucideIconPicker } from "@workspace/ui/components/lucide-icon-picker";

export default function TeamSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params.teamId as string;
  
  const { getTeamById, updateTeam, deleteTeam, teamsLoading } = useWorkspaceScopedActions();
  void teamsLoading; // Suppress unused warning
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [_deleting, setDeleting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "Building",
  });


  useEffect(() => {
    const fetchTeam = async () => {
      if (teamId) {
        setLoading(true);
        const result = await getTeamById(teamId);
        if (result.success && result.data) {
          setTeam(result.data);
          setFormData({
            name: result.data.name,
            description: result.data.description || "",
            icon: result.data.icon || "Building",
          });
        } else {
          console.error("Failed to fetch team:", result.error);
        }
        setLoading(false);
      }
    };

    fetchTeam();
  }, [teamId, getTeamById]);

  const handleSave = async () => {
    if (!team) return;
    
    setSaving(true);
    const result = await updateTeam(team.id, formData);
    if (result.success && result.data) {
      setTeam(result.data);
    } else {
      console.error("Failed to update team:", result.error);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!team || !confirm("Are you sure you want to delete this team? This action cannot be undone.")) {
      return;
    }
    
    setDeleting(true);
    const result = await deleteTeam(team.id);
    if (result.success) {
      router.push("/teams/settings");
    } else {
      console.error("Failed to delete team:", result.error);
    }
    setDeleting(false);
  };

  const handleBack = () => {
    router.push("/teams/settings");
  };

  const breadcrumbs = [
    { label: "Teams", href: "/teams" },
    { label: "Settings", href: "/teams/settings" },
    { label: team?.name || "Loading..." },
  ];

  const actions = (
    <div className="flex gap-2">
      <Button 
        size="sm" 
        variant="ghost" 
        onClick={handleDelete}
      >
        <Trash2 className="h-4 w-4 mr-1" />
      </Button>
      <Button 
        size="sm" 
        onClick={handleSave}
        disabled={saving || loading}
      >
        {saving ? "Saving..." : "Save"}
      </Button>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader breadcrumbs={breadcrumbs} actions={actions} />
        <div className="px-4">
          <div className="text-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">Loading team...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="space-y-6">
        <PageHeader breadcrumbs={breadcrumbs} actions={actions} />
        <div className="px-4">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Team not found</p>
            <Button onClick={handleBack} className="mt-2">
              Back to Teams
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader breadcrumbs={breadcrumbs} actions={actions} />
      
      <div className="px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Team settings</h1>
          <p className="text-muted-foreground">Edit team information and configuration</p>
        </div>

        <div className="max-w-2xl space-y-6">


              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter team name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter team description"
                  rows={3}
                />
              </div>
              
              <LucideIconPicker
                label="Icon"
                value={formData.icon}
                onValueChange={(iconName) => setFormData(prev => ({ ...prev, icon: iconName }))}
                placeholder="Choose an icon for your team"
              />
        </div>
      </div>
    </div>
  );
} 