import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Dashboard } from "@/pages/Dashboard";
import { Studios } from "@/pages/Studios";
import { Bookings } from "@/pages/Bookings";
import { Commission } from "@/pages/Commission";
import { Settlement } from "@/pages/Settlement";
import { Masters } from "@/pages/Masters";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
        <Route path="/studios" element={<AppLayout><Studios /></AppLayout>} />
        <Route path="/bookings" element={<AppLayout><Bookings /></AppLayout>} />
        <Route path="/commission" element={<AppLayout><Commission /></AppLayout>} />
        <Route path="/settlement" element={<AppLayout><Settlement /></AppLayout>} />
        <Route path="/masters" element={<AppLayout><Masters /></AppLayout>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}
