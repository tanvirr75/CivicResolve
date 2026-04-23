import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Center, Loader, Box, Title, Text, Button, ThemeIcon, Stack } from '@mantine/core';
import { IconShieldOff, IconArrowLeft } from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';
import CivicAppShell from '../layouts/AppShell';

// ─── Design tokens ────────────────────────────────────────────────────────────
const GREEN     = '#00FF41';
const GREEN_DIM = 'rgba(0,255,65,0.10)';
const GREEN_BDR = 'rgba(0,255,65,0.25)';

// ─── Full-screen dark spinner ─────────────────────────────────────────────────
function PageLoader() {
  return (
    <Center style={{ width: '100vw', height: '100vh', background: '#0d0d0d' }}>
      <Loader color="civic" size="md" />
    </Center>
  );
}

// ─── 403 page ─────────────────────────────────────────────────────────────────
function ForbiddenPage({ requiredRole }) {
  return (
    <Box
      style={{
        minHeight: '100vh',
        background: '#0d0d0d',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Stack align="center" gap="lg" maw={420} ta="center">
        <ThemeIcon
          size={80}
          radius="xl"
          style={{
            background: GREEN_DIM,
            border: `2px solid ${GREEN_BDR}`,
            color: GREEN,
          }}
        >
          <IconShieldOff size={38} />
        </ThemeIcon>

        <Box>
          <Title
            order={1}
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              color: '#fff',
              letterSpacing: '-0.03em',
              fontSize: '4rem',
              lineHeight: 1,
            }}
          >
            403
          </Title>
          <Title
            order={3}
            mt="xs"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              color: '#fff',
              letterSpacing: '-0.01em',
            }}
          >
            Access Denied
          </Title>
        </Box>

        <Text size="sm" c="dimmed" lh={1.6}>
          You don't have permission to view this page.
          {requiredRole && (
            <>
              {' '}This area requires the{' '}
              <Text component="span" c="civic.4" fw={600}>
                {requiredRole.replace(/_/g, ' ')}
              </Text>{' '}
              role.
            </>
          )}
        </Text>

        <Button
          component="a"
          href="/"
          size="sm"
          radius="md"
          color="civic"
          leftSection={<IconArrowLeft size={15} />}
          style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}
        >
          Go back home
        </Button>
      </Stack>
    </Box>
  );
}

// ─── PrivateRoute ─────────────────────────────────────────────────────────────
// Props:
//   allowedRole  — string | string[]  (e.g. 'citizen' or ['ward_official','system_admin'])
//   withShell    — bool (default true) — wrap Outlet in CivicAppShell
//
// Usage in App.jsx:
//   <Route element={<PrivateRoute allowedRole="citizen" />}>
//     <Route path="/citizen/dashboard" element={<CitizenDashboard />} />
//   </Route>
export default function PrivateRoute({ allowedRole, withShell = true }) {
  const { isAuthenticated, hasRole, loading } = useAuth();
  const location = useLocation();

  // Still hydrating JWT — show spinner, not redirect
  if (loading) return <PageLoader />;

  // Not logged in → /login (preserve intended destination)
  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Wrong role → 403 (don't redirect, show inline)
  if (allowedRole && !hasRole(allowedRole)) {
    return <ForbiddenPage requiredRole={Array.isArray(allowedRole) ? allowedRole[0] : allowedRole} />;
  }

  // Authorised → render child routes inside the app shell (or bare if withShell=false)
  return withShell
    ? <CivicAppShell><Outlet /></CivicAppShell>
    : <Outlet />;
}
