"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Button } from "@workspace/ui/components/ui/button";
import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/ui/card";
import { Separator } from "@workspace/ui/components/ui/separator";
import { ArrowLeft, Save, Trash2, RefreshCw, Building, Users, Briefcase, Target, Zap, Shield, Globe } from "lucide-react";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";
import { Team } from "@/hooks/use-workspace-scoped-actions";

export default function TeamSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params.teamId as string;
  
  const { getTeamById, updateTeam, deleteTeam, teamsLoading } = useWorkspaceScopedActions();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "Building",
  });

  const availableIcons = [
    { name: "Building", component: Building },
    { name: "Users", component: Users },
    { name: "Briefcase", component: Briefcase },
    { name: "Target", component: Target },
    { name: "Zap", component: Zap },
    { name: "Shield", component: Shield },
    { name: "Globe", component: Globe },
  ];

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
        variant="outline" 
        onClick={handleBack}
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back
      </Button>
      <Button 
        size="sm" 
        onClick={handleSave}
        disabled={saving || loading}
      >
        <Save className="h-4 w-4 mr-1" />
        {saving ? "Saving..." : "Save Changes"}
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
          <h1 className="text-2xl font-semibold">Team Settings</h1>
          <p className="text-muted-foreground">Edit team information and configuration</p>
        </div>

        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Information</CardTitle>
              <CardDescription>
                Update your team's name and description
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Team Name</Label>
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
              
              <div className="space-y-2">
                <Label>Team Icon</Label>
                <div className="grid grid-cols-7 gap-2">
                  {availableIcons.map((icon) => (
                    <button
                      key={icon.name}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, icon: icon.name }))}
                      className={`p-3 border rounded-lg hover:bg-muted transition-colors ${
                        formData.icon === icon.name ? 'border-primary bg-primary/10' : 'border-border'
                      }`}
                    >
                      <icon.component className="h-5 w-5" />
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg">
                <div>
                  <h3 className="font-medium text-destructive">Delete Team</h3>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete this team and all associated data
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {deleting ? "Deleting..." : "Delete Team"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 