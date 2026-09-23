import axios from 'axios';
import { API_BASE_URL } from './api';

const API_URL = `${API_BASE_URL}/project-ops`;

// Resources
export interface ProjectResource {
  id: string;
  project_id: string;
  resource_type: string; // 'Crew', 'Rig', 'Equipment'
  resource_id: string;
  start_date: string;
  end_date?: string | null;
  notes?: string | null;
  is_active: boolean;
  resource_name?: string;
  resource_code?: string;
}

export const getProjectResources = async (projectId?: string) => {
  const url = projectId ? `${API_URL}/resources?project_id=${projectId}` : `${API_URL}/resources`;
  const response = await axios.get(url);
  return response.data;
};

export const createProjectResource = async (data: Partial<ProjectResource>) => {
  const response = await axios.post(`${API_URL}/resources`, data);
  return response.data;
};

export const updateProjectResource = async (id: string, data: Partial<ProjectResource>) => {
  const response = await axios.put(`${API_URL}/resources/${id}`, data);
  return response.data;
};

export const deleteProjectResource = async (id: string) => {
  const response = await axios.delete(`${API_URL}/resources/${id}`);
  return response.data;
};

// Daily Reports
export interface DailyProgressReport {
  id: string;
  project_id: string;
  area_id?: string | null;
  report_date: string;
  weather?: string | null;
  drilling_depth: number;
  activities_summary?: string | null;
  issues_encountered?: string | null;
  reported_by_id?: string | null;
  status: string;
  is_active: boolean;
}

export const getDailyReports = async (projectId?: string) => {
  const url = projectId ? `${API_URL}/reports?project_id=${projectId}` : `${API_URL}/reports`;
  const response = await axios.get(url);
  return response.data;
};

export const createDailyReport = async (data: Partial<DailyProgressReport>) => {
  const response = await axios.post(`${API_URL}/reports`, data);
  return response.data;
};

export const updateDailyReport = async (id: string, data: Partial<DailyProgressReport>) => {
  const response = await axios.put(`${API_URL}/reports/${id}`, data);
  return response.data;
};

export const deleteDailyReport = async (id: string) => {
  const response = await axios.delete(`${API_URL}/reports/${id}`);
  return response.data;
};
