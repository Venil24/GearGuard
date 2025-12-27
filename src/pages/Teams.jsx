import React, { useState, useEffect } from 'react';
import { getTeams, createTeam, getUsers, addTeamMember, removeTeamMember } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Users, Plus, User, UserMinus } from 'lucide-react';
import { toast } from 'sonner';

export const Teams = () => {
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showMemberDialog, setShowMemberDialog] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [newTeam, setNewTeam] = useState({ name: '', description: '' });
  const [selectedUserId, setSelectedUserId] = useState('');
  const { isManager } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [teamsRes, usersRes] = await Promise.all([
        getTeams(),
        getUsers({ role: 'technician' }),
      ]);
      setTeams(teamsRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      toast.error('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newTeam.name) {
      toast.error('Please enter team name');
      return;
    }

    try {
      await createTeam(newTeam);
      toast.success('Team created successfully');
      setShowAddDialog(false);
      setNewTeam({ name: '', description: '' });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create team');
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserId) {
      toast.error('Please select a technician');
      return;
    }

    try {
      await addTeamMember(selectedTeam.id, selectedUserId);
      toast.success('Member added to team');
      setSelectedUserId('');
      loadData();
    } catch (error) {
      toast.error('Failed to add member');
    }
  };

  const handleRemoveMember = async (teamId, userId) => {
    if (!window.confirm('Remove this member from the team?')) return;
    try {
      await removeTeamMember(teamId, userId);
      toast.success('Member removed from team');
      loadData();
    } catch (error) {
      toast.error('Failed to remove member');
    }
  };

  const getTeamMembers = (team) => {
    return users.filter((u) => u.team_id === team.id);
  };

  const getAvailableTechnicians = () => {
    return users.filter((u) => !u.team_id || u.team_id !== selectedTeam?.id);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6" data-testid="teams-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-white tracking-tight uppercase">
              Maintenance Teams
            </h1>
            <p className="text-slate-400 mt-1">Manage teams and technicians</p>
          </div>
          {isManager() && (
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button data-testid="create-team-btn">
                  <Plus className="h-4 w-4 mr-2" />
                  New Team
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Team</DialogTitle>
                  <DialogDescription>Add a maintenance team</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Team Name *</Label>
                    <Input
                      placeholder="Mechanical Team"
                      value={newTeam.name}
                      onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                      data-testid="team-name-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      placeholder="Handles mechanical equipment"
                      value={newTeam.description}
                      onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                      data-testid="team-description-input"
                    />
                  </div>
                  <Button onClick={handleCreate} className="w-full" data-testid="submit-team-btn">
                    Create Team
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Teams Grid */}
        {teams.length === 0 ? (
          <Card className="border-white/10 bg-card/50">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-slate-500 mb-4" />
              <p className="text-slate-400">No teams created yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => {
              const members = getTeamMembers(team);
              return (
                <Card
                  key={team.id}
                  className="border-white/10 bg-card/50"
                  data-testid={`team-card-${team.id}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-white flex items-center gap-2">
                          <Users className="h-5 w-5 text-emerald-400" />
                          {team.name}
                        </CardTitle>
                        {team.description && (
                          <p className="text-sm text-slate-400 mt-1">{team.description}</p>
                        )}
                      </div>
                      <span className="px-2 py-0.5 bg-white/10 rounded-full text-xs font-mono text-slate-400">
                        {members.length} members
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Team Members */}
                    <div className="space-y-2">
                      {members.length === 0 ? (
                        <p className="text-sm text-slate-500">No technicians assigned</p>
                      ) : (
                        members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-2 rounded bg-white/5"
                            data-testid={`team-member-${member.id}`}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                <span className="text-emerald-400 font-semibold text-xs">
                                  {member.name?.charAt(0)?.toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm text-white">{member.name}</p>
                                <p className="text-xs text-slate-500">{member.email}</p>
                              </div>
                            </div>
                            {isManager() && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-400 hover:text-red-400"
                                onClick={() => handleRemoveMember(team.id, member.id)}
                                data-testid={`remove-member-${member.id}`}
                              >
                                <UserMinus className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add Member Button */}
                    {isManager() && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setSelectedTeam(team);
                          setShowMemberDialog(true);
                        }}
                        data-testid={`add-member-to-${team.id}-btn`}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Technician
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Add Member Dialog */}
        <Dialog open={showMemberDialog} onOpenChange={setShowMemberDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Technician to {selectedTeam?.name}</DialogTitle>
              <DialogDescription>Select a technician to add to this team</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Technician</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger data-testid="select-technician">
                    <SelectValue placeholder="Select technician" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableTechnicians().map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddMember} className="w-full" data-testid="confirm-add-member-btn">
                Add to Team
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};
