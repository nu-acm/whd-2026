import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { authClient } from '@/lib/auth-client';
import {
  AdminHeaderContext,
  type AdminHeaderContextValue,
  type AdminHeaderControls,
} from '@/lib/admin-header-context';

export function AdminShell({ children, isAdmin }: { children: ReactNode; isAdmin: boolean }) {
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
        <AdminHeader isAdmin={isAdmin} onSignOut={handleSignOut} {...controls} />
        {children}
      </div>
    </AdminHeaderContext.Provider>
  );
}
