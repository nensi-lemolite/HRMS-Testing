import api from './client';

export const listProjects = () => api.get('/projects').then((r) => r.data.projects);
export const createProject = (body) => api.post('/projects', body).then((r) => r.data.project);
