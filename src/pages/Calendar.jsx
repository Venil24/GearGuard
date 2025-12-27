import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMaintenanceRequests, createMaintenanceRequest, getEquipment } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Calendar as CalendarComponent } from '../components/ui/calendar';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { toast } from 'sonner';

export const CalendarPage = () => {
  const [requests, setRequests] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newRequest, setNewRequest] = useState({
    subject: '',
    equipment_id: '',
    description: '',
    scheduled_date: '',
  });
  const { isManager } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [requestsRes, equipmentRes] = await Promise.all([
        getMaintenanceRequests({ request_type: 'preventive' }),
        getEquipment(),
      ]);
      setRequests(requestsRes.data);
      setEquipment(equipmentRes.data);
    } catch (error) {
      toast.error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = (date) => {
    if (!isManager()) return;
    setSelectedDate(date);
    setNewRequest({
      ...newRequest,
      scheduled_date: format(date, 'yyyy-MM-dd'),
    });
    setShowAddDialog(true);
  };

  const handleCreate = async () => {
    if (!newRequest.subject || !newRequest.equipment_id) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      await createMaintenanceRequest({
        ...newRequest,
        request_type: 'preventive',
      });
      toast.success('Preventive maintenance scheduled');
      setShowAddDialog(false);
      setNewRequest({
        subject: '',
        equipment_id: '',
        description: '',
        scheduled_date: '',
      });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create request');
    }
  };

  const getEventsForDate = (date) => {
    return requests.filter((req) => {
      if (!req.scheduled_date) return false;
      const scheduledDate = new Date(req.scheduled_date);
      return isSameDay(scheduledDate, date);
    });
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get days to fill the calendar grid
  const startDay = monthStart.getDay();
  const prevMonthDays = [];
  for (let i = startDay - 1; i >= 0; i--) {
    prevMonthDays.push(new Date(monthStart.getTime() - (i + 1) * 24 * 60 * 60 * 1000));
  }

  const endDay = monthEnd.getDay();
  const nextMonthDays = [];
  for (let i = 1; i <= 6 - endDay; i++) {
    nextMonthDays.push(new Date(monthEnd.getTime() + i * 24 * 60 * 60 * 1000));
  }

  const allDays = [...prevMonthDays, ...monthDays, ...nextMonthDays];

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
      <div className="space-y-6" data-testid="calendar-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-white tracking-tight uppercase">
              Maintenance Calendar
            </h1>
            <p className="text-slate-400 mt-1">Scheduled preventive maintenance</p>
          </div>
          {isManager() && (
            <Button onClick={() => setShowAddDialog(true)} data-testid="schedule-maintenance-btn">
              <Plus className="h-4 w-4 mr-2" />
              Schedule Maintenance
            </Button>
          )}
        </div>

        {/* Calendar */}
        <Card className="border-white/10 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                data-testid="prev-month-btn"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <CardTitle className="text-white font-mono">
                {format(currentMonth, 'MMMM yyyy')}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                data-testid="next-month-btn"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-mono uppercase tracking-wider text-slate-500 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {allDays.map((date, index) => {
                const events = getEventsForDate(date);
                const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                const isToday = isSameDay(date, new Date());

                return (
                  <div
                    key={index}
                    onClick={() => handleDateClick(date)}
                    className={`min-h-[100px] p-2 rounded-md border transition-colors ${
                      isCurrentMonth
                        ? 'bg-white/5 border-white/10 hover:bg-white/10 cursor-pointer'
                        : 'bg-white/2 border-white/5 opacity-50'
                    } ${isToday ? 'ring-2 ring-emerald-500' : ''}`}
                    data-testid={`calendar-day-${format(date, 'yyyy-MM-dd')}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-sm font-mono ${
                          isToday ? 'text-emerald-400 font-bold' : 'text-slate-400'
                        }`}
                      >
                        {date.getDate()}
                      </span>
                      {events.length > 0 && (
                        <span className="px-1.5 py-0.5 bg-blue-500/20 rounded text-[10px] font-mono text-blue-400">
                          {events.length}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      {events.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/requests/${event.id}`);
                          }}
                          className={`text-[10px] p-1 rounded truncate cursor-pointer ${
                            event.is_overdue
                              ? 'bg-red-500/20 text-red-400 border-l-2 border-l-red-500'
                              : event.status === 'repaired'
                              ? 'bg-green-500/20 text-green-400 border-l-2 border-l-green-500'
                              : 'bg-blue-500/20 text-blue-400 border-l-2 border-l-blue-500'
                          }`}
                          data-testid={`calendar-event-${event.id}`}
                        >
                          {event.subject}
                        </div>
                      ))}
                      {events.length > 2 && (
                        <div className="text-[10px] text-slate-500">
                          +{events.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card className="border-white/10 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-emerald-400" />
              Upcoming Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {requests.filter((r) => r.status !== 'repaired' && r.status !== 'scrap').length === 0 ? (
              <p className="text-slate-400 text-sm">No upcoming maintenance scheduled</p>
            ) : (
              <div className="space-y-3">
                {requests
                  .filter((r) => r.status !== 'repaired' && r.status !== 'scrap')
                  .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))
                  .slice(0, 5)
                  .map((request) => (
                    <div
                      key={request.id}
                      onClick={() => navigate(`/requests/${request.id}`)}
                      className={`p-3 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors ${
                        request.is_overdue ? 'border-l-4 border-l-red-500' : ''
                      }`}
                      data-testid={`upcoming-event-${request.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-white">{request.subject}</p>
                          <p className="text-sm text-slate-400">{request.equipment_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-mono text-slate-400">
                            {request.scheduled_date
                              ? format(new Date(request.scheduled_date), 'MMM d, yyyy')
                              : 'No date'}
                          </p>
                          {request.is_overdue && (
                            <span className="text-xs text-red-400">Overdue</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Preventive Maintenance Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule Preventive Maintenance</DialogTitle>
              <DialogDescription>
                {selectedDate
                  ? `Scheduled for ${format(selectedDate, 'MMMM d, yyyy')}`
                  : 'Select a date for the maintenance'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Subject *</Label>
                <Input
                  placeholder="Monthly inspection"
                  value={newRequest.subject}
                  onChange={(e) => setNewRequest({ ...newRequest, subject: e.target.value })}
                  data-testid="preventive-subject-input"
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
                  <SelectTrigger data-testid="preventive-equipment-select">
                    <SelectValue placeholder="Select equipment" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipment.filter(e => e.is_usable).map((eq) => (
                      <SelectItem key={eq.id} value={eq.id}>
                        {eq.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Scheduled Date</Label>
                <Input
                  type="date"
                  value={newRequest.scheduled_date}
                  onChange={(e) =>
                    setNewRequest({ ...newRequest, scheduled_date: e.target.value })
                  }
                  data-testid="preventive-date-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Describe the maintenance task..."
                  value={newRequest.description}
                  onChange={(e) =>
                    setNewRequest({ ...newRequest, description: e.target.value })
                  }
                  data-testid="preventive-description-input"
                />
              </div>
              <Button onClick={handleCreate} className="w-full" data-testid="create-preventive-btn">
                Schedule Maintenance
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};
