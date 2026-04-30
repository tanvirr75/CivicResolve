import React from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Box, Text, Loader } from '@mantine/core';
import { motion, AnimatePresence } from 'framer-motion';
import OfflineSyncDaemon from './components/OfflineSyncDaemon';
import PrivateRoute from './components/PrivateRoute';
import { useAuth } from './context/AuthContext';

// ── Public pages ──────────────────────────────────────────────────────────────
import Profile              from './pages/Profile';
import LandingPage        from './pages/LandingPage';
import Login              from './pages/Login';
import Register           from './pages/Register';
import PublicReportDetail from './pages/PublicReportDetail';
import NotFound           from './pages/NotFound';
import WardPublicStats    from './pages/WardPublicStats';
import AnonSubmitReport   from './pages/AnonSubmitReport';
import Settings           from './pages/Settings';

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

// ─── Page transition layout ───────────────────────────────────────────────────
function AnimatedLayout() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        className="cr-page"
        initial={{ opacity: 0, y: 7 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -7 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Boot loader ──────────────────────────────────────────────────────────────
function BootLoader() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#0d0d0d',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 20,
      }}
    >
      <Text
        fw={700}
        size="xl"
        style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}
      >
        <span style={{ color: '#00FF41' }}>Civic</span>
        <span style={{ color: '#fff' }}>Resolve</span>
      </Text>
      <Loader color="#00FF41" size="sm" type="dots" />
    </motion.div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const { loading } = useAuth();
  if (loading) return <BootLoader />;
  return (

    <>
      <OfflineSyncDaemon />
      <Routes>
        {/* AnimatedLayout wraps all routes — provides fade+slide page transitions */}
        <Route element={<AnimatedLayout />}>

          {/* ── Public — no auth required ── */}
          <Route path="/"            element={<LandingPage />} />
          <Route path="/login"       element={<Login />} />
          <Route path="/register"    element={<Register />} />
          <Route path="/reports/:id"          element={<PublicReportDetail />} />
          <Route path="/ward-stats/:wardId"  element={<WardPublicStats />} />
          <Route path="/submit-anonymous"    element={<AnonSubmitReport />} />
          <Route path="/map"                 element={<MapView />} />

          {/* ── Citizen — role: citizen ── */}
          <Route element={<PrivateRoute allowedRole="citizen" />}>
            <Route path="/citizen/dashboard"      element={<CitizenDashboard />} />
            <Route path="/citizen/submit"         element={<SubmitReport />} />
            <Route path="/citizen/drafts"         element={<DraftsPage />} />
          </Route>

          {/* ── Shared Authenticated Pages ── */}
          <Route element={<PrivateRoute />}>
            <Route path="/notifications"          element={<NotificationsPage />} />
            <Route path="/profile"                element={<Profile />} />
            <Route path="/settings"               element={<Settings />} />
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

        </Route>{/* end AnimatedLayout */}
      </Routes>
    </>
  );
}
