import React, { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { AppShell, Container, SimpleGrid, Group, Stack, Box, Title, Text, Button, Badge, TextInput, SegmentedControl, Anchor, Card, ThemeIcon, Grid } from '@mantine/core';
import { IconMapPin, IconMessageReport, IconChartBar, IconLayoutDashboard, IconInfoCircle, IconSearch, IconRoad, IconDroplet, IconTrash, IconBulb, IconShieldCheck, IconTree, IconCamera, IconChecks } from '@tabler/icons-react';
import classes from './App.module.css';
import heroImage from './assets/360_F_238050460_ZGPCAPuUHKGW84XaL6m0A0l3pMNEQ5vp.jpg';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ReportIssue from './pages/ReportIssue';
import OfflineSyncDaemon from './components/OfflineSyncDaemon';

// Helper hook to count up live stats over 2 seconds
const StatCounter = ({ end, duration = 2000, suffix = "" }) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [end, duration]);

  return <Title order={2} c="white">{count.toLocaleString()}{suffix}</Title>;
};

function LandingPage() {
  return (
    <AppShell header={{ height: 70 }} padding={0}>
      <AppShell.Header>
        <Group h="100%" px="xl" justify="space-between" align="center">
          {/* Brand */}
          <Group gap="xs">
            <Text size="xl" fw={800} c="dark.9">📍 CivicResolve</Text>
          </Group>

          {/* Navigation Links (Strictly aligned to Backend Capabilities) */}
          <Group gap="lg" visibleFrom="lg">
            <Anchor component={Link} to="/" underline="never" c="dark.7" fw={500}><IconMapPin size={16} style={{ verticalAlign: 'middle', marginRight: 4 }}/>Home</Anchor>
            <Anchor component={Link} to="/dashboard" underline="never" c="dark.7" fw={500}><IconLayoutDashboard size={16} style={{ verticalAlign: 'middle', marginRight: 4 }}/>Map Dashboard</Anchor>
            <Anchor component={Link} to="/report" underline="never" c="dark.7" fw={500}><IconMessageReport size={16} style={{ verticalAlign: 'middle', marginRight: 4 }}/>Report Issue</Anchor>
            <Anchor component={Link} to="/about" underline="never" c="dark.7" fw={500}><IconInfoCircle size={16} style={{ verticalAlign: 'middle', marginRight: 4 }}/>About</Anchor>
          </Group>

          {/* Auth & Config */}
          <Group>
            <SegmentedControl data={['EN', 'বাং']} size="sm" radius="xl" />
            <Button component={Link} to="/login" variant="default" radius="md">Login</Button>
            <Button component={Link} to="/register" variant="filled" color="orange" radius="md">Register</Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        {/* Full-width Hero Section */}
        <div className={classes.heroBox} style={{ backgroundImage: `url(${heroImage})` }}>
          <div className={classes.heroOverlay} />
          <Container size="xl" className={classes.heroContent}>
            <Stack justify="center" h="100%" w={{ base: '100%', md: '60%' }} spacing="xl">
              <Badge color="orange" variant="filled" size="lg" radius="sm">CSE470 Project</Badge>
              <Title order={1} c="white" size="4.5rem" lh={1.1} mt="sm">CivicResolve</Title>
              <Text c="white" size="xl" fw={500} mb="xl">
                Report civic issues. Track resolution in real-time. Build a better city together.
              </Text>

              <TextInput 
                placeholder="Search issues in your area..." 
                size="xl" 
                radius="xl"
                leftSection={<IconSearch size={20} />}
                mb="md"
              />

              <Group>
                <Button component={Link} to="/dashboard" variant="filled" color="orange" size="lg" radius="md">🗺 Launch Map Dashboard</Button>
                <Button component={Link} to="/report" variant="outline" color="white" size="lg" radius="md">📋 Report an Issue</Button>
              </Group>
            </Stack>
          </Container>
        </div>

        {/* Live Stats Bar */}
        <Box bg="#1a3a6b" py={40}>
          <Container size="xl">
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
              <Stack align="center" gap="xs">
                <IconChecks size={32} color="orange" />
                <StatCounter end={1240} />
                <Text c="white" fw={500}>Issues Resolved</Text>
              </Stack>
              <Stack align="center" gap="xs">
                <IconMessageReport size={32} color="orange" />
                <StatCounter end={320} />
                <Text c="white" fw={500}>Active Reports</Text>
              </Stack>
              <Stack align="center" gap="xs">
                <IconMapPin size={32} color="orange" />
                <StatCounter end={12} />
                <Text c="white" fw={500}>Wards Covered</Text>
              </Stack>
              <Stack align="center" gap="xs">
                <IconChartBar size={32} color="orange" />
                <StatCounter end={98} suffix="%" />
                <Text c="white" fw={500}>Satisfaction</Text>
              </Stack>
            </SimpleGrid>
          </Container>
        </Box>

        {/* Feature Category Cards */}
        <Container size="xl" py={80}>
          <Title order={2} ta="center" c="#1a1a1a" mb={50}>Explore Categories</Title>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="xl">
            {[
              { icon: IconRoad, cat: 'Road Damage', desc: 'Potholes, cracks, broken pavements' },
              { icon: IconDroplet, cat: 'Water & Drainage', desc: 'Leaks, flooding, blocked drains' },
              { icon: IconTrash, cat: 'Waste Collection', desc: 'Missed pickups, illegal dumping' },
              { icon: IconBulb, cat: 'Street Lighting', desc: 'Broken streetlights, dark zones' },
              { icon: IconShieldCheck, cat: 'Public Safety', desc: 'Hazards, emergency infrastructure' },
              { icon: IconTree, cat: 'Parks & Recreation', desc: 'Damaged benches, overgrown areas' }
            ].map((f, i) => (
              <Card key={i} shadow="md" radius="lg" padding="xl" withBorder className={classes.categoryCard}>
                <ThemeIcon size={50} radius="md" color="orange" variant="light" mb="md">
                  <f.icon size={28} />
                </ThemeIcon>
                <Title order={4} c="#1a1a1a" mb="xs">{f.cat}</Title>
                <Text c="dimmed" size="sm" mb="lg">{f.desc}</Text>
                <Anchor component={Link} to="/dashboard" c="orange" fw={600} size="sm">View on Map →</Anchor>
              </Card>
            ))}
          </SimpleGrid>
        </Container>

        {/* How It Works Section */}
        <Box bg="white" py={80} style={{ borderTop: '1px solid #f1f3f5' }}>
          <Container size="xl">
            <Title order={2} ta="center" c="#1a1a1a" mb={60}>How It Works</Title>
            <Grid gutter="xl">
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Stack align="center" ta="center">
                  <ThemeIcon size={80} radius="xl" color="orange" variant="filled">
                    <Text size="1.5rem" fw={800}>1</Text>
                  </ThemeIcon>
                  <IconMapPin size={40} color="#1a1a1a" style={{ marginTop: 10 }} />
                  <Title order={4} c="#1a1a1a">Pin Your Location</Title>
                  <Text c="dimmed">Drop a pin or use GPS to mark the issue spot</Text>
                </Stack>
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Stack align="center" ta="center">
                  <ThemeIcon size={80} radius="xl" color="orange" variant="filled">
                    <Text size="1.5rem" fw={800}>2</Text>
                  </ThemeIcon>
                  <IconCamera size={40} color="#1a1a1a" style={{ marginTop: 10 }} />
                  <Title order={4} c="#1a1a1a">Submit Evidence</Title>
                  <Text c="dimmed">Upload photos or videos via Cloudinary</Text>
                </Stack>
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Stack align="center" ta="center">
                  <ThemeIcon size={80} radius="xl" color="orange" variant="filled">
                    <Text size="1.5rem" fw={800}>3</Text>
                  </ThemeIcon>
                  <IconChecks size={40} color="#1a1a1a" style={{ marginTop: 10 }} />
                  <Title order={4} c="#1a1a1a">Track Resolution</Title>
                  <Text c="dimmed">Get real-time updates via notifications</Text>
                </Stack>
              </Grid.Col>
            </Grid>
          </Container>
        </Box>

        {/* Activity Ticker */}
        <Box className={classes.tickerWrapper}>
          <div className={classes.tickerMarquee}>
             {/* We double the identical block arrays to create the infinite looping sensation */}
             {[...Array(2)].map((_, loopIndex) => (
               <React.Fragment key={loopIndex}>
                 <Badge color="green" size="lg" radius="sm" variant="dot">🛣 Road crack — Ward 12 — Resolved ✅</Badge>
                 <Badge color="blue" size="lg" radius="sm" variant="dot">💧 Water leak — Ward 5 — In Progress 🔄</Badge>
                 <Badge color="orange" size="lg" radius="sm" variant="dot">💡 Street light — Ward 2 — Assigned ⚠️</Badge>
                 <Badge color="red" size="lg" radius="sm" variant="dot">🚨 Pothole hazard — Ward 8 — Open ❗️</Badge>
                 <Badge color="green" size="lg" radius="sm" variant="dot">🗑 Missed garbage — Ward 1 — Resolved ✅</Badge>
                 <Badge color="blue" size="lg" radius="sm" variant="dot">🌳 Fallen tree — Ward 9 — In Progress 🔄</Badge>
                 <Badge color="red" size="lg" radius="sm" variant="dot">💧 Broken pipe — Ward 4 — Open ❗️</Badge>
                 <Badge color="orange" size="lg" radius="sm" variant="dot">🛣 Sidewalk block — Ward 7 — Assigned ⚠️</Badge>
               </React.Fragment>
             ))}
          </div>
        </Box>

        {/* Heatmap Preview Component */}
        <Box py={80} style={{ background: 'linear-gradient(to bottom, #fff4e6 0%, #ffffff 100%)' }}>
          <Container size="lg">
            <Card shadow="xl" radius="xl" padding="xl" ta="center" withBorder>
              <div className={classes.heatmapGradient} />
              <Title order={2} c="#1a1a1a" mt="xl" mb="sm">Live Issue Heatmap</Title>
              <Text c="dimmed" size="lg" mb="xl">See where civic problems are concentrated across all 12 wards.</Text>
              <Button component={Link} to="/dashboard/heatmap" variant="white" color="orange" size="lg" radius="md" style={{ border: '2px solid orange' }}>
                View Full Heatmap →
              </Button>
            </Card>
          </Container>
        </Box>

        {/* Footer Base */}
        <Box bg="#101827" py={40} mt={40}>
          <Container size="xl">
            <Grid>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Text c="white" fw={700} size="lg" mb="sm">CivicResolve</Text>
                <Text c="dimmed" size="xs">
                  Empowering citizens with AI-driven reporting protocols and ensuring transparent resolution matrices across all Wards.
                </Text>
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Text c="white" fw={700} mb="sm">Quick Links</Text>
                <Stack gap="xs">
                  <Anchor c="dimmed" size="xs">Map Dashboard</Anchor>
                  <Anchor c="dimmed" size="xs">Submit Report</Anchor>
                  <Anchor c="dimmed" size="xs">Privacy Policy</Anchor>
                </Stack>
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Text c="white" fw={700} mb="sm">Contact Us</Text>
                <Text c="dimmed" size="xs">Support: help@civicresolve.tech</Text>
                <Text c="dimmed" size="xs">Toll-free: +(880) 123-4567</Text>
              </Grid.Col>
            </Grid>
            <Box mt={40} pt={20} style={{ borderTop: '1px solid #1f2937' }}>
              <Text c="dimmed" size="xs" ta="center">
                © {new Date().getFullYear()} CivicResolve. All rights reserved. CSE470 System.
              </Text>
            </Box>
          </Container>
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}

function App() {
  return (
    <>
      <OfflineSyncDaemon />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/report" element={<ReportIssue />} />
        <Route path="*" element={<Text p="xl">Page Not Found. Routes will be built next.</Text>} />
      </Routes>
    </>
  );
}

export default App;
