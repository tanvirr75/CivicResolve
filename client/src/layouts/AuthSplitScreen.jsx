import React from 'react';
import { Box, Flex, Text, Title, Stack } from '@mantine/core';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const GREEN = '#00FF41';
const BORDER = 'rgba(255,255,255,0.08)';

export default function AuthSplitScreen({ children }) {
  return (
    <Flex style={{ minHeight: '100vh', background: '#0d0d0d' }} direction={{ base: 'column', md: 'row' }}>
      {/* ── Left side: Branding / Image (Hidden on mobile) ── */}
      <Box
        visibleFrom="md"
        style={{
          flex: 1.2,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 64,
          borderRight: `1px solid ${BORDER}`,
          overflow: 'hidden',
        }}
      >
        {/* Animated Isometric Background */}
        <motion.div
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.3 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url('/isometric-city.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: 0,
          }}
        />
        
        {/* Gradient Overlay */}
        <Box
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(13,13,13,0.95) 0%, rgba(13,13,13,0.7) 100%)',
            zIndex: 1,
          }}
        />

        {/* Branding Content */}
        <Stack style={{ position: 'relative', zIndex: 2 }} gap="xl" maw={480}>
          <Text
            component={Link}
            to="/"
            fw={700}
            size="2rem"
            style={{ fontFamily: "'Space Grotesk', sans-serif", textDecoration: 'none', letterSpacing: '-0.02em' }}
          >
            <span style={{ color: GREEN }}>Civic</span>
            <span style={{ color: '#fff' }}>Resolve</span>
          </Text>

          <motion.div initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
            <Title order={1} style={{ color: '#fff', fontFamily: "'Space Grotesk', sans-serif", fontSize: '2.5rem', lineHeight: 1.2 }}>
              Empowering smart cities through AI-driven insights.
            </Title>
          </motion.div>

          <motion.div initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
            <Text size="lg" c="dimmed" lh={1.6}>
              Report issues, track progress, and contribute to a cleaner, safer community with real-time geospatial tracking and automated severity analysis.
            </Text>
          </motion.div>
        </Stack>
      </Box>

      {/* ── Right side: Form Container ── */}
      <Box
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
          position: 'relative',
        }}
      >
        {/* Subtle grid pattern behind the form */}
        <Box
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: `
              linear-gradient(rgba(0,255,65,0.02) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,255,65,0.02) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
            pointerEvents: 'none',
          }}
        />
        <Box w="100%" maw={440} style={{ position: 'relative', zIndex: 1 }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            {children}
          </motion.div>
        </Box>
      </Box>
    </Flex>
  );
}
