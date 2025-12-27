import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  getMaintenanceRequests,
  updateMaintenanceRequest,
  createMaintenanceRequest,
  getEquipment,
  getTeams,
} from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { StatusBadge, RequestTypeBadge } from '../components/StatusBadge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
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
import { Plus, AlertTriangle, User, Clock, Wrench } from 'lucide-react';
import { toast } from 'sonner';

const COLUMNS = [
  { id: 'new', title: 'New Request', color: 'border-t-blue-500' },
  { id: 'in_progress', title: 'In Progress', color: 'border-t-yellow-500' },
  { id: 'repaired', title: 'Repaired', color: 'border-t-green-500' },
  { id: 'scrap', title: 'Scrap', color: 'border-t-red-500' },
];

const KanbanCard = ({ request, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: request.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`p-4 rounded-md border border-white/10 bg-card/80 cursor-grab active:cursor-grabbing transition-all duration-150 hover:bg-card ${
        isDragging ? 'opacity-50 rotate-2 shadow-xl' : ''
      } ${request.is_overdue ? 'border-l-4 border-l-red-500' : ''}`}
      data-testid={`kanban-card-${request.id}`}
    >
      <div className="space-y-2">
        <p className="font-medium text-white text-sm">{request.subject}</p>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Wrench className="h-3 w-3" />
          <span className="truncate">{request.equipment_name}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RequestTypeBadge type={request.request_type} />
          {request.is_overdue && (
            <span className="inline-flex items-center gap-1 text-xs text-red-400">
              <AlertTriangle className="h-3 w-3" />
              Overdue
            </span>
          )}
        </div>
        {request.technician_name && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <User className="h-3 w-3" />
            <span>{request.technician_name}</span>
          </div>
        )}
        {request.duration_hours && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock className="h-3 w-3" />
            <span>{request.duration_hours}h spent</span>
          </div>
        )}
      </div>
    </div>
  );
};

const KanbanColumn = ({ column, requests, onCardClick }) => {
  return (
    <div
      className={`min-w-[300px] max-w-[300px] flex flex-col bg-white/5 rounded-lg border-t-4 ${column.color} border-white/5`}
      data-testid={`kanban-column-${column.id}`}
    >
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-semibold text-white">{column.title}</h3>
          <span className="px-2 py-0.5 bg-white/10 rounded-full text-xs font-mono text-slate-400">
            {requests.length}
          </span>
        </div>
      </div>
      <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-300px)]">
        <SortableContext items={requests.map((r) => r.id)} strategy={verticalListSortingStrategy}>
          {requests.map((request) => (
            <KanbanCard
              key={request.id}
              request={request}
              onClick={() => onCardClick(request)}
            />
          ))}
        </SortableContext>
        {requests.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-sm">No requests</div>
        )}
      </div>
    </div>
  );
};

export const Requests = () => {
  const [requests, setRequests] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [newRequest, setNewRequest] = useState({
    subject: '',
    equipment_id: '',
    request_type: 'corrective',
    description: '',
    scheduled_date: '',
  });
  const { isManager } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const params = {};
      const equipmentId = searchParams.get('equipment_id');
      const status = searchParams.get('status');
      if (equipmentId) params.equipment_id = equipmentId;
      if (status) params.status = status;

      const [requestsRes, equipmentRes, teamsRes] = await Promise.all([
        getMaintenanceRequests(params),
        getEquipment(),
        getTeams(),
      ]);
      setRequests(requestsRes.data);
      setEquipment(equipmentRes.data);
      setTeams(teamsRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeRequest = requests.find((r) => r.id === active.id);
    if (!activeRequest) return;

    // Find which column we dropped into
    let targetStatus = null;
    for (const column of COLUMNS) {
      const columnRequests = requests.filter((r) => r.status === column.id);
      if (column.id === over.id || columnRequests.some((r) => r.id === over.id)) {
        targetStatus = column.id;
        break;
      }
    }

    if (!targetStatus || targetStatus === activeRequest.status) return;

    try {
      await updateMaintenanceRequest(activeRequest.id, { status: targetStatus });
      
      if (targetStatus === 'scrap') {
        toast.success('Request moved to Scrap. Equipment marked as not usable.');
      } else {
        toast.success(`Request moved to ${COLUMNS.find((c) => c.id === targetStatus)?.title}`);
      }
      
      loadData();
    } catch (error) {
      toast.error('Failed to update request status');
    }
  };

  const handleDragOver = (event) => {
    const { over } = event;
    if (!over) return;
  };

  const handleCreate = async () => {
    if (!newRequest.subject || !newRequest.equipment_id) {
      toast.error('Please fill in required fields');
      return;
    }

    if (newRequest.request_type === 'preventive' && !isManager()) {
      toast.error('Only managers can create preventive requests');
      return;
    }

    try {
      await createMaintenanceRequest(newRequest);
      toast.success('Maintenance request created');
      setShowAddDialog(false);
      setNewRequest({
        subject: '',
        equipment_id: '',
        request_type: 'corrective',
        description: '',
        scheduled_date: '',
      });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create request');
    }
  };

  const handleCardClick = (request) => {
    setSelectedRequest(request);
    setShowDetailDialog(true);
  };

  const handleUpdateRequest = async (updates) => {
    try {
      await updateMaintenanceRequest(selectedRequest.id, updates);
      toast.success('Request updated');
      loadData();
      setShowDetailDialog(false);
    } catch (error) {
      toast.error('Failed to update request');
    }
  };

  const getColumnRequests = useCallback(
    (columnId) => requests.filter((r) => r.status === columnId),
    [requests]
  );

  const activeRequest = requests.find((r) => r.id === activeId);

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
      <div className="space-y-6" data-testid="requests-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-white tracking-tight uppercase">
              Maintenance Requests
            </h1>
            <p className="text-slate-400 mt-1">Drag and drop to update status</p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button data-testid="create-request-btn">
                <Plus className="h-4 w-4 mr-2" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Maintenance Request</DialogTitle>
                <DialogDescription>Report an issue or schedule maintenance</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Subject *</Label>
                  <Input
                    placeholder="Machine not starting"
                    value={newRequest.subject}
                    onChange={(e) => setNewRequest({ ...newRequest, subject: e.target.value })}
                    data-testid="request-subject-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Equipment *</Label>
                  <Select
                    value={newRequest.equipment_id}
                    onValueChange={(value) =>
                      setNewRequest({ ...newRequest, equipment_id: value })
                    }
                  >
                    <SelectTrigger data-testid="request-equipment-select">
                      <SelectValue placeholder="Select equipment" />
                    </SelectTrigger>
                    <SelectContent>
                      {equipment.filter(e => e.is_usable).map((eq) => (
                        <SelectItem key={eq.id} value={eq.id}>
                          {eq.name} ({eq.serial_number})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Request Type</Label>
                  <Select
                    value={newRequest.request_type}
                    onValueChange={(value) =>
                      setNewRequest({ ...newRequest, request_type: value })
                    }
                  >
                    <SelectTrigger data-testid="request-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corrective">Corrective (Breakdown)</SelectItem>
                      {isManager() && (
                        <SelectItem value="preventive">Preventive (Routine)</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {newRequest.request_type === 'preventive' && (
                  <div className="space-y-2">
                    <Label>Scheduled Date</Label>
                    <Input
                      type="date"
                      value={newRequest.scheduled_date}
                      onChange={(e) =>
                        setNewRequest({ ...newRequest, scheduled_date: e.target.value })
                      }
                      data-testid="request-scheduled-date-input"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Describe the issue..."
                    value={newRequest.description}
                    onChange={(e) =>
                      setNewRequest({ ...newRequest, description: e.target.value })
                    }
                    data-testid="request-description-input"
                  />
                </div>
                <Button onClick={handleCreate} className="w-full" data-testid="submit-request-btn">
                  Create Request
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Kanban Board */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
        >
          <div className="flex gap-6 overflow-x-auto pb-4" data-testid="kanban-board">
            {COLUMNS.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                requests={getColumnRequests(column.id)}
                onCardClick={handleCardClick}
              />
            ))}
          </div>
          <DragOverlay>
            {activeRequest && (
              <div className="p-4 rounded-md border border-white/10 bg-card shadow-2xl rotate-3">
                <p className="font-medium text-white text-sm">{activeRequest.subject}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {/* Request Detail Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedRequest?.subject}</DialogTitle>
              <DialogDescription>{selectedRequest?.equipment_name}</DialogDescription>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4 mt-4">
                <div className="flex items-center gap-2">
                  <StatusBadge status={selectedRequest.status} />
                  <RequestTypeBadge type={selectedRequest.request_type} />
                </div>
                
                <div className="space-y-2">
                  <Label>Team</Label>
                  <p className="text-sm text-slate-300">{selectedRequest.team_name}</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Assigned Technician</Label>
                  <p className="text-sm text-slate-300">
                    {selectedRequest.technician_name || 'Not assigned'}
                  </p>
                </div>

                {selectedRequest.description && (
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <p className="text-sm text-slate-300">{selectedRequest.description}</p>
                  </div>
                )}

                {selectedRequest.scheduled_date && (
                  <div className="space-y-2">
                    <Label>Scheduled Date</Label>
                    <p className="text-sm font-mono text-slate-300">
                      {new Date(selectedRequest.scheduled_date).toLocaleDateString()}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Duration (hours)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    placeholder="0"
                    defaultValue={selectedRequest.duration_hours || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        handleUpdateRequest({ duration_hours: value });
                      }
                    }}
                    data-testid="request-duration-input"
                  />
                </div>

                <div className="flex gap-2">
                  {selectedRequest.status === 'new' && (
                    <Button
                      onClick={() => handleUpdateRequest({ status: 'in_progress' })}
                      className="flex-1"
                      data-testid="start-progress-btn"
                    >
                      Start Progress
                    </Button>
                  )}
                  {selectedRequest.status === 'in_progress' && (
                    <Button
                      onClick={() => handleUpdateRequest({ status: 'repaired' })}
                      className="flex-1"
                      variant="default"
                      data-testid="mark-repaired-btn"
                    >
                      Mark Repaired
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};
