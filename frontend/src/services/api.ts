import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Organization APIs
export const organizationApi = {
  // Company
  getCompanies: () => api.get('/master-data/organization/companies'),
  getCompany: (id: string) => api.get(`/master-data/organization/companies/${id}`),
  createCompany: (data: any) => api.post('/master-data/organization/companies', data),
  updateCompany: (id: string, data: any) => api.put(`/master-data/organization/companies/${id}`, data),
  deleteCompany: (id: string) => api.delete(`/master-data/organization/companies/${id}`),

  // Branch
  getBranches: () => api.get('/master-data/organization/branches'),
  createBranch: (data: any) => api.post('/master-data/organization/branches', data),
  updateBranch: (id: string, data: any) => api.put(`/master-data/organization/branches/${id}`, data),
  deleteBranch: (id: string) => api.delete(`/master-data/organization/branches/${id}`),

  // Cost Center
  getCostCenters: () => api.get('/master-data/organization/cost-centers'),
  createCostCenter: (data: any) => api.post('/master-data/organization/cost-centers', data),
  updateCostCenter: (id: string, data: any) => api.put(`/master-data/organization/cost-centers/${id}`, data),
  deleteCostCenter: (id: string) => api.delete(`/master-data/organization/cost-centers/${id}`),
};

// Financials APIs
export const financialsApi = {
  // Chart of Account
  getCoas: () => api.get('/master-data/financials/coas'),
  createCoa: (data: any) => api.post('/master-data/financials/coas', data),
  updateCoa: (id: string, data: any) => api.put(`/master-data/financials/coas/${id}`, data),
  deleteCoa: (id: string) => api.delete(`/master-data/financials/coas/${id}`),
  getCoaUsage: (id: string) => api.get(`/master-data/financials/coas/${id}/usage`),
  relinkCoa: (id: string, data: { target_account_id: string; delete_source?: boolean }) => 
    api.post(`/master-data/financials/coas/${id}/relink`, data),

  // Tax Code
  getTaxes: () => api.get('/master-data/financials/taxes'),
  createTax: (data: any) => api.post('/master-data/financials/taxes', data),
  updateTax: (id: string, data: any) => api.put(`/master-data/financials/taxes/${id}`, data),
  deleteTax: (id: string) => api.delete(`/master-data/financials/taxes/${id}`),

  // Currency
  getCurrencies: () => api.get('/master-data/financials/currencies'),
  createCurrency: (data: any) => api.post('/master-data/financials/currencies', data),
  updateCurrency: (id: string, data: any) => api.put(`/master-data/financials/currencies/${id}`, data),
  deleteCurrency: (id: string) => api.delete(`/master-data/financials/currencies/${id}`),

  // Bank
  getBanks: () => api.get('/master-data/financials/banks'),
  createBank: (data: any) => api.post('/master-data/financials/banks', data),
  updateBank: (id: string, data: any) => api.put(`/master-data/financials/banks/${id}`, data),
  deleteBank: (id: string) => api.delete(`/master-data/financials/banks/${id}`),
};

// Project Structure APIs
export const projectsApi = {
  // Project
  getProjects: () => api.get('/master-data/project-structure/projects'),
  getProject: (id: string) => api.get(`/master-data/project-structure/projects/${id}`),
  createProject: (data: any) => api.post('/master-data/project-structure/projects', data),
  updateProject: (id: string, data: any) => api.put(`/master-data/project-structure/projects/${id}`, data),
  deleteProject: (id: string) => api.delete(`/master-data/project-structure/projects/${id}`),

  // Area
  getAreas: () => api.get('/master-data/project-structure/areas'),
  createArea: (data: any) => api.post('/master-data/project-structure/areas', data),
  updateArea: (id: string, data: any) => api.put(`/master-data/project-structure/areas/${id}`, data),
  deleteArea: (id: string) => api.delete(`/master-data/project-structure/areas/${id}`),

  // Work Package
  getWorkPackages: () => api.get('/master-data/project-structure/work-packages'),
  createWorkPackage: (data: any) => api.post('/master-data/project-structure/work-packages', data),
  updateWorkPackage: (id: string, data: any) => api.put(`/master-data/project-structure/work-packages/${id}`, data),
  deleteWorkPackage: (id: string) => api.delete(`/master-data/project-structure/work-packages/${id}`),

  // Activity
  getActivities: () => api.get('/master-data/project-structure/activities'),
  createActivity: (data: any) => api.post('/master-data/project-structure/activities', data),
  updateActivity: (id: string, data: any) => api.put(`/master-data/project-structure/activities/${id}`, data),
  deleteActivity: (id: string) => api.delete(`/master-data/project-structure/activities/${id}`),
};

// Project RAB APIs
export const rabApi = {
  getByProject: (projectId: string) => api.get(`/project-rabs/by-project/${projectId}`),
  create: (data: any) => api.post('/project-rabs', data),
  update: (id: string, data: any) => api.put(`/project-rabs/${id}`, data),
  delete: (id: string) => api.delete(`/project-rabs/${id}`),
  importCsv: (projectId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/project-rabs/import/${projectId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
};

// Stakeholders APIs
export const stakeholdersApi = {
  // Customer
  getCustomers: () => api.get('/master-data/stakeholders/customers'),
  createCustomer: (data: any) => api.post('/master-data/stakeholders/customers', data),
  updateCustomer: (id: string, data: any) => api.put(`/master-data/stakeholders/customers/${id}`, data),
  deleteCustomer: (id: string) => api.delete(`/master-data/stakeholders/customers/${id}`),

  // Vendor
  getVendors: () => api.get('/master-data/stakeholders/vendors'),
  createVendor: (data: any) => api.post('/master-data/stakeholders/vendors', data),
  updateVendor: (id: string, data: any) => api.put(`/master-data/stakeholders/vendors/${id}`, data),
  deleteVendor: (id: string) => api.delete(`/master-data/stakeholders/vendors/${id}`),
};

// HR APIs
export const hrApi = {
  // Employee
  getEmployees: () => api.get('/master-data/hr/employees'),
  createEmployee: (data: any) => api.post('/master-data/hr/employees', data),
  updateEmployee: (id: string, data: any) => api.put(`/master-data/hr/employees/${id}`, data),
  deleteEmployee: (id: string) => api.delete(`/master-data/hr/employees/${id}`),

  // Crew
  getCrews: () => api.get('/master-data/hr/crews'),
  createCrew: (data: any) => api.post('/master-data/hr/crews', data),
  updateCrew: (id: string, data: any) => api.put(`/master-data/hr/crews/${id}`, data),
  deleteCrew: (id: string) => api.delete(`/master-data/hr/crews/${id}`),

  // Shift
  getShifts: () => api.get('/master-data/hr/shifts'),
  createShift: (data: any) => api.post('/master-data/hr/shifts', data),
  updateShift: (id: string, data: any) => api.put(`/master-data/hr/shifts/${id}`, data),
  deleteShift: (id: string) => api.delete(`/master-data/hr/shifts/${id}`),
};

// Asset & Inventory APIs
export const inventoryApi = {
  // Warehouse
  getWarehouses: () => api.get('/master-data/inventory/warehouses'),
  createWarehouse: (data: any) => api.post('/master-data/inventory/warehouses', data),
  updateWarehouse: (id: string, data: any) => api.put(`/master-data/inventory/warehouses/${id}`, data),
  deleteWarehouse: (id: string) => api.delete(`/master-data/inventory/warehouses/${id}`),

  // Rig
  getRigs: () => api.get('/master-data/inventory/rigs'),
  createRig: (data: any) => api.post('/master-data/inventory/rigs', data),
  updateRig: (id: string, data: any) => api.put(`/master-data/inventory/rigs/${id}`, data),
  deleteRig: (id: string) => api.delete(`/master-data/inventory/rigs/${id}`),

  // Equipment
  getEquipments: () => api.get('/master-data/inventory/equipments'),
  createEquipment: (data: any) => api.post('/master-data/inventory/equipments', data),
  updateEquipment: (id: string, data: any) => api.put(`/master-data/inventory/equipments/${id}`, data),
  deleteEquipment: (id: string) => api.delete(`/master-data/inventory/equipments/${id}`),

  // Material
  getMaterials: () => api.get('/master-data/inventory/materials'),
  createMaterial: (data: any) => api.post('/master-data/inventory/materials', data),
  updateMaterial: (id: string, data: any) => api.put(`/master-data/inventory/materials/${id}`, data),
  deleteMaterial: (id: string) => api.delete(`/master-data/inventory/materials/${id}`),

  // Inventory Item
  getInventoryItems: () => api.get('/master-data/inventory/inventory-items'),
  createInventoryItem: (data: any) => api.post('/master-data/inventory/inventory-items', data),
  updateInventoryItem: (id: string, data: any) => api.put(`/master-data/inventory/inventory-items/${id}`, data),
  deleteInventoryItem: (id: string) => api.delete(`/master-data/inventory/inventory-items/${id}`),
};

// Finance APIs
export const financeApi = {
  // Billing Schedules
  getBillingSchedules: () => api.get('/finance/billing-schedules'),
  getBillingSchedule: (id: string) => api.get(`/finance/billing-schedules/${id}`),
  createBillingSchedule: (data: any) => api.post('/finance/billing-schedules', data),
  updateBillingSchedule: (id: string, data: any) => api.put(`/finance/billing-schedules/${id}`, data),
  updateBillingTerm: (scheduleId: string, termId: string, data: any) => api.put(`/finance/billing-schedules/${scheduleId}/terms/${termId}`, data),
  addBillingTerm: (scheduleId: string, data: any) => api.post(`/finance/billing-schedules/${scheduleId}/terms`, data),
  deleteBillingTerm: (scheduleId: string, termId: string) => api.delete(`/finance/billing-schedules/${scheduleId}/terms/${termId}`),
  deleteBillingSchedule: (id: string) => api.delete(`/finance/billing-schedules/${id}`),
  generateInvoiceForTerm: (scheduleId: string, termId: string, data: any) => api.post(`/finance/billing-schedules/${scheduleId}/terms/${termId}/generate-invoice`, data),
  markTermPaid: (scheduleId: string, termId: string) => api.put(`/finance/billing-schedules/${scheduleId}/terms/${termId}/mark-paid`),
  // Journals
  getJournals: () => api.get('/finance/journals'),
  getJournal: (id: string) => api.get(`/finance/journals/${id}`),
  createJournal: (data: any) => api.post('/finance/journals', data),
  updateJournal: (id: string, data: any) => api.put(`/finance/journals/${id}`, data),
  updateJournalStatus: (id: string, data: any) => api.put(`/finance/journals/${id}/status`, data),
  deleteJournal: (id: string) => api.delete(`/finance/journals/${id}`),

  // AP Invoices
  getApInvoices: () => api.get('/finance/ap-invoices'),
  getApInvoice: (id: string) => api.get(`/finance/ap-invoices/${id}`),
  createApInvoice: (data: any) => api.post('/finance/ap-invoices', data),
  updateApInvoice: (id: string, data: any) => api.put(`/finance/ap-invoices/${id}`, data),
  deleteApInvoice: (id: string) => api.delete(`/finance/ap-invoices/${id}`),

  // AR Invoices
  getArInvoices: () => api.get('/finance/ar-invoices'),
  getArInvoice: (id: string) => api.get(`/finance/ar-invoices/${id}`),
  createArInvoice: (data: any) => api.post('/finance/ar-invoices', data),
  updateArInvoice: (id: string, data: any) => api.put(`/finance/ar-invoices/${id}`, data),
  deleteArInvoice: (id: string) => api.delete(`/finance/ar-invoices/${id}`),

  // Expenses (Direct Expense / Kas Kecil)
  getExpenses: (month?: string) => api.get('/finance/expenses', { params: { month } }),
  createExpense: (data: any) => api.post('/finance/expenses', data),
  deleteExpense: (id: string) => api.delete(`/finance/expenses/${id}`),
};

export const procurementApi = {
  getPurchaseOrders: () => api.get('/procurement/po'),
  createPurchaseOrder: (data: any) => api.post('/procurement/po', data),
  updatePurchaseOrderStatus: (id: string, status: string) => api.put(`/procurement/po/${id}/status?status=${status}`),
  deletePurchaseOrder: (id: string) => api.delete(`/procurement/po/${id}`),
};

export const dashboardApi = {
  getSummary: () => api.get('/dashboard/summary'),
  getCashFlow: (params?: { project_id?: string; interval?: string }) => api.get('/dashboard/cashflow-monthly', { params }),
};

export const assetsApi = {
  getFixedAssets: () => api.get('/assets/fixed-assets'),
  createFixedAsset: (data: any) => api.post('/assets/fixed-assets', data),
  runDepreciation: () => api.post('/assets/fixed-assets/run-depreciation'),
};

export const equipmentApi = {
  getEquipments: () => api.get('/equipment'),
  getAssignments: (params?: any) => api.get('/equipment/assignments', { params }),
  dispatchEquipment: (data: any) => api.post('/equipment/assignments', data),
  returnEquipment: (id: string, data: any) => api.put(`/equipment/assignments/${id}`, data),
  getMaintenance: (params?: any) => api.get('/equipment/maintenance', { params }),
  addMaintenance: (data: any) => api.post('/equipment/maintenance', data),
  updateMaintenance: (id: string, status: string) => api.put(`/equipment/maintenance/${id}?status=${status}`)
};

export const inventoryTransactionApi = {
  getTransactions: () => api.get('/inventory/transactions'),
  getTransaction: (id: string) => api.get(`/inventory/transactions/${id}`),
  createTransaction: (data: any) => api.post('/inventory/transactions', data),
  postTransaction: (id: string) => api.post(`/inventory/transactions/${id}/post`),
};

export const dataManagementApi = {
  getStatus: () => api.get('/data-management/status'),
  backup: () => api.get('/data-management/backup', { responseType: 'blob' }),
  restore: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/data-management/restore', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  exportMaster: () => api.get('/data-management/export-master', { responseType: 'blob' }),
  importMaster: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/data-management/import-master', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  downloadInvoiceTemplates: () => api.get('/data-management/invoice-templates', { responseType: 'blob' }),
  uploadPdf: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/data-management/upload-pdf', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  deployScript: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/data-management/deploy-script', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

export const profileApi = {
  getProfile: () => api.get('/profile'),
  updateProfile: (data: { name?: string; username?: string; email?: string; phone?: string; photo?: string | null }) => api.put('/profile', data),
  updateSecurity: (data: { current_password: string; new_password: string }) => api.put('/profile/security', data),
};

