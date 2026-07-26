import React, { useState, useEffect } from 'react';
import { hrApi } from '../../../services/api';
import { Link } from 'react-router-dom';
import { Users, UserCircle, Briefcase, Clock } from 'lucide-react';

export function HRDashboard() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [crews, setCrews] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHRData = async () => {
      try {
        setIsLoading(true);
        const [empRes, crewRes, shiftRes] = await Promise.all([
          hrApi.getEmployees(),
          hrApi.getCrews(),
          hrApi.getShifts()
        ]);
        setEmployees(empRes.data);
        setCrews(crewRes.data);
        setShifts(shiftRes.data);
      } catch (error) {
        console.error('Failed to fetch HR data', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHRData();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-textPrimary">Human Resource Dashboard</h1>
        <p className="text-textSecondary mt-1">Overview of employees, field crews, and shifts.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between hover:border-primary/50 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-textSecondary">Total Employees</h3>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-primary" />
            </div>
          </div>
          <p className="text-3xl font-bold text-textPrimary">{isLoading ? '-' : employees.length}</p>
        </div>
        
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between hover:border-primary/50 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-textSecondary">Active Crews</h3>
            <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-warning" />
            </div>
          </div>
          <p className="text-3xl font-bold text-textPrimary">{isLoading ? '-' : crews.length}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between hover:border-primary/50 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-textSecondary">Active Shifts</h3>
            <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-success" />
            </div>
          </div>
          <p className="text-3xl font-bold text-textPrimary">{isLoading ? '-' : shifts.length}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-textPrimary mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link to="/hr/employees" className="bg-card p-6 rounded-xl border border-border shadow-sm hover:bg-secondary/10 hover:border-primary transition-all flex flex-col items-center justify-center text-center gap-3 group">
            <div className="p-4 bg-primary/10 rounded-full text-primary group-hover:scale-110 transition-transform">
              <UserCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-bold text-textPrimary">Employees Master</h3>
              <p className="text-sm text-textSecondary">Manage all employee records, roles, and branch assignments</p>
            </div>
          </Link>
          <Link to="/hr/crews" className="bg-card p-6 rounded-xl border border-border shadow-sm hover:bg-secondary/10 hover:border-primary transition-all flex flex-col items-center justify-center text-center gap-3 group">
            <div className="p-4 bg-warning/10 rounded-full text-warning group-hover:scale-110 transition-transform">
              <Briefcase className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-bold text-textPrimary">Crews & Teams</h3>
              <p className="text-sm text-textSecondary">Organize employees into functional crews for project assignment</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
