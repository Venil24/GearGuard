import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEquipmentById, updateEquipment, getTeams, getUsers, getMaintenanceRequests } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { SmartButton } from '../components/SmartButton';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { ArrowLeft, Save, Wrench, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export const EquipmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState(null);
  const [teams, setTeams] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { isManager } = useAuth();

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [equipmentRes, teamsRes, usersRes, requestsRes] = await Promise.all([
        getEquipmentById(id),
        getTeams(),
        getUsers({ role: 'technician' }),
        getMaintenanceRequests({ equipment_id: id }),
      ]);
      setEquipment(equipmentRes.data);
      setTeams(teamsRes.data);
      setTechnicians(usersRes.data);
      setRequests(requestsRes.data);
    } catch (error) {
      toast.error('Failed to load equipment');
      navigate('/equipment');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateEquipment(id, equipment);
      toast.success('Equipment updated');
    } catch (error) {
      toast.error('Failed to update equipment');
    } finally {
      setSaving(false);
    }
  };

  const getStatusCounts = () => {
    const counts = { new: 0, in_progress: 0, repaired: 0, overdue: 0 };
    requests.forEach((req) => {
      if (counts[req.status] !== undefined) {
        counts[req.status]++;
      }
      if (req.is_overdue) {
        counts.overdue++;
      }
    });
    return counts;
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

  if (!equipment) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-slate-400">Equipment not found</p>
        </div>
      </Layout>
    );
  }

  const statusCounts = getStatusCounts();

  return (
    <Layout>
      <div className="space-y-6" data-testid="equipment-detail-page">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/equipment')}
            data-testid="back-btn"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-white tracking-tight">
              {equipment.name}
            </h1>
            <p className="text-slate-400 font-mono">{equipment.serial_number}</p>
          </div>
          {!equipment.is_usable && (
            <span className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/20 rounded-full text-sm">
              Scrapped
            </span>
          )}
        </div>

        {/* Smart Buttons - Maintenance Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SmartButton
            icon={Wrench}
            count={statusCounts.new}
            label="New Requests"
            variant="info"
            onClick={() => navigate(`/requests?equipment_id=${id}&status=new`)}
          />
          <SmartButton
            icon={Clock}
            count={statusCounts.in_progress}
            label="In Progress"
            variant="warning"
            onClick={() => navigate(`/requests?equipment_id=${id}&status=in_progress`)}
          />
          <SmartButton
            icon={CheckCircle}
            count={statusCounts.repaired}
            label="Repaired"
            variant="success"
            onClick={() => navigate(`/requests?equipment_id=${id}&status=repaired`)}
          />
          <SmartButton
            icon={AlertTriangle}
            count={statusCounts.overdue}
            label="Overdue"
            variant="danger"
            onClick={() => navigate(`/requests?equipment_id=${id}`)}
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Equipment Details */}
          <Card className="border-white/10 bg-card/50">
            <CardHeader>
              <CardTitle className="text-white">Equipment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={equipment.name}
                  onChange={(e) => setEquipment({ ...equipment, name: e.target.value })}
                  disabled={!isManager()}
                  data-testid="equipment-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Serial Number</Label>
                <Input
                  value={equipment.serial_number}
                  onChange={(e) => setEquipment({ ...equipment, serial_number: e.target.value })}
                  disabled={!isManager()}
                  className="font-mono"
                  data-testid="equipment-serial"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input
                    value={equipment.department || ''}
                    onChange={(e) => setEquipment({ ...equipment, department: e.target.value })}
                    disabled={!isManager()}
                    data-testid="equipment-department"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    value={equipment.location || ''}
                    onChange={(e) => setEquipment({ ...equipment, location: e.target.value })}
                    disabled={!isManager()}
                    data-testid="equipment-location"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Default Maintenance Team</Label>
                <Select
                  value={equipment.default_team_id}
                  onValueChange={(value) => setEquipment({ ...equipment, default_team_id: value })}
                  disabled={!isManager()}
                >
                  <SelectTrigger data-testid="equipment-team-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Default Technician</Label>
                <Select
                  value={equipment.default_technician_id || ''}
                  onValueChange={(value) =>
                    setEquipment({ ...equipment, default_technician_id: value || null })
                  }
                  disabled={!isManager()}
                >
                  <SelectTrigger data-testid="equipment-technician-select">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {technicians
                      .filter((t) => t.team_id === equipment.default_team_id)
                      .map((tech) => (
                        <SelectItem key={tech.id} value={tech.id}>
                          {tech.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Purchase Date</Label>
                  <Input
                    type="date"
                    value={equipment.purchase_date || ''}
                    onChange={(e) => setEquipment({ ...equipment, purchase_date: e.target.value })}
                    disabled={!isManager()}
                    data-testid="equipment-purchase-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Warranty Info</Label>
                  <Input
                    value={equipment.warranty_info || ''}
                    onChange={(e) => setEquipment({ ...equipment, warranty_info: e.target.value })}
                    disabled={!isManager()}
                    data-testid="equipment-warranty"
                  />
                </div>
              </div>
              {isManager() && (
                <Button onClick={handleSave} disabled={saving} className="w-full" data-testid="save-equipment-btn">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Maintenance History */}
          <Card className="border-white/10 bg-card/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Wrench className="h-5 w-5 text-emerald-400" />
                Maintenance History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <p className="text-slate-400 text-sm">No maintenance requests yet</p>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {requests.map((request) => (
                    <div
                      key={request.id}
                      onClick={() => navigate(`/requests?equipment_id=${id}`)}
                      className={`p-3 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors ${
                        request.is_overdue ? 'border-l-4 border-l-red-500' : ''
                      }`}
                      data-testid={`history-item-${request.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-white text-sm">{request.subject}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {new Date(request.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <StatusBadge status={request.status} />
                      </div>
                      {request.is_overdue && (
                        <span className="inline-flex items-center gap-1 text-xs text-red-400 mt-2">
                          <AlertTriangle className="h-3 w-3" />
                          Overdue
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};
