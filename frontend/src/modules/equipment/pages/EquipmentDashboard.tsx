import { useState, useEffect } from 'react';
import { Truck, Wrench, Settings, Search, AlertCircle, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { equipmentApi } from '../../../services/api';
import { formatCurrency } from '../../../utils/formatters';

export function EquipmentDashboard() {
  const [equipments, setEquipments] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [maintenances, setMaintenances] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [equipRes, assignRes, maintRes] = await Promise.all([
        equipmentApi.getEquipments(),
        equipmentApi.getAssignments(),
        equipmentApi.getMaintenance()
      ]);
      setEquipments(equipRes.data);
      setAssignments(assignRes.data);
      setMaintenances(maintRes.data);
    } catch (error) {
      console.error('Error fetching equipment dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const activeMaintenances = maintenances.filter(m => m.status === 'In Progress' || m.status === 'Planned');
  const activeAssignments = assignments.filter(a => a.status === 'Dispatched');

  const stats = [
    {
      label: 'Total Equipment',
      value: equipments.length,
      icon: Settings,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Available (Active)',
      value: equipments.filter(e => e.status === 'Active').length,
      icon: RefreshCw,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      label: 'Dispatched to Project',
      value: equipments.filter(e => e.status === 'Dispatched').length,
      icon: Truck,
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
    {
      label: 'Under Maintenance',
      value: equipments.filter(e => e.status === 'Maintenance').length,
      icon: Wrench,
      color: 'text-danger',
      bg: 'bg-danger/10',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Equipment Dashboard</h1>
          <p className="text-textSecondary text-sm">Overview of Heavy Equipment, Rigs, and Tools</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-card p-6 rounded-xl border border-border shadow-sm flex items-start gap-4 hover:-translate-y-1 transition-transform">
            <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-textSecondary">{stat.label}</p>
              <h3 className="text-2xl font-bold text-textPrimary mt-1">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Active Dispatches */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-6">
          <h3 className="text-lg font-bold text-textPrimary mb-4 flex items-center gap-2">
            <Truck className="w-5 h-5 text-warning" /> 
            Active Dispatches
          </h3>
          <div className="space-y-4">
            {activeAssignments.length > 0 ? activeAssignments.slice(0, 5).map(assignment => (
              <div key={assignment.id} className="flex justify-between items-center p-3 hover:bg-background/50 rounded-lg transition-colors border border-border/50">
                <div>
                  <p className="font-semibold text-textPrimary">{assignment.equipment?.name || 'Unknown'}</p>
                  <p className="text-sm text-textSecondary">To: {assignment.project?.name || 'Project'}</p>
                </div>
                <div className="text-right">
                  <span className="px-2 py-1 bg-warning/10 text-warning text-xs font-medium rounded-full">
                    {assignment.status}
                  </span>
                  <p className="text-xs text-textSecondary mt-1">{assignment.dispatch_date}</p>
                </div>
              </div>
            )) : (
              <p className="text-center text-textSecondary py-4">No active dispatches</p>
            )}
          </div>
        </div>

        {/* Maintenance Schedule */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-6">
          <h3 className="text-lg font-bold text-textPrimary mb-4 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-danger" /> 
            Maintenance Schedule
          </h3>
          <div className="space-y-4">
            {activeMaintenances.length > 0 ? activeMaintenances.slice(0, 5).map(maint => (
              <div key={maint.id} className="flex justify-between items-center p-3 hover:bg-background/50 rounded-lg transition-colors border border-border/50">
                <div>
                  <p className="font-semibold text-textPrimary">{maint.equipment?.name || 'Unknown'}</p>
                  <p className="text-sm text-textSecondary">Type: {maint.maintenance_type}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${maint.status === 'Planned' ? 'bg-secondary/20 text-textSecondary' : 'bg-primary/10 text-primary'}`}>
                    {maint.status}
                  </span>
                  <p className="text-xs text-textSecondary mt-1">{maint.date}</p>
                </div>
              </div>
            )) : (
              <p className="text-center text-textSecondary py-4">No active maintenance tasks</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Navigation Links */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-textPrimary mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link to="/equipment/list" className="bg-card p-6 rounded-xl border border-border shadow-sm hover:bg-secondary/10 hover:border-primary transition-all flex flex-col items-center justify-center text-center gap-3 group">
            <div className="p-4 bg-primary/10 rounded-full text-primary group-hover:scale-110 transition-transform">
              <Settings className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-bold text-textPrimary">Equipment List</h3>
              <p className="text-sm text-textSecondary">Manage master data, add new equipment, and view details</p>
            </div>
          </Link>
          <Link to="/equipment/dispatch" className="bg-card p-6 rounded-xl border border-border shadow-sm hover:bg-secondary/10 hover:border-primary transition-all flex flex-col items-center justify-center text-center gap-3 group">
            <div className="p-4 bg-warning/10 rounded-full text-warning group-hover:scale-110 transition-transform">
              <Truck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-bold text-textPrimary">Dispatch & Return</h3>
              <p className="text-sm text-textSecondary">Assign equipment to projects and track their operational status</p>
            </div>
          </Link>
        </div>
      </div>

    </div>
  );
}
