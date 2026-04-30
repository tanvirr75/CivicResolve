import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Container,
  Title,
  Text,
  Button,
  Group,
  Stack,
  SimpleGrid,
  Card,
  ThemeIcon,
  Badge,
  Anchor,
  Divider,
  Drawer,
  Burger,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useAnimation, useInView } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
  IconRoad,
  IconDroplet,
  IconBulb,
  IconTrash,
  IconBrain,
  IconBell,
  IconMapPin,
  IconFlame,
  IconFileText,
  IconWifi,
  IconCircleCheck,
  IconArrowRight,
  IconShieldCheck,
  IconUsers,
  IconTool,
  IconCheck,
} from '@tabler/icons-react';

// ─── Design tokens (matches theme.js) ────────────────────────────────────────
const GREEN     = '#00FF41';
const GREEN_DIM = 'rgba(0,255,65,0.12)';
const GREEN_BDR = 'rgba(0,255,65,0.3)';
const DARK_CARD = 'rgba(20,20,20,0.4)';
const BORDER    = 'rgba(255,255,255,0.08)';

// ─── Reusable scroll-reveal wrapper ──────────────────────────────────────────
function Reveal({ children, delay = 0, y = 30 }) {
  const ref      = useRef(null);
  const inView   = useInView(ref, { once: true, margin: '-80px' });
  const controls = useAnimation();

  useEffect(() => {
    if (inView) controls.start('visible');
  }, [inView, controls]);

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={controls}
      variants={{
        hidden:  { opacity: 0, y },
        visible: { opacity: 1, y: 0, transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] } },
      }}
    >
      {children}
    </motion.div>
  );
}

// ─── Floating icon tile (used in hero) ───────────────────────────────────────
function FloatingIcon({ icon: Icon, color, delay, x, y, size = 44 }) {
  return (
    <motion.div
      style={{ position: 'absolute', left: x, top: y }}
      animate={{ y: [0, -14, 0] }}
      transition={{ duration: 3.5 + delay * 0.5, repeat: Infinity, ease: 'easeInOut', delay }}
    >
      <ThemeIcon
        size={size}
        radius="md"
        style={{
          background: GREEN_DIM,
          border: `1px solid ${GREEN_BDR}`,
          color: GREEN,
          boxShadow: `0 0 20px ${GREEN_DIM}`,
        }}
      >
        <Icon size={size * 0.45} />
      </ThemeIcon>
    </motion.div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <Badge
      variant="outline"
      color="civic"
      radius="sm"
      size="sm"
      style={{ letterSpacing: '0.10em', fontFamily: "'Space Grotesk', sans-serif" }}
    >
      {children}
    </Badge>
  );
}

// ─── Feature cards data ───────────────────────────────────────────────────────
const FEATURES = [
  { icon: IconBrain,    title: 'AI Auto-Categorization',    desc: 'Gemini AI tags and routes every report by type and severity instantly.' },
  { icon: IconBell,     title: 'Real-Time Notifications',   desc: 'Socket.io pushes live status updates to citizens and ward officials.' },
  { icon: IconMapPin,   title: 'Geo-Tagged Reports',        desc: 'Every submission is pinned to an exact GPS coordinate on the live map.' },
  { icon: IconFlame,    title: 'Heatmap Visualization',     desc: 'Density overlays reveal civic hotspots across all 12 wards at a glance.' },
  { icon: IconFileText, title: 'Work Order PDF',            desc: 'One-click PDF dispatch to field workers — generated and stored instantly.' },
  { icon: IconWifi,     title: 'Offline Draft Mode',        desc: 'Cache reports locally; they auto-sync the moment connectivity returns.' },
];

// ─── Who uses data ────────────────────────────────────────────────────────────
const USER_TYPES = [
  {
    role: 'Citizens',
    icon: IconUsers,
    color: '#00FF41',
    desc: 'Report broken infrastructure and safety hazards directly from your phone — with GPS precision and AI routing.',
    actions: ['Pin & photograph issues', 'Track resolution in real time', 'Upvote similar reports'],
  },
  {
    role: 'Ward Officials',
    icon: IconShieldCheck,
    color: '#60a5fa',
    desc: 'Receive AI-triaged reports, dispatch the nearest field worker, and monitor ward KPIs from one dashboard.',
    actions: ['AI-prioritised report queue', 'One-click worker dispatch', 'PDF work order generation'],
  },
  {
    role: 'Field Workers',
    icon: IconTool,
    color: '#f59e0b',
    desc: 'Get digital work orders with embedded maps and citizen evidence, then close issues with a proof photo upload.',
    actions: ['Digital work order with map', 'On-site progress stepper', 'Photo proof submission'],
  },
];

// ─── How it works steps ───────────────────────────────────────────────────────
const STEPS = [
  { n: '01', title: 'Submit',          desc: 'Pin a location, describe the issue, upload evidence.' },
  { n: '02', title: 'AI Routes',       desc: 'Gemini categorises, scores severity, detects duplicates.' },
  { n: '03', title: 'Worker Assigned', desc: 'Ward official dispatches the closest field worker.' },
  { n: '04', title: 'Resolved',        desc: 'Worker uploads proof; citizen receives closure notification.' },
];

// ─── Main component ───────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [scrolled, setScrolled]   = useState(false);
  const [navOpen,  { open: openNav, close: closeNav }] = useDisclosure(false);

  const dashboardUrl =
    user?.role === 'ward_official' ? '/ward/dashboard' :
    user?.role === 'field_worker'  ? '/field/dashboard' :
    user?.role === 'system_admin'  ? '/admin/dashboard' :
    '/citizen/dashboard';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <Box style={{ background: '#0d0d0d', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* Mobile nav drawer */}
      <Drawer
        opened={navOpen}
        onClose={closeNav}
        size="xs"
        padding="md"
        title={
          <Text fw={700} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <span style={{ color: GREEN }}>Civic</span>
            <span style={{ color: '#fff' }}>Resolve</span>
          </Text>
        }
        styles={{
          content: { background: '#0d0d0d', borderRight: `1px solid ${BORDER}` },
          header:  { background: '#0d0d0d', borderBottom: `1px solid ${BORDER}` },
        }}
      >
        <Stack gap="md" mt="md">
          {[
            { label: 'Public Map', to: '/map' },
            ...(isAuthenticated() ? [{ label: 'Dashboard', to: dashboardUrl }] : []),
            ...(!isAuthenticated() ? [
              { label: 'Login', to: '/login' },
              { label: 'Register', to: '/register' }
            ] : []),
          ].map(link => (
            <Anchor
              key={link.label}
              component={Link}
              to={link.to}
              size="sm"
              c="dimmed"
              underline="never"
              onClick={closeNav}
              style={{ transition: 'color .15s' }}
              onMouseEnter={e => e.target.style.color = GREEN}
              onMouseLeave={e => e.target.style.color = ''}
            >
              {link.label}
            </Anchor>
          ))}
          {!isAuthenticated() ? (
            <Button
              component={Link} to="/register"
              size="sm" radius="md" color="civic" fullWidth
              onClick={closeNav}
              style={{ fontFamily: "'Space Grotesk', sans-serif", marginTop: 8 }}
            >
              Get Started
            </Button>
          ) : (
            <Button
              component={Link} to={dashboardUrl}
              size="sm" radius="md" color="civic" fullWidth
              onClick={closeNav}
              style={{ fontFamily: "'Space Grotesk', sans-serif", marginTop: 8 }}
            >
              Go to Dashboard
            </Button>
          )}
        </Stack>
      </Drawer>

      {/* Top nav */}
      <Box
        component="nav"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          background: scrolled
            ? 'rgba(13,13,13,0.98)'
            : 'rgba(13,13,13,0.85)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderBottom: `1px solid ${scrolled ? 'rgba(255,255,255,0.10)' : BORDER}`,
          boxShadow: scrolled ? '0 4px 24px rgba(0,0,0,0.4)' : 'none',
          padding: '0 24px',
          height: 58,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          transition: 'background 0.25s, border-color 0.25s, box-shadow 0.25s',
        }}
      >
        <Text
          fw={700}
          size="lg"
          style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}
        >
          <span style={{ color: GREEN }}>Civic</span>
          <span style={{ color: '#fff' }}>Resolve</span>
        </Text>

        {/* Desktop links */}
        <Group gap="xs" visibleFrom="sm">
          <Anchor component={Link} to="/map" c="dimmed" size="sm" underline="never"
            style={{ transition: 'color .15s' }}
            onMouseEnter={e => e.target.style.color = '#fff'}
            onMouseLeave={e => e.target.style.color = ''}
          >
            Public Map
          </Anchor>
          {!isAuthenticated() ? (
            <>
              <Anchor component={Link} to="/login" c="dimmed" size="sm" underline="never"
                style={{ transition: 'color .15s', marginLeft: 16, marginRight: 8 }}
                onMouseEnter={e => e.target.style.color = '#fff'}
                onMouseLeave={e => e.target.style.color = ''}
              >
                Login
              </Anchor>
              <Button
                component={Link} to="/register"
                size="xs" radius="md" color="civic"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Get Started
              </Button>
            </>
          ) : (
            <Button
              component={Link} to={dashboardUrl}
              size="xs" radius="md" color="civic" ml="md"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Dashboard
            </Button>
          )}
        </Group>

        {/* Mobile hamburger */}
        <Burger
          opened={navOpen}
          onClick={openNav}
          hiddenFrom="sm"
          size="sm"
          color={GREEN}
        />
      </Box>

      {/* ════════════════════════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════════════════════════ */}
      <Box
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          paddingTop: 58,
        }}
      >
        {/* Isometric Smart City Background */}
        <Box
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url('/isometric-city.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: 0.25,
            pointerEvents: 'none',
          }}
        />

        {/* Dark gradient overlay for text readability */}
        <Box
          style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(13,13,13,0.7) 0%, rgba(13,13,13,0.95) 80%, rgba(13,13,13,1) 100%)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        {/* Dynamic glowing orbs */}
        <Box style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute', top: '10%', left: '15%',
              width: '40vw', height: '40vw',
              background: `radial-gradient(circle, ${GREEN_DIM} 0%, transparent 70%)`,
              filter: 'blur(60px)',
            }}
          />
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            style={{
              position: 'absolute', bottom: '-10%', right: '5%',
              width: '50vw', height: '50vw',
              background: `radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)`,
              filter: 'blur(80px)',
            }}
          />
        </Box>

        {/* Floating category icons (desktop-only decoration) */}
        <Box style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} visibleFrom="lg">
          <FloatingIcon icon={IconRoad}     delay={0}   x="8%"  y="25%" />
          <FloatingIcon icon={IconDroplet}  delay={0.7} x="12%" y="62%" />
          <FloatingIcon icon={IconBulb}     delay={1.2} x="82%" y="20%" />
          <FloatingIcon icon={IconTrash}    delay={0.4} x="78%" y="65%" />
          <FloatingIcon icon={IconMapPin}   delay={1.8} x="88%" y="42%" size={38} />
          <FloatingIcon icon={IconShieldCheck} delay={0.9} x="4%" y="44%" size={38} />
        </Box>

        <Container size="lg" style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <Stack align="center" gap="xl">

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge
                variant="outline" color="civic" radius="sm" size="sm"
                leftSection={<IconCircleCheck size={11} />}
                style={{ letterSpacing: '0.08em', marginBottom: 24 }}
              >
                AI-Powered Civic Platform · CSE470
              </Badge>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Title
                order={1}
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 'clamp(2.6rem, 6vw, 5rem)',
                  lineHeight: 1.08,
                  letterSpacing: '-0.03em',
                  color: '#fff',
                  maxWidth: 800,
                }}
              >
                Report.{' '}
                <span style={{ color: GREEN, textShadow: `0 0 40px ${GREEN}55` }}>
                  Resolve.
                </span>{' '}
                Rebuild.
              </Title>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.22 }}
            >
              <Text
                size="xl"
                c="dimmed"
                style={{ maxWidth: 540, lineHeight: 1.6, fontWeight: 400 }}
              >
                AI-powered civic issue reporting for smarter cities.
                Pin it. Report it. Watch it get fixed.
              </Text>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.34 }}
            >
              <Group justify="center" gap="md">
                <Button
                  component={Link}
                  to={isAuthenticated() ? "/citizen/submit" : "/login"}
                  size="lg"
                  radius="md"
                  color="civic"
                  rightSection={<IconArrowRight size={18} />}
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 700,
                    boxShadow: `0 0 24px rgba(0,255,65,0.35)`,
                    letterSpacing: '0.01em',
                  }}
                >
                  Report an Issue
                </Button>
                <Button
                  component={Link}
                  to="/map"
                  size="lg"
                  radius="md"
                  variant="outline"
                  color="civic"
                  leftSection={<IconMapPin size={18} />}
                  style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, backdropFilter: 'blur(10px)' }}
                >
                  Explore Map
                </Button>
              </Group>
            </motion.div>

          </Stack>
        </Container>
      </Box>

      {/* ════════════════════════════════════════════════════════════════════
          STATS STRIP
      ════════════════════════════════════════════════════════════════════ */}
      <Box style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <Container size="lg" py={48}>
          <Reveal>
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xl">
              {[
                { value: '2,400+', label: 'Issues Resolved',  icon: IconCircleCheck },
                { value: '12',    label: 'Wards Covered',     icon: IconMapPin },
                { value: '98%',   label: 'Response Rate',     icon: IconUsers },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card
                    key={stat.label}
                    p="xl"
                    radius="md"
                    style={{
                      background: DARK_CARD,
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      border: `1px solid ${BORDER}`,
                      borderTop: `3px solid ${GREEN}`,
                      textAlign: 'center',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    }}
                  >
                    <ThemeIcon
                      size={40} radius="md" mb="md" mx="auto"
                      style={{ background: GREEN_DIM, border: `1px solid ${GREEN_BDR}`, color: GREEN }}
                    >
                      <Icon size={20} />
                    </ThemeIcon>
                    <Title
                      order={2}
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        color: GREEN,
                        fontSize: '2.2rem',
                        letterSpacing: '-0.03em',
                      }}
                    >
                      {stat.value}
                    </Title>
                    <Text c="dimmed" size="sm" fw={500} mt={4}>{stat.label}</Text>
                  </Card>
                );
              })}
            </SimpleGrid>
          </Reveal>
        </Container>
      </Box>

      {/* ════════════════════════════════════════════════════════════════════
          WHO USES CIVICRESOLVE
      ════════════════════════════════════════════════════════════════════ */}
      <Box style={{ borderTop: `1px solid ${BORDER}` }}>
        <Container size="lg" py={96}>
          <Stack align="center" gap="xs" mb={56}>
            <Reveal><SectionLabel>Who Uses It</SectionLabel></Reveal>
            <Reveal delay={0.1}>
              <Title
                order={2}
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  color: '#fff',
                  textAlign: 'center',
                  letterSpacing: '-0.025em',
                  fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
                }}
              >
                Built for every role in the civic chain
              </Title>
            </Reveal>
            <Reveal delay={0.15}>
              <Text c="dimmed" size="md" ta="center" maw={480} lh={1.7}>
                Three user types, one unified platform — each with purpose-built tools for their place in the workflow.
              </Text>
            </Reveal>
          </Stack>

          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
            {USER_TYPES.map((u, i) => {
              const Icon = u.icon;
              return (
                <Reveal key={u.role} delay={i * 0.1}>
                  <motion.div whileHover={{ y: -5 }} transition={{ duration: 0.2 }}>
                    <Card
                      p="xl"
                      radius="md"
                      h="100%"
                      style={{
                        background: DARK_CARD,
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        border: `1px solid ${BORDER}`,
                        borderTop: `3px solid ${u.color}`,
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                      }}
                    >
                      <ThemeIcon
                        size={48} radius="md" mb="md"
                        style={{
                          background: `${u.color}18`,
                          border: `1px solid ${u.color}44`,
                          color: u.color,
                        }}
                      >
                        <Icon size={24} />
                      </ThemeIcon>

                      <Title
                        order={4}
                        mb="xs"
                        style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff' }}
                      >
                        {u.role}
                      </Title>

                      <Text size="sm" c="dimmed" lh={1.65} mb="lg" style={{ flex: 1 }}>
                        {u.desc}
                      </Text>

                      <Stack gap={8}>
                        {u.actions.map(action => (
                          <Group key={action} gap="xs" align="center">
                            <IconCheck size={13} style={{ color: u.color, flexShrink: 0 }} />
                            <Text size="xs" c="dimmed">{action}</Text>
                          </Group>
                        ))}
                      </Stack>
                    </Card>
                  </motion.div>
                </Reveal>
              );
            })}
          </SimpleGrid>
        </Container>
      </Box>

      {/* ════════════════════════════════════════════════════════════════════
          FEATURES GRID
      ════════════════════════════════════════════════════════════════════ */}
      <Container size="lg" py={96}>
        <Stack align="center" gap="xs" mb={56}>
          <Reveal>
            <SectionLabel>Platform Features</SectionLabel>
          </Reveal>
          <Reveal delay={0.1}>
            <Title
              order={2}
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                color: '#fff',
                textAlign: 'center',
                letterSpacing: '-0.025em',
                fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
              }}
            >
              Everything a smart city needs
            </Title>
          </Reveal>
          <Reveal delay={0.15}>
            <Text c="dimmed" size="md" ta="center" maw={500} lh={1.7}>
              Six core modules — each mapped directly to a functional requirement in the SRS spec.
            </Text>
          </Reveal>
        </Stack>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <Reveal key={f.title} delay={i * 0.07}>
                <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
                  <Card
                    p="xl"
                    radius="md"
                    h="100%"
                    style={{
                      background: DARK_CARD,
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      border: `1px solid ${BORDER}`,
                      cursor: 'default',
                      transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = GREEN_BDR;
                      e.currentTarget.style.boxShadow = `0 12px 40px rgba(0,255,65,0.15)`;
                      e.currentTarget.style.transform = 'translateY(-4px)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = BORDER;
                      e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <ThemeIcon
                      size={44} radius="md" mb="md"
                      style={{ background: GREEN_DIM, border: `1px solid ${GREEN_BDR}`, color: GREEN }}
                    >
                      <Icon size={22} />
                    </ThemeIcon>
                    <Group justify="space-between" align="flex-start" mb={8}>
                      <Title order={5} style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff' }}>
                        {f.title}
                      </Title>
                    </Group>
                    <Text size="sm" c="dimmed" lh={1.65}>{f.desc}</Text>
                  </Card>
                </motion.div>
              </Reveal>
            );
          })}
        </SimpleGrid>
      </Container>

      {/* ════════════════════════════════════════════════════════════════════
          HOW IT WORKS
      ════════════════════════════════════════════════════════════════════ */}
      <Box style={{ borderTop: `1px solid ${BORDER}` }}>
        <Container size="lg" py={96}>
          <Stack align="center" gap="xs" mb={56}>
            <Reveal><SectionLabel>Process</SectionLabel></Reveal>
            <Reveal delay={0.1}>
              <Title
                order={2}
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  color: '#fff',
                  textAlign: 'center',
                  letterSpacing: '-0.025em',
                  fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
                }}
              >
                How CivicResolve works
              </Title>
            </Reveal>
          </Stack>

          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
            {STEPS.map((step, i) => (
              <Reveal key={step.n} delay={i * 0.1}>
                <Card
                  p="xl"
                  radius="md"
                  style={{
                    background: DARK_CARD,
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: `1px solid ${BORDER}`,
                    position: 'relative',
                    overflow: 'visible',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                  }}
                >
                  {/* Connector line (all except last) */}
                  {i < STEPS.length - 1 && (
                    <Box
                      visibleFrom="lg"
                      style={{
                        position: 'absolute',
                        top: 36,
                        right: -32,
                        width: 32,
                        height: 1,
                        background: `linear-gradient(to right, ${GREEN_BDR}, transparent)`,
                        zIndex: 1,
                      }}
                    />
                  )}

                  {/* Step number */}
                  <Box
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: GREEN_DIM,
                      border: `1.5px solid ${GREEN}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 20,
                      boxShadow: `0 0 16px ${GREEN_DIM}`,
                    }}
                  >
                    <Text
                      fw={700}
                      size="sm"
                      style={{ fontFamily: "'Space Grotesk', sans-serif", color: GREEN, letterSpacing: '-0.02em' }}
                    >
                      {step.n}
                    </Text>
                  </Box>

                  <Title order={5} mb={8} style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fff' }}>
                    {step.title}
                  </Title>
                  <Text size="sm" c="dimmed" lh={1.65}>{step.desc}</Text>
                </Card>
              </Reveal>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      {/* ════════════════════════════════════════════════════════════════════
          PLATFORM PREVIEW
      ════════════════════════════════════════════════════════════════════ */}
      <Box style={{ borderTop: `1px solid ${BORDER}` }}>
        <Container size="lg" py={96}>
          <Stack align="center" gap="xs" mb={56}>
            <Reveal><SectionLabel>Platform Preview</SectionLabel></Reveal>
            <Reveal delay={0.1}>
              <Title
                order={2}
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  color: '#fff',
                  textAlign: 'center',
                  letterSpacing: '-0.025em',
                  fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
                }}
              >
                See it in action
              </Title>
            </Reveal>
            <Reveal delay={0.15}>
              <Text c="dimmed" size="md" ta="center" maw={500} lh={1.7}>
                A live dashboard that surfaces what matters — prioritised by AI severity scoring and community upvotes.
              </Text>
            </Reveal>
          </Stack>

          <Reveal delay={0.1}>
            {/* Browser chrome wrapper */}
            <Box
              style={{
                borderRadius: 14,
                overflow: 'hidden',
                border: `1px solid ${GREEN_BDR}`,
                boxShadow: `0 0 80px rgba(0,255,65,0.08), 0 40px 80px rgba(0,0,0,0.6)`,
              }}
            >
              {/* Browser top bar */}
              <Box
                style={{
                  background: '#181818',
                  borderBottom: `1px solid ${BORDER}`,
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Box style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
                <Box style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b' }} />
                <Box style={{ width: 12, height: 12, borderRadius: '50%', background: GREEN }} />
                <Box
                  style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${BORDER}`,
                    borderRadius: 6,
                    padding: '3px 12px',
                    marginLeft: 12,
                  }}
                >
                  <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace' }}>
                    civicresolve.app/citizen/dashboard
                  </Text>
                </Box>
              </Box>

              {/* App shell */}
              <Box style={{ display: 'flex', background: '#0d0d0d', minHeight: 380 }}>
                {/* Sidebar */}
                <Box
                  visibleFrom="sm"
                  style={{
                    width: 200,
                    background: '#111',
                    borderRight: `1px solid ${BORDER}`,
                    padding: '20px 0',
                    flexShrink: 0,
                  }}
                >
                  <Text
                    size="sm"
                    fw={700}
                    px="md"
                    mb="lg"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    <span style={{ color: GREEN }}>Civic</span>
                    <span style={{ color: '#fff' }}>Resolve</span>
                  </Text>
                  {[
                    { label: 'Dashboard',      active: true },
                    { label: 'My Reports',     active: false },
                    { label: 'Submit Issue',   active: false },
                    { label: 'Live Map',       active: false },
                    { label: 'Profile',        active: false },
                  ].map(item => (
                    <Box
                      key={item.label}
                      px="md"
                      py={8}
                      style={{
                        background: item.active ? GREEN_DIM : 'transparent',
                        borderLeft: item.active ? `3px solid ${GREEN}` : '3px solid transparent',
                        cursor: 'default',
                      }}
                    >
                      <Text size="xs" c={item.active ? GREEN : 'dimmed'} fw={item.active ? 600 : 400}>
                        {item.label}
                      </Text>
                    </Box>
                  ))}
                </Box>

                {/* Main content */}
                <Box style={{ flex: 1, padding: '20px 24px', overflow: 'hidden' }}>
                  {/* Stats row */}
                  <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm" mb="md">
                    {[
                      { label: 'Open',        value: '12', color: '#FFD700' },
                      { label: 'In Progress', value: '5',  color: '#fb923c' },
                      { label: 'Resolved',    value: '38', color: GREEN },
                      { label: 'Total',       value: '55', color: '#a78bfa' },
                    ].map(s => (
                      <Card
                        key={s.label}
                        p="sm"
                        radius="md"
                        style={{
                          background: DARK_CARD,
                          border: `1px solid ${BORDER}`,
                          borderTop: `2px solid ${s.color}`,
                        }}
                      >
                        <Text size="xs" c="dimmed" tt="uppercase" style={{ letterSpacing: '0.06em', fontSize: '0.65rem' }}>
                          {s.label}
                        </Text>
                        <Text fw={800} size="lg" style={{ color: s.color, fontFamily: "'Space Grotesk', sans-serif" }}>
                          {s.value}
                        </Text>
                      </Card>
                    ))}
                  </SimpleGrid>

                  {/* Mock report table */}
                  <Card p="sm" radius="md" style={{ background: DARK_CARD, border: `1px solid ${BORDER}` }}>
                    <Text size="xs" fw={700} c="white" mb="sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      My Reports
                    </Text>
                    <Stack gap={8}>
                      {[
                        { title: 'Broken street lamp on Mirpur Rd.', status: 'In Progress', prio: 4, cat: 'Lighting' },
                        { title: 'Overflowing drain near school',    status: 'Assigned',    prio: 3, cat: 'Drainage' },
                        { title: 'Pothole on Gulshan Avenue',        status: 'Open',        prio: 5, cat: 'Road' },
                        { title: 'Illegal dumping in Banani park',   status: 'Resolved',    prio: 2, cat: 'Waste' },
                      ].map((r, i) => (
                        <Box
                          key={i}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '6px 8px',
                            borderRadius: 6,
                            background: 'rgba(255,255,255,0.02)',
                            borderLeft: r.prio >= 4 ? '2px solid #ef4444' : r.prio >= 3 ? '2px solid #f59e0b' : '2px solid transparent',
                          }}
                        >
                          <Text size="xs" c="white" style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {r.title}
                          </Text>
                          <Badge
                            size="xs"
                            variant="dot"
                            color="cyan"
                            style={{ flexShrink: 0 }}
                            visibleFrom="md"
                          >
                            {r.cat}
                          </Badge>
                          <Badge
                            size="xs"
                            variant="light"
                            color={r.status === 'Resolved' ? 'teal' : r.status === 'In Progress' ? 'orange' : r.status === 'Assigned' ? 'blue' : 'yellow'}
                            style={{ flexShrink: 0 }}
                          >
                            {r.status}
                          </Badge>
                        </Box>
                      ))}
                    </Stack>
                  </Card>
                </Box>
              </Box>
            </Box>
          </Reveal>
        </Container>
      </Box>

      {/* ════════════════════════════════════════════════════════════════════
          CTA BANNER
      ════════════════════════════════════════════════════════════════════ */}
      <Box style={{ borderTop: `1px solid ${BORDER}` }}>
        <Container size="lg" py={96}>
          <Reveal>
            <Card
              p={{ base: 'xl', md: 64 }}
              radius="md"
              style={{
                background: `
                  radial-gradient(ellipse at 60% 50%, rgba(0,255,65,0.08) 0%, transparent 65%),
                  ${DARK_CARD}
                `,
                border: `1px solid ${GREEN_BDR}`,
                textAlign: 'center',
              }}
            >
              <Title
                order={2}
                mb="md"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  color: '#fff',
                  letterSpacing: '-0.025em',
                  fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                }}
              >
                Ready to make your city better?
              </Title>
              <Text c="dimmed" mb={32} size="md" maw={480} mx="auto" lh={1.7}>
                Join thousands of citizens already using CivicResolve to report and track civic issues in real time.
              </Text>
              <Group justify="center" gap="md">
                <Button
                  component={Link}
                  to="/register"
                  size="lg"
                  radius="md"
                  color="civic"
                  rightSection={<IconArrowRight size={18} />}
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 700,
                    boxShadow: `0 0 28px rgba(0,255,65,0.3)`,
                  }}
                >
                  Create Free Account
                </Button>
                <Button
                  component={Link}
                  to="/map"
                  size="lg"
                  radius="md"
                  variant="subtle"
                  color="civic"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Explore the Map →
                </Button>
              </Group>
            </Card>
          </Reveal>
        </Container>
      </Box>

      {/* ════════════════════════════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════════════════════════════ */}
      <Box style={{ borderTop: `1px solid ${BORDER}` }}>
        <Container size="lg" py={48}>
          <Group justify="space-between" align="flex-start" wrap="wrap" gap="xl">

            {/* Brand */}
            <Stack gap={6} maw={280}>
              <Text
                fw={700}
                size="lg"
                style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}
              >
                <span style={{ color: GREEN }}>Civic</span>
                <span style={{ color: '#fff' }}>Resolve</span>
              </Text>
              <Text size="xs" c="dimmed" lh={1.7}>
                AI-powered civic issue reporting platform built for transparent, accountable local governance.
              </Text>
            </Stack>

            {/* Links */}
            <Group gap={48} align="flex-start" wrap="wrap">
              <Stack gap={10}>
                <Text size="xs" fw={700} c="white" tt="uppercase" style={{ letterSpacing: '0.08em' }}>
                  Platform
                </Text>
                {[
                  { label: 'Map Dashboard', to: '/dashboard' },
                  { label: 'Submit Report',  to: '/report' },
                  { label: 'Register',       to: '/register' },
                  { label: 'Login',          to: '/login' },
                ].map(link => (
                  <Anchor
                    key={link.label}
                    component={Link}
                    to={link.to}
                    c="dimmed"
                    size="sm"
                    underline="never"
                    style={{ transition: 'color .15s' }}
                    onMouseEnter={e => e.target.style.color = GREEN}
                    onMouseLeave={e => e.target.style.color = ''}
                  >
                    {link.label}
                  </Anchor>
                ))}
              </Stack>

              <Stack gap={10}>
                <Text size="xs" fw={700} c="white" tt="uppercase" style={{ letterSpacing: '0.08em' }}>
                  Project
                </Text>
                {['CSE470 — Software Engineering', 'BRAC University', 'Spring 2026'].map(t => (
                  <Text key={t} size="sm" c="dimmed">{t}</Text>
                ))}
              </Stack>
            </Group>
          </Group>

          <Divider my={32} color={BORDER} />

          <Group justify="space-between" wrap="wrap" gap="xs">
            <Text size="xs" c="dimmed">
              © {new Date().getFullYear()} CivicResolve. All rights reserved.
            </Text>
            <Text size="xs" c="dimmed">
              Built with React · Mantine v7 · Node.js · MongoDB · Gemini AI
            </Text>
          </Group>
        </Container>
      </Box>

    </Box>
  );
}
