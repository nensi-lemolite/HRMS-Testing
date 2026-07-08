import api from './client';

export const listExits = () => api.get('/exit').then((r) => r.data.checklists || []);
