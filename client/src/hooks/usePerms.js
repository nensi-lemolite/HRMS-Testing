import { useAuth } from '../context/AuthContext';

export function usePerms() {
  const { user, permissions } = useAuth();
  const role = user?.role;
  const can = (key) => (permissions || []).includes(key);
  const canAny = (...keys) => keys.some(can);
  return { role, permissions: permissions || [], can, canAny };
}
