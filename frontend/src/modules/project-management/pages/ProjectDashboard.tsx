import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Building, AlertCircle, Clock, CheckCircle2, ChevronRight, Activity } from 'lucide-react';
import { projectsApi, organizationApi, stakeholdersApi } from '../../../services/api';

interface ProjectDashboardData {
  id: string;
  code: string;
  name: string;
  status: string;
  companyName: string;
  customerName: string;
}

export function ProjectDashboard() {
  const [projects, setProjects] = useState<ProjectDashboardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | 'Active' | 'Planning' | 'Completed'>('Active');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const [projRes, compRes, custRes] = await Promise.all([
          projectsApi.getProjects(),
          organizationApi.getCompanies(),
          stakeholdersApi.getCustomers()
        ]);
        
        const mapped = projRes.data.map((p: any) => ({
          ...p,
          companyName: compRes.data.find((c: any) => c.id === p.company_id)?.name || 'Internal',
          customerName: custRes.data.find((c: any) => c.id === p.customer_id)?.name || 'No Client'
        }));
        
        setProjects(mapped.filter((p: any) => p.is_active));
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status === 'Active').length,
    planning: projects.filter(p => p.status === 'Planning').length,
    completed: projects.filter(p => p.status === 'Completed').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-textPrimary">Project Operations Dashboard</h1>
        <p className="text-textSecondary mt-1">Monitor active drilling projects, resource allocation, and daily progress.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button 
          onClick={() => setFilter('All')}
          className={`bg-card border rounded-xl p-4 flex flex-col justify-between transition-all text-left
            ${filter === 'All' ? 'border-primary ring-1 ring-primary shadow-md' : 'border-border hover:border-primary/50'}`}
        >
          <div className="flex items-center justify-between mb-4 w-full">
            <h3 className="text-sm font-medium text-textSecondary">Total Projects</h3>
            <div className="w-8 h-8 rounded-full bg-secondary/30 flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-primary" />
            </div>
          </div>
          <p className="text-3xl font-bold text-textPrimary">{isLoading ? '-' : stats.total}</p>
        </button>
        
        <button 
          onClick={() => setFilter('Active')}
          className={`bg-card border rounded-xl p-4 flex flex-col justify-between transition-all text-left
            ${filter === 'Active' ? 'border-primary ring-1 ring-primary shadow-md' : 'border-border hover:border-primary/50'}`}
        >
          <div className="flex items-center justify-between mb-4 w-full">
            <h3 className="text-sm font-medium text-textSecondary">Active / Ongoing</h3>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary" />
            </div>
          </div>
          <p className="text-3xl font-bold text-primary">{isLoading ? '-' : stats.active}</p>
        </button>

        <button 
          onClick={() => setFilter('Planning')}
          className={`bg-card border rounded-xl p-4 flex flex-col justify-between transition-all text-left
            ${filter === 'Planning' ? 'border-warning ring-1 ring-warning shadow-md' : 'border-border hover:border-warning/50'}`}
        >
          <div className="flex items-center justify-between mb-4 w-full">
            <h3 className="text-sm font-medium text-textSecondary">In Planning</h3>
            <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-warning" />
            </div>
          </div>
          <p className="text-3xl font-bold text-warning">{isLoading ? '-' : stats.planning}</p>
        </button>

        <button 
          onClick={() => setFilter('Completed')}
          className={`bg-card border rounded-xl p-4 flex flex-col justify-between transition-all text-left
            ${filter === 'Completed' ? 'border-success ring-1 ring-success shadow-md' : 'border-border hover:border-success/50'}`}
        >
          <div className="flex items-center justify-between mb-4 w-full">
            <h3 className="text-sm font-medium text-textSecondary">Completed</h3>
            <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-success" />
            </div>
          </div>
          <p className="text-3xl font-bold text-success">{isLoading ? '-' : stats.completed}</p>
        </button>
      </div>

      {/* Projects Grid */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/10">
          <h2 className="text-lg font-bold text-textPrimary">Project Portfolio {filter !== 'All' && <span className="text-sm font-normal text-textSecondary ml-2">({filter})</span>}</h2>
          <Link to="/master-data/project" className="text-sm text-primary hover:underline font-medium">
            Manage Master Projects
          </Link>
        </div>
        
        {isLoading ? (
          <div className="p-8 text-center text-textSecondary flex flex-col items-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            Loading projects...
          </div>
        ) : projects.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center">
            <AlertCircle className="w-12 h-12 text-border mb-3" />
            <p className="text-textSecondary font-medium mb-1">No projects found</p>
            <p className="text-xs text-textSecondary/70 mb-4">You have not created any projects in the Master Data yet.</p>
            <Link to="/master-data/project" className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
              Create Project
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
            {(filter === 'All' ? projects : projects.filter(p => p.status === filter)).map(project => (
              <Link 
                key={project.id} 
                to={`/projects/${project.id}`}
                className="group border border-border rounded-xl p-5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all bg-background flex flex-col h-full"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-xs font-mono text-textSecondary bg-secondary/30 px-2 py-1 rounded-md">{project.code}</span>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                    ${project.status === 'Active' ? 'bg-primary/10 text-primary' : 
                      project.status === 'Planning' ? 'bg-warning/10 text-warning' : 
                      project.status === 'Completed' ? 'bg-success/10 text-success' : 
                      'bg-danger/10 text-danger'}`}
                  >
                    <span className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 
                        ${project.status === 'Active' ? 'bg-primary' : 
                          project.status === 'Planning' ? 'bg-warning' : 
                          project.status === 'Completed' ? 'bg-success' : 
                          'bg-danger'}`}></span>
                      <span className={`relative inline-flex rounded-full h-2 w-2 
                        ${project.status === 'Active' ? 'bg-primary' : 
                          project.status === 'Planning' ? 'bg-warning' : 
                          project.status === 'Completed' ? 'bg-success' : 
                          'bg-danger'}`}></span>
                    </span>
                    {project.status}
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-textPrimary mb-1 group-hover:text-primary transition-colors line-clamp-2">
                  {project.name}
                </h3>
                
                <div className="mt-auto pt-4 space-y-2">
                  <div className="flex items-center text-sm text-textSecondary gap-2">
                    <Building className="w-4 h-4 text-border" />
                    <span className="truncate" title={project.customerName}>{project.customerName}</span>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-border flex justify-between items-center text-sm">
                  <span className="text-textSecondary text-xs">Internal: {project.companyName}</span>
                  <div className="flex items-center text-primary font-medium text-xs group-hover:translate-x-1 transition-transform">
                    View Details <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
