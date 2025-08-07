"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Button } from "@workspace/ui/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { useWorkspaceScopedActions } from "@/hooks/use-workspace-scoped-actions";

import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { Building, Users, Briefcase, Target, Zap, Shield, Globe } from "lucide-react";

export default function TeamsSettingsPage() {
  const router = useRouter();
  const { teams, teamsLoading, fetchTeams, createTeam } = useWorkspaceScopedActions();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createFormData, setCreateFormData] = useState({
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
    fetchTeams();
  }, [fetchTeams]);

  const handleTeamClick = (teamId: string) => {
    router.push(`/teams/${teamId}/settings`);
  };

  const handleRefresh = () => {
    fetchTeams();
  };

  const handleCreateTeam = () => {
    setShowCreateForm(true);
  };

  const handleSubmitCreateTeam = async () => {
    if (!createFormData.name.trim()) {
      alert("Team name is required");
      return;
    }

    setCreating(true);
    const result = await createTeam({
      name: createFormData.name.trim(),
      description: createFormData.description.trim() || undefined,
      icon: createFormData.icon,
    });

    if (result.success) {
      setShowCreateForm(false);
      setCreateFormData({ name: "", description: "", icon: "Building" });
      await fetchTeams();
    } else {
      alert(`Failed to create team: ${result.error}`);
    }
    setCreating(false);
  };

  const handleCancelCreate = () => {
    setShowCreateForm(false);
    setCreateFormData({ name: "", description: "", icon: "Building" });
  };

  const breadcrumbs = [{ label: "Teams", href: "/teams" }, { label: "Settings" }];

  const actions = (
    <div className="flex gap-2">
      <Button 
        size="sm" 
        variant="outline" 
        onClick={handleRefresh}
        disabled={teamsLoading.isLoading}
      >
        <RefreshCw className={`h-4 w-4 mr-1 ${teamsLoading.isLoading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
      <Button size="sm" onClick={handleCreateTeam}>
        <Plus className="h-4 w-4 mr-1" />
        Create Team
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={breadcrumbs}
        actions={actions}
      />
      
      <div className="px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Team Settings</h1>
          <p className="text-muted-foreground">Manage your teams and their configurations</p>
        </div>

      <div className="bg-card rounded-lg border">
        <div className="p-6">
          <div className="space-y-4">
            {teamsLoading.isLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">Loading teams...</p>
              </div>
            ) : teams.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No teams found</p>
                <Button onClick={handleCreateTeam}>
                  <Plus className="h-4 w-4 mr-1" />
                  Create your first team
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleTeamClick(team.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {team.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-medium">{team.name}</h3>
                        {team.description && (
                          <p className="text-sm text-muted-foreground">{team.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Created {new Date(team.created_at || '').toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* Create team modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card border rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Create New Team</h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">Team Name</Label>
                <Input
                  id="create-name"
                  value={createFormData.name}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter team name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="create-description">Description</Label>
                <Textarea
                  id="create-description"
                  value={createFormData.description}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, description: e.target.value }))}
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
                      onClick={() => setCreateFormData(prev => ({ ...prev, icon: icon.name }))}
                      className={`p-3 border rounded-lg hover:bg-muted transition-colors ${
                        createFormData.icon === icon.name ? 'border-primary bg-primary/10' : 'border-border'
                      }`}
                    >
                      <icon.component className="h-5 w-5" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 justify-end mt-6">
              <Button variant="outline" onClick={handleCancelCreate} disabled={creating}>
                Cancel
              </Button>
              <Button onClick={handleSubmitCreateTeam} disabled={creating}>
                {creating ? "Creating..." : "Create Team"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 