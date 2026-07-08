import api from './client';

export const listGoals = (employeeId) => api.get('/performance/goals', { params: { employeeId } }).then((r) => r.data.goals);
export const createGoal = (body) => api.post('/performance/goals', body).then((r) => r.data.goal);
export const updateGoal = (id, body) => api.patch(`/performance/goals/${id}`, body).then((r) => r.data.goal);
export const deleteGoal = (id) => api.delete(`/performance/goals/${id}`).then((r) => r.data);

export const listAppraisals = (employeeId) => api.get('/performance/appraisals', { params: { employeeId } }).then((r) => r.data.appraisals);
export const createAppraisal = (body) => api.post('/performance/appraisals', body).then((r) => r.data.appraisal);
export const updateAppraisal = (id, body) => api.patch(`/performance/appraisals/${id}`, body).then((r) => r.data.appraisal);
export const deleteAppraisal = (id) => api.delete(`/performance/appraisals/${id}`).then((r) => r.data);
