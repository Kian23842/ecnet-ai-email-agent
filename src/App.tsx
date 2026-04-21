import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import Login from './components/Login';
import MainDashboard from './MainDashboard';
import AdminDashboard from './AdminDashboard';

export default function App() {
  const { user, loading, isAdmin, setAuth, clearAuth } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="animate-spin text-slate-600 w-8 h-8" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            user
              ? (isAdmin
                  ? <AdminDashboard user={user} onLogout={clearAuth} />
                  : <MainDashboard user={user} onLogout={clearAuth} />)
              : <Login onSuccess={setAuth} />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
