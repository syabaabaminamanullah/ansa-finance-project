import React, { useState } from 'react';
import { Users, Shield, Plus, X, Save } from 'lucide-react';
import { DataTable } from '../../../components/ui/DataTable';
import { useToastStore } from '../../../store/toastStore';

export function UserRolesSettings() {
  const addToast = useToastStore((state) => state.addToast);
  
  const [users, setUsers] = useState([
    { id: '1', name: 'Super Admin', email: 'admin@ansa.com', role: 'Super Admin', status: 'Active', lastLogin: '2026-07-19 14:30' },
    { id: '2', name: 'Finance Manager', email: 'finance@ansa.com', role: 'Finance', status: 'Active', lastLogin: '2026-07-18 09:15' },
    { id: '3', name: 'Project Admin', email: 'project@ansa.com', role: 'Project Manager', status: 'Active', lastLogin: '2026-07-19 10:00' },
    { id: '4', name: 'Inventory Staff', email: 'wh_staff@ansa.com', role: 'Inventory', status: 'Inactive', lastLogin: '2026-07-01 16:45' },
  ]);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  
  const columns = [
    { header: 'Name', accessor: (row: any) => <span className="font-bold text-textPrimary">{row.name}</span> },
    { header: 'Email', accessor: (row: any) => <span className="text-textSecondary">{row.email}</span> },
    { 
      header: 'Role', 
      accessor: (row: any) => <span className="bg-primary/10 text-primary px-2 py-1 rounded-md text-xs font-medium">{row.role}</span>
    },
    { 
      header: 'Status', 
      accessor: (row: any) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.status === 'Active' ? 'bg-success/10 text-success' : 'bg-secondary/30 text-textSecondary'}`}>
          {row.status}
        </span>
      )
    },
    { header: 'Last Login', accessor: (row: any) => <span className="text-sm text-textSecondary">{row.lastLogin}</span> }
  ];

  const handleEdit = (user: any) => {
    setEditingUser({ ...user });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setUsers(users.map(u => u.id === editingUser.id ? editingUser : u));
    addToast('success', 'User Updated', `${editingUser.name}'s profile has been updated.`);
    setIsEditModalOpen(false);
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Users & Roles</h1>
          <p className="text-textSecondary mt-1">Manage system access and assign permissions based on roles.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          Invite User
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-background/50 flex gap-4">
          <button className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg text-sm">Users Directory</button>
          <button className="px-4 py-2 text-textSecondary hover:bg-secondary/10 font-medium rounded-lg text-sm transition-colors flex items-center gap-2">
            <Shield className="w-4 h-4" /> Role Permissions
          </button>
        </div>
        <div className="p-4">
          <DataTable
            columns={columns}
            data={users}
            searchable
            searchField="name"
            onEdit={handleEdit}
          />
        </div>
      </div>

      {/* Edit User Modal */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card w-full max-w-lg rounded-xl shadow-xl border border-border flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-border">
              <h2 className="text-xl font-bold text-textPrimary">Edit User Access</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-textSecondary hover:text-textPrimary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveEdit}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">Full Name</label>
                  <input
                    required
                    type="text"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">Email Address</label>
                  <input
                    required
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">Role / Permissions</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="Super Admin">Super Admin</option>
                    <option value="Finance">Finance</option>
                    <option value="Project Manager">Project Manager</option>
                    <option value="Inventory">Inventory</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">Account Status</label>
                  <select
                    value={editingUser.status}
                    onChange={(e) => setEditingUser({...editingUser, status: e.target.value})}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              
              <div className="p-6 border-t border-border flex justify-end gap-3 bg-secondary/10 rounded-b-xl">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-textSecondary font-medium hover:text-textPrimary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2"
                >
                  <Save className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
