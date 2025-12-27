import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEquipment, createEquipment, deleteEquipment, getTeams } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { SmartButton } from '../components/SmartButton';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Settings, Plus, Search, MoreVertical, Trash2, Edit, Wrench, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export const Equipment = () => {
  const [equipment, setEquipment] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newEquipment, setNewEquipment] = useState({
    name: '',
    serial_number: '',
    department: '',
    location: '',
    default_team_id: '',
    purchase_date: '',
    warranty_info: '',
  });
  const { isManager } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [equipmentRes, teamsRes] = await Promise.all([getEquipment(), getTeams()]);
      setEquipment(equipmentRes.data);
      setTeams(teamsRes.data);
    } catch (error) {
      toast.error('Failed to load equipment');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newEquipment.name || !newEquipment.serial_number || !newEquipment.default_team_id) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      await createEquipment(newEquipment);
      toast.success('Equipment created successfully');
      setShowAddDialog(false);
      setNewEquipment({
        name: '',
        serial_number: '',
        department: '',
        location: '',
        default_team_id: '',
        purchase_date: '',
        warranty_info: '',
      });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create equipment');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this equipment?')) return;
    try {
      await deleteEquipment(id);
      toast.success('Equipment deleted');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete equipment');
    }
  };

  const filteredEquipment = equipment.filter(
    (eq) =>
      eq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.serial_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <div className="space-y-6" data-testid="equipment-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-white tracking-tight uppercase">
              Equipment
            </h1>
            <p className="text-slate-400 mt-1">Manage your asset inventory</p>
          </div>
          {isManager() && (
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button data-testid="add-equipment-btn">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Equipment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Equipment</DialogTitle>
                  <DialogDescription>Enter equipment details</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      placeholder="CNC Machine A1"
                      value={newEquipment.name}
                      onChange={(e) => setNewEquipment({ ...newEquipment, name: e.target.value })}
                      data-testid="equipment-name-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Serial Number *</Label>
                    <Input
                      placeholder="CNC-2024-001"
                      className="font-mono"
                      value={newEquipment.serial_number}
                      onChange={(e) =>
                        setNewEquipment({ ...newEquipment, serial_number: e.target.value })
                      }
                      data-testid="equipment-serial-input"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Department</Label>
                      <Input
                        placeholder="Production"
                        value={newEquipment.department}
                        onChange={(e) =>
                          setNewEquipment({ ...newEquipment, department: e.target.value })
                        }
                        data-testid="equipment-department-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input
                        placeholder="Building A"
                        value={newEquipment.location}
                        onChange={(e) =>
                          setNewEquipment({ ...newEquipment, location: e.target.value })
                        }
                        data-testid="equipment-location-input"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Default Team *</Label>
                    <Select
                      value={newEquipment.default_team_id}
                      onValueChange={(value) =>
                        setNewEquipment({ ...newEquipment, default_team_id: value })
                      }
                    >
                      <SelectTrigger data-testid="equipment-team-select">
                        <SelectValue placeholder="Select team" />
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Purchase Date</Label>
                      <Input
                        type="date"
                        value={newEquipment.purchase_date}
                        onChange={(e) =>
                          setNewEquipment({ ...newEquipment, purchase_date: e.target.value })
                        }
                        data-testid="equipment-purchase-date-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Warranty Info</Label>
                      <Input
                        placeholder="Valid until..."
                        value={newEquipment.warranty_info}
                        onChange={(e) =>
                          setNewEquipment({ ...newEquipment, warranty_info: e.target.value })
                        }
                        data-testid="equipment-warranty-input"
                      />
                    </div>
                  </div>
                  <Button onClick={handleCreate} className="w-full" data-testid="create-equipment-btn">
                    Create Equipment
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search equipment..."
            className="pl-10 font-mono"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="equipment-search"
          />
        </div>

        {/* Equipment Grid */}
        {filteredEquipment.length === 0 ? (
          <Card className="border-white/10 bg-card/50">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Settings className="h-12 w-12 text-slate-500 mb-4" />
              <p className="text-slate-400">No equipment found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEquipment.map((eq) => (
              <Card
                key={eq.id}
                className={`border-white/10 bg-card/50 hover:bg-card/70 transition-colors cursor-pointer ${
                  !eq.is_usable ? 'border-l-4 border-l-red-500 opacity-70' : ''
                }`}
                onClick={() => navigate(`/equipment/${eq.id}`)}
                data-testid={`equipment-card-${eq.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-white text-lg truncate">{eq.name}</CardTitle>
                      <p className="text-xs font-mono text-slate-500 mt-1">{eq.serial_number}</p>
                    </div>
                    {isManager() && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/equipment/${eq.id}`);
                          }}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(eq.id);
                            }}
                            className="text-red-400"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2 text-xs">
                    {eq.department && (
                      <span className="px-2 py-1 bg-white/5 rounded text-slate-400">
                        {eq.department}
                      </span>
                    )}
                    {eq.location && (
                      <span className="px-2 py-1 bg-white/5 rounded text-slate-400">
                        {eq.location}
                      </span>
                    )}
                  </div>

                  {!eq.is_usable && (
                    <div className="flex items-center gap-2 text-red-400 text-xs">
                      <AlertCircle className="h-3 w-3" />
                      <span>Not Usable (Scrapped)</span>
                    </div>
                  )}

                  {/* Smart Button for Maintenance Count */}
                  <SmartButton
                    icon={Wrench}
                    count={eq.maintenance_count}
                    label="Maintenance"
                    variant={eq.maintenance_count > 0 ? 'warning' : 'default'}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/requests?equipment_id=${eq.id}`);
                    }}
                    className="h-16"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};
