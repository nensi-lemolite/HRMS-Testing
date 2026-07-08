import api from './client';

export const getMe = () => api.get('/gamification/me').then((r) => r.data);
export const checkin = () => api.post('/gamification/checkin').then((r) => r.data);
export const getColleagues = () => api.get('/gamification/colleagues').then((r) => r.data);
export const giveKudos = (to) => api.post('/gamification/kudos', { to }).then((r) => r.data);
export const awardAction = (type) => api.post('/gamification/award', { type }).then((r) => r.data);
export const getBadges = () => api.get('/gamification/badges').then((r) => r.data);
export const getLeaderboard = () => api.get('/gamification/leaderboard').then((r) => r.data);
export const getRewards = () => api.get('/gamification/rewards').then((r) => r.data);
export const redeemReward = (key) => api.post(`/gamification/rewards/${key}/redeem`).then((r) => r.data);
export const getRules = () => api.get('/gamification/rules').then((r) => r.data);
export const updateConfig = (body) => api.put('/gamification/config', body).then((r) => r.data);
