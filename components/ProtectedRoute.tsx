import type { FC, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import LoadingOverlay from './LoadingOverlay';

const ProtectedRoute: FC<{ children: ReactNode }> = ({ children }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="relative w-full h-screen bg-page">
        <LoadingOverlay message="Checking session…" />
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export default ProtectedRoute;
