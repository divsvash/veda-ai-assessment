import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.message || err.message || 'Request failed';
    return Promise.reject(new Error(message));
  }
);

export async function createAssignment(formData: FormData) {
  const { data } = await api.post('/api/assignments', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

export async function fetchAssignments(page = 1, limit = 20) {
  const { data } = await api.get(`/api/assignments?page=${page}&limit=${limit}`);
  return data.data;
}

export async function fetchAssignment(id: string) {
  const { data } = await api.get(`/api/assignments/${id}`);
  return data.data;
}

export async function fetchAssignmentOutput(id: string) {
  const { data } = await api.get(`/api/assignments/${id}/output`);
  return data.data;
}

export async function fetchJobStatus(id: string) {
  const { data } = await api.get(`/api/assignments/${id}/status`);
  return data.data;
}

export async function deleteAssignment(id: string) {
  const { data } = await api.delete(`/api/assignments/${id}`);
  return data;
}

export async function regenerateSection(id: string, sectionIndex: number) {
  const { data } = await api.post(`/api/assignments/${id}/regenerate-section`, { sectionIndex });
  return data.data;
}
