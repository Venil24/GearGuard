import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, getMaintenanceRequests } from '../lib/api';
import { Layout } from '../components/Layout';
import { SmartButton } from '../components/SmartButton';
import { StatusBadge, RequestTypeBadge } from '../components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Settings,
  ClipboardList,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Trash2,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';

export const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentRequests, setRecentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, requestsRes] = await Promise.all([
        getDashboardStats(),
        getMaintenanceRequests(),
      ]);
      setStats(statsRes.data);
      setRecentRequests(requestsRes.data.slice(0, 5));
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
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
      <div className="space-y-8" data-testid="dashboard-page">
        {/* Header */}
        <div>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-white tracking-tight uppercase">
            Dashboard
          </h1>
          <p className="text-slate-400 mt-1">Overview of maintenance operations</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <SmartButton
            icon={Settings}
            count={stats?.total_equipment || 0}
            label="Equipment"
            onClick={() => navigate('/equipment')}
            variant="default"
          />
          <SmartButton
            icon={ClipboardList}
            count={stats?.requests?.new || 0}
            label="New Requests"
            onClick={() => navigate('/requests?status=new')}
            variant="info"
          />
          <SmartButton
            icon={Clock}
            count={stats?.requests?.in_progress || 0}
            label="In Progress"
            onClick={() => navigate('/requests?status=in_progress')}
            variant="warning"
          />
          <SmartButton
            icon={CheckCircle}
            count={stats?.requests?.repaired || 0}
            label="Repaired"
            onClick={() => navigate('/requests?status=repaired')}
            variant="success"
          />
          <SmartButton
            icon={AlertTriangle}
            count={stats?.requests?.overdue || 0}
            label="Overdue"
            onClick={() => navigate('/requests')}
            variant="danger"
          />
          <SmartButton
            icon={Users}
            count={stats?.technicians_count || 0}
            label="Technicians"
            onClick={() => navigate('/teams')}
            variant="default"
          />
        </div>

        {/* Content Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Requests */}
          <Card className="border-white/10 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-emerald-400" />
                Recent Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentRequests.length === 0 ? (
                <p className="text-slate-400 text-sm">No maintenance requests yet</p>
              ) : (
                <div className="space-y-3">
                  {recentRequests.map((request) => (
                    <div
                      key={request.id}
                      onClick={() => navigate(`/requests/${request.id}`)}
                      className={`p-3 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors ${
                        request.is_overdue ? 'border-l-4 border-l-red-500' : ''
                      }`}
                      data-testid={`request-item-${request.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">{request.subject}</p>
                          <p className="text-sm text-slate-400 truncate">
                            {request.equipment_name}
                          </p>
                        </div>
                        <StatusBadge status={request.status} />
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <RequestTypeBadge type={request.request_type} />
                        {request.is_overdue && (
                          <span className="text-xs text-red-400 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Overdue
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="border-white/10 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2">
                <Wrench className="h-5 w-5 text-emerald-400" />
                System Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-md bg-white/5">
                  <div className="flex items-center gap-3">
                    <Settings className="h-5 w-5 text-emerald-400" />
                    <span className="text-slate-300">Usable Equipment</span>
                  </div>
                  <span className="font-mono text-white">
                    {stats?.usable_equipment}/{stats?.total_equipment}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-md bg-white/5">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-blue-400" />
                    <span className="text-slate-300">Maintenance Teams</span>
                  </div>
                  <span className="font-mono text-white">{stats?.teams_count}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-md bg-white/5">
                  <div className="flex items-center gap-3">
                    <Trash2 className="h-5 w-5 text-red-400" />
                    <span className="text-slate-300">Scrapped Equipment</span>
                  </div>
                  <span className="font-mono text-white">{stats?.requests?.scrap || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};
