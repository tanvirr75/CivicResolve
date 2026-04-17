import React, { useState, useEffect } from 'react';
import { AppShell, Group, Title, Text, TextInput, Textarea, Button, Switch, Grid, FileInput, Anchor, Stack, Paper, Box, Alert, List } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useLocalStorage } from '@mantine/hooks';
import { IconMapPin, IconPhoto, IconLayoutDashboard, IconInfoCircle, IconMessageReport, IconUpload, IconAlertTriangle } from '@tabler/icons-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Link, useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import API from '../services/api';
import NotificationsMenu from '../components/NotificationsMenu';
import SystemAdminMenu from '../components/SystemAdminMenu';
import LanguageToggle from '../components/LanguageToggle';
import { useTranslation } from 'react-i18next';

// Bypassing Webpack compilation error on native unlinked SVG Leaflet Icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// React Hook logic explicitly structured to isolate map click coordinates
function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });
  return position ? <Marker position={position} /> : null;
}

export default function ReportIssue() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState([23.8103, 90.4125]); // Default Dhaka Geo Coordinate

  // FR-19: Local Storage Caching Hooks natively tracking keyboard strokes
  const [offlineCache, setOfflineCache] = useLocalStorage({
    key: 'civicresolve_active_draft_typing',
    defaultValue: { title: '', description: '', isAnonymous: false }
  });

  const form = useForm({
    initialValues: { 
      title: offlineCache.title || '', 
      description: offlineCache.description || '', 
      isAnonymous: offlineCache.isAnonymous || false, 
      image: null 
    },
    validate: {
      title: (val) => (val.trim() ? null : 'Issue title is strictly required'),
      description: (val) => (val.length >= 10 ? null : 'Please describe the problem more thoroughly (min 10 chars)'),
      image: (val) => (val ? null : 'Photographic evidence is required by the AI categorizer'),
    },
  });

  // FR-09: Duplicate Radar Array Buffer
  const [duplicateReports, setDuplicateReports] = useState([]);
  const [bypassedDuplicate, setBypassedDuplicate] = useState(false);

  // FR-09: Geospatial Target Interrogation Loop
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      try {
        const res = await API.get(`/reports/nearby?lat=${position[0]}&lng=${position[1]}&radius=30`);
        setDuplicateReports(res.data.data.reports);
        setBypassedDuplicate(false); // Reset matrix if position structurally mutates
      } catch (err) { }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [position]);

  // Sync keyboard inputs actively out of RAM and rigidly into LocalStorage
  useEffect(() => {
    setOfflineCache({
      title: form.values.title,
      description: form.values.description,
      isAnonymous: form.values.isAnonymous
    });
  }, [form.values.title, form.values.description, form.values.isAnonymous]);

  const handleSubmit = async (values) => {
    // FR-19: Network Partition Override Blockade
    if (!navigator.onLine) {
       const existingQueue = JSON.parse(localStorage.getItem('civicresolve_drafts_queue') || '[]');
       existingQueue.push({
         title: values.title,
         description: values.description,
         latitude: position[0],
         longitude: position[1],
         isAnonymous: values.isAnonymous,
         timestamp: new Date().toISOString()
       });
       localStorage.setItem('civicresolve_drafts_queue', JSON.stringify(existingQueue));
       
       setOfflineCache({ title: '', description: '', isAnonymous: false }); // Purge cache natively
       
       notifications.show({ title: 'System Offline Intercept', message: 'Report safely queued locally. It will automatically background-sync the absolute second your cell connection is restored.', color: 'blue', autoClose: 8000 });
       return navigate('/dashboard');
    }

    // Aggressive Database Spillage Interception Hook
    if (duplicateReports.length > 0 && !bypassedDuplicate) {
      return notifications.show({ title: 'Spam Radar Triggered', message: 'You must mathematically resolve the Duplicate Incident Block directly above your input form.', color: 'red' });
    }

    setLoading(true);
    try {
      // Because we are shipping a physical File Buffer to Cloudinary, we absolutely MUST map to FormData
      const formData = new FormData();
      formData.append('title', values.title);
      formData.append('description', values.description);
      formData.append('latitude', position[0]);
      formData.append('longitude', position[1]);
      formData.append('isAnonymous', values.isAnonymous);
      formData.append('image', values.image); // Buffer chunk

      await API.post('/reports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' } 
      });

      setOfflineCache({ title: '', description: '', isAnonymous: false }); // Purge cache completely on standard successful upload
      notifications.show({ title: 'Issue Mapped!', message: 'Your report was strictly authenticated and logged structurally onto the grid.', color: 'green' });
      navigate('/dashboard'); // Per strict user directive: Bounce into massive live map
    } catch (err) {
      let errorMsg = err.response?.data?.message || 'Network constraint blocked submission';
      if(err.response?.data?.data?.errors) {
         // Aggressively surface backend express-validator rejections
        errorMsg = err.response.data.data.errors.map(e => e.msg).join(' | ');
      }
      notifications.show({ title: 'Validation Breach', message: errorMsg, color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell header={{ height: 70 }} padding={0}>
       <AppShell.Header style={{ backgroundColor: '#101827', color: 'white', borderBottom: 'none' }}>
        <Group h="100%" px="xl" justify="space-between" align="center">
          <Text size="xl" fw={800} c="white" component={Link} to="/" style={{ textDecoration: 'none' }}>📍 CivicResolve</Text>
          <Group gap="lg" visibleFrom="md">
            <Anchor component={Link} to="/" underline="never" c="gray.3" fw={500}><IconMapPin size={16} style={{ verticalAlign: 'middle', marginRight: 4 }}/>{t('Home')}</Anchor>
            <Anchor component={Link} to="/dashboard" underline="never" c="gray.3" fw={500}><IconLayoutDashboard size={16} style={{ verticalAlign: 'middle', marginRight: 4 }}/>{t('Map Dashboard')}</Anchor>
            <Anchor component={Link} to="/report" underline="never" c="orange" fw={700}><IconMessageReport size={16} style={{ verticalAlign: 'middle', marginRight: 4 }}/>{t('Report Issue')}</Anchor>
            <Anchor component={Link} to="/about" underline="never" c="gray.3" fw={500}><IconInfoCircle size={16} style={{ verticalAlign: 'middle', marginRight: 4 }}/>{t('About')}</Anchor>
            <LanguageToggle />
            <SystemAdminMenu />
            <NotificationsMenu />
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Grid gutter={0} style={{ minHeight: 'calc(100vh - 70px)' }}>

          {/* Left Grid: Deep Leaflet Canvas Binding */}
          <Grid.Col span={{ base: 12, md: 6 }} style={{ height: 'calc(100vh - 70px)', position: 'relative' }}>
            <Box p="md" style={{ position: 'absolute', top: 10, left: 10, right: 10, zIndex: 400, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 8, boxShadow: '0px 4px 10px rgba(0,0,0,0.1)' }}>
              <Title order={5} c="dark.9">{t('Identify the Source Location')}</Title>
              <Text size="sm" c="dimmed">{t('Drag or click on the map')}</Text>
            </Box>
            <MapContainer center={position} zoom={14} style={{ height: '100%', width: '100%', zIndex: 1 }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
              <LocationMarker position={position} setPosition={setPosition} />
            </MapContainer>
          </Grid.Col>

          {/* Right Grid: Payload Structure Builder */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper p="xl" style={{ backgroundColor: '#f8fafc', height: '100%' }}>
              <Stack style={{ maxWidth: 500, margin: '0 auto' }}>
                <Title order={2} mt="lg">Report Civic Incident</Title>
                <Text c="dimmed" mb="md">Deploy an AI-categorized issue into the Ward Officials grid.</Text>
                
                {duplicateReports.length > 0 && !bypassedDuplicate && (
                  <Alert icon={<IconAlertTriangle />} title="Duplicate Target Interpolated!" color="red" mb="lg">
                    We securely detected {duplicateReports.length} existing incident(s) reported strictly within 30 meters of your exact dropped pin!
                    <List size="sm" mt="xs" mb="md">
                      {duplicateReports.map(dup => <List.Item key={dup._id}>{dup.title}</List.Item>)}
                    </List>
                    <Group>
                      <Button variant="light" color="red" onClick={() => navigate('/dashboard')}>View Dashboard to Verify</Button>
                      <Button variant="subtle" color="gray" size="xs" onClick={() => setBypassedDuplicate(true)}>This is a distinct issue. Override lock.</Button>
                    </Group>
                  </Alert>
                )}

                <form onSubmit={form.onSubmit(handleSubmit)}>
                  <TextInput label="Issue Title" placeholder="e.g. Massive pothole on Main Street" required {...form.getInputProps('title')} mb="md" />
                  
                  <Textarea label="Incident Description" placeholder="Explain the severity of the situation..." minRows={4} required {...form.getInputProps('description')} mb="md" />
                  
                  <FileInput label="Photographic Evidence" description="Supported format: .jpg, .png" placeholder="Upload Image" required icon={<IconUpload size={14} />} 
                    accept="image/png,image/jpeg,image/webp" 
                    {...form.getInputProps('image')} mb="lg" 
                  />

                  <Paper withBorder p="sm" radius="md" mb="xl">
                    <Group justify="space-between">
                      <Box>
                        <Text fw={600} size="sm">Anonymous Reporting Mode</Text>
                        <Text size="xs" c="dimmed">Your profile metadata will be intentionally unlinked from public display logs.</Text>
                      </Box>
                      <Switch color="orange" {...form.getInputProps('isAnonymous', { type: 'checkbox' })} />
                    </Group>
                  </Paper>

                  <Button fullWidth size="lg" color="orange" radius="xl" type="submit" loading={loading} leftSection={<IconMapPin size={18} />}>
                    Map this Issue
                  </Button>
                </form>
              </Stack>
            </Paper>
          </Grid.Col>

        </Grid>
      </AppShell.Main>
    </AppShell>
  );
}
