import { useMemo, useState } from 'react';
import { createFileRoute, notFound, Outlet, useNavigate } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { getSession } from '@/lib/auth.server';
import { sessionIsAdmin } from '@/lib/admin.server';
import { authClient } from '@/lib/auth-client';
import {
  AdminHeaderContext,
  type AdminHeaderContextValue,
  type AdminHeaderControls,
} from '@/lib/admin-header-context';

/**
 * Admin pages return 404 rather than redirecting, so their existence is not
 * advertised to people who are not organisers.
 */
const checkAdmin = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await getSession(getRequest());
  return sessionIsAdmin(session);
});

export const Route = createFileRoute('/_admin')({
  beforeLoad: async () => {
    if (!(await checkAdmin())) throw notFound();
  },
  component: AdminLayout,
});

/** One header for every admin page; each page plugs its refresh button in via context. */
function AdminLayout() {
  const navigate = useNavigate();
  const [controls, setControls] = useState<AdminHeaderControls>({});
  const contextValue = useMemo<AdminHeaderContextValue>(
    () => ({ setHeaderControls: setControls, resetHeaderControls: () => setControls({}) }),
    [],
  );

  const handleSignOut = async () => {
    await authClient.signOut();
    await navigate({ to: '/', reloadDocument: true });
  };

  return (
    <AdminHeaderContext.Provider value={contextValue}>
      <div className="flex min-h-screen flex-col bg-whd-dark">
        <AdminHeader onSignOut={handleSignOut} {...controls} />
        <Outlet />
      </div>
    </AdminHeaderContext.Provider>
  );
}
