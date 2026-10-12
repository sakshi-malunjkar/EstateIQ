import type { ReactElement } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AdminLayout } from "./AdminLayout";
import { Overview } from "./screens/Overview";
import { Analytics } from "./screens/Analytics";
import { Leads } from "./screens/Leads";
import { LeadDetail } from "./screens/LeadDetail";
import { Projects } from "./screens/Projects";
import { ProjectAdmin } from "./screens/ProjectAdmin";
import { AdminLogin } from "./screens/AdminLogin";
import { Settings } from "./screens/Settings";
import { useAdminSession, useAuthReady } from "./auth";

/** Guard: wait for the stored Supabase session, then no session → login page. */
function RequireAdmin({ children }: { children: ReactElement }) {
  const session = useAdminSession();
  const ready = useAuthReady();
  if (!ready) return <div className="min-h-screen bg-bg" role="status" aria-label="Loading" />;
  return session ? children : <Navigate to="/login" replace />;
}

export function AdminRoutes() {
  return (
    <Routes>
      <Route path="login" element={<AdminLogin />} />
      <Route path="/" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
        <Route index element={<Overview />} />
        <Route path="leads" element={<Leads />} />
        <Route path="leads/:id" element={<LeadDetail />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:id" element={<ProjectAdmin />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
