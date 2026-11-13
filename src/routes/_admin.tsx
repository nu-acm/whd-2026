import { createFileRoute, notFound, Outlet } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { AdminShell } from '@/components/admin/AdminShell';
import { getSession } from '@/lib/auth.server';
import { sessionIsAdmin } from '@/lib/admin.server';

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
  return (
    <AdminShell isAdmin>
      <Outlet />
    </AdminShell>
  );
}
