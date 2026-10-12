import { Routes, Route, Navigate } from "react-router-dom";
import { Landing } from "@/features/landing/Landing";
/** Public landing page only: no login, no dashboard. Admin lives in apps/admin. */
/** Public landing page only — no login, no dashboard. Admin lives in apps/admin. */
export default function App() {
  return (
    <Routes>
      <Route index element={<Landing />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
