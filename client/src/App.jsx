import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Center, Text } from '@mantine/core';
import OfflineSyncDaemon from './components/OfflineSyncDaemon';
import PrivateRoute from './components/PrivateRoute';

// ── Public pages ──────────────────────────────────────────────────────────────
import Profile              from './pages/Profile';
import LandingPage        from './pages/LandingPage';
import Login              from './pages/Login';
import Register           from './pages/Register';
import PublicReportDetail from './pages/PublicReportDetail';

// ── Citizen pages ─────────────────────────────────────────────────────────────
import CitizenDashboard   from './pages/citizen/Dashboard';
import SubmitReport       from './pages/citizen/SubmitReport';
import MapView            from './pages/citizen/MapView';
import NotificationsPage  from './pages/citizen/NotificationsPage';
import DraftsPage         from './pages/citizen/DraftsPage';

// ── Ward Official pages ───────────────────────────────────────────────────────
import WardDashboard      from './pages/ward/Dashboard';
import WardReportsList    from './pages/ward/ReportsList';
import WardReportDetail   from './pages/ward/ReportDetail';

// ── Field Worker pages ────────────────────────────────────────────────────────
import FieldDashboard     from './pages/field/Dashboard';
import WorkOrderDetail    from './pages/field/WorkOrderDetail';

// ── System Admin pages ────────────────────────────────────────────────────────
import AdminDashboard     from './pages/admin/Dashboard';
import UserManagement     from './pages/admin/UserManagement';
import AllReports         from './pages/admin/AllReports';
import Analytics          from './pages/admin/Analytics';

// ─── 404 ──────────────────────────────────────────────────────────────────────
function NotFound() {
  return (
    <Center style={{ width: '100vw', height: '100vh', background: '#0d0d0d' }}>
      <Text c="dimmed" size="xl">404 — Page not found.</Text>
    </Center>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <>
      <OfflineSyncDaemon />
      <Routes>

        {/* ── Public — no auth required ── */}
        <Route path="/"            element={<LandingPage />} />
        <Route path="/login"       element={<Login />} />
        <Route path="/register"    element={<Register />} />
        <Route path="/reports/:id" element={<PublicReportDetail />} />

        {/* ── Citizen — role: citizen ── */}
        <Route element={<PrivateRoute allowedRole="citizen" />}>
          <Route path="/citizen/dashboard"      element={<CitizenDashboard />} />
          <Route path="/citizen/submit"         element={<SubmitReport />} />
          <Route path="/citizen/drafts"         element={<DraftsPage />} />
        </Route>

        {/* ── Shared Authenticated Pages ── */}
        <Route element={<PrivateRoute />}>
          <Route path="/notifications"          element={<NotificationsPage />} />
          <Route path="/map"                    element={<MapView />} />
          <Route path="/profile"                element={<Profile />} />
        </Route>

        {/* ── Ward Official — role: ward_official ── */}
        <Route element={<PrivateRoute allowedRole="ward_official" />}>
          <Route path="/ward/dashboard"    element={<WardDashboard />} />
          <Route path="/ward/reports"      element={<WardReportsList />} />
          <Route path="/ward/reports/:id"  element={<WardReportDetail />} />
        </Route>

        {/* ── Field Worker — role: field_worker ── */}
        <Route element={<PrivateRoute allowedRole="field_worker" />}>
          <Route path="/field/dashboard"   element={<FieldDashboard />} />
          <Route path="/field/orders/:id"  element={<WorkOrderDetail />} />
        </Route>

        {/* ── System Admin — role: system_admin ── */}
        <Route element={<PrivateRoute allowedRole="system_admin" />}>
          <Route path="/admin/dashboard"   element={<AdminDashboard />} />
          <Route path="/admin/users"       element={<UserManagement />} />
          <Route path="/admin/reports"     element={<AllReports />} />
          <Route path="/admin/analytics"   element={<Analytics />} />
        </Route>

        {/* ── Legacy redirects ── */}
        <Route path="/dashboard" element={<Navigate to="/citizen/dashboard" replace />} />
        <Route path="/report"    element={<Navigate to="/citizen/submit"    replace />} />

        {/* ── 404 ── */}
        <Route path="*" element={<NotFound />} />

      </Routes>
    </>
  );
}
