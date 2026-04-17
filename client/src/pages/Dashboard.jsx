import React, { useState, useEffect } from 'react';
import { AppShell, Group, Title, Text, Card, Badge, Stack, ScrollArea, Switch, Grid, Anchor, Button } from '@mantine/core';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { IconMapPin, IconLayoutDashboard, IconFlame, IconMessageReport, IconInfoCircle, IconArrowRight } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import ReportDetailsDrawer from '../components/ReportDetailsDrawer';
import NotificationsMenu from '../components/NotificationsMenu';
import SystemAdminMenu from '../components/SystemAdminMenu';
import LanguageToggle from '../components/LanguageToggle';
import { useTranslation } from 'react-i18next';

// Native fix bypassing Webpack/Vite module breakdown for Leaflet default Icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// React Hook Component: Dynamic Heatmap Layer Injection
const HeatmapLayer = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (!points || points.length === 0) return;
    
    // Dynamically import leaflet.heat into the global window context specifically after map has initialized 
    // to bypass the notorious "L is undefined" Webpack/Vite module crash!
    import('leaflet.heat').then(() => {
      if (L.heatLayer) {
        const heat = L.heatLayer(points, { 
            radius: 25, 
            blur: 15, 
            maxZoom: 15,
            gradient: {0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red'}
        }).addTo(map);
        
        return () => map.removeLayer(heat);
      }
    });

  }, [map, points]);
  return null;
};

// React Hook Component: Dynamic Camera FlyTo Animation
const FlyToLocation = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 16, { duration: 1.5 });
  }, [center, map]);
  return null;
};

export default function Dashboard() {
  const { t } = useTranslation();
  const [reports, setReports] = useState([]);
  const [showHeatmap, setShowHeatmap] = useState(true); // Default ON based on User Specification
  const [mapCenter, setMapCenter] = useState([23.8103, 90.4125]); // Defaulting to Dhaka Core Coordinates
  
  // Drawer Structural State
  const [drawerOpened, setDrawerOpened] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState(null);

  const handleOpenDrawer = (id) => {
    setSelectedReportId(id);
    setDrawerOpened(true);
  };

  // Pre-load GeoJSON Array through secured Axios instance
  useEffect(() => {
    if(!window.L) window.L = L; // Secure injection mapping for `leaflet.heat` namespace

    const fetchReports = async () => {
      try {
        const res = await API.get('/reports');
        setReports(res.data.data.reports || []);
      } catch (err) {
        console.error("Failed to load map data from backend node:", err);
      }
    };
    fetchReports();
  }, []);

  // Compute Heatmap Array. GeoJSON is [Lng, Lat]. Leaflet requires [Lat, Lng].
  // Safely chained to prevent crashes if DB has malformed data
  const heatPoints = reports.map(r => {
    if (!r?.location?.coordinates) return null;
    return [
      r.location.coordinates[1], // Latitude
      r.location.coordinates[0], // Longitude
      1.0 // Maximum Intensity Weight per physical marker
    ];
  }).filter(Boolean);

  return (
    <AppShell header={{ height: 70 }} padding={0}>
      
      <AppShell.Header style={{ backgroundColor: '#101827', color: 'white', borderBottom: 'none' }}>
        <Group h="100%" px="xl" justify="space-between" align="center">
          <Text size="xl" fw={800} c="white" component={Link} to="/" style={{ textDecoration: 'none' }}>📍 {t('CivicResolve')}</Text>
          <Group gap="lg" visibleFrom="md">
            <Anchor component={Link} to="/dashboard" underline="never" c="orange" fw={700}><IconLayoutDashboard size={16} style={{ verticalAlign: 'middle', marginRight: 4 }}/>{t('Map Dashboard')}</Anchor>
            <Anchor component={Link} to="/report" underline="never" c="gray.3" fw={500}><IconMessageReport size={16} style={{ verticalAlign: 'middle', marginRight: 4 }}/>{t('Report Issue')}</Anchor>
            <Anchor component={Link} to="/about" underline="never" c="gray.3" fw={500}><IconInfoCircle size={16} style={{ verticalAlign: 'middle', marginRight: 4 }}/>{t('About')}</Anchor>
            <LanguageToggle />
            <SystemAdminMenu />
            <NotificationsMenu />
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Grid gutter={0} style={{ height: 'calc(100vh - 70px)' }}>
          
          {/* Data Filter Workspace - Left Grid Column */}
          <Grid.Col span={{ base: 12, md: 3 }} style={{ borderRight: '1px solid #e5e7eb', backgroundColor: '#f8fafc', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Stack p="md" style={{ height: '100%', flex: 1, overflow: 'hidden' }}>
              <Title order={3}>Live Data Stream</Title>
              
              <Card shadow="xs" padding="sm" radius="md" withBorder bg="white">
                <Group justify="space-between">
                  <Group gap="xs">
                    <IconFlame color={showHeatmap ? "red" : "gray"} size={20} />
                    <Text fw={600}>Heatmap Overlay</Text>
                  </Group>
                  <Switch color="red" checked={showHeatmap} onChange={(e) => setShowHeatmap(e.currentTarget.checked)} />
                </Group>
              </Card>

              <Text size="sm" c="dimmed" fw={600} mt="sm">RECENT REPORTS ({reports.length})</Text>
              
              <ScrollArea style={{ flex: 1 }} type="auto" offsetScrollbars>
                <Stack gap="sm" pb="xl">
                  {reports.map((report) => {
                    if (!report?.location?.coordinates) return null;
                    return (
                    <Card 
                      key={report._id} 
                      shadow="sm" 
                      radius="md" 
                      withBorder 
                      style={{ cursor: 'pointer', transition: 'all 0.2s', '&:hover': { borderColor: 'orange' } }}
                      onClick={() => setMapCenter([report.location.coordinates[1], report.location.coordinates[0]])}
                    >
                      <Group justify="space-between" mb="xs">
                        <Badge color={report.status === 'Resolved' ? 'teal' : 'orange'} variant="light">{report.status}</Badge>
                        <Text size="xs" c="dimmed">{new Date(report.createdAt).toLocaleDateString()}</Text>
                      </Group>
                      <Text fw={600} lineClamp={1}>{report.title}</Text>
                      <Text size="sm" c="dimmed" lineClamp={2} mb="xs">{report.description}</Text>
                      <Badge size="xs" color="blue" variant="outline">{report.category}</Badge>
                      <Button 
                        size="xs" 
                        variant="subtle" 
                        color="indigo" 
                        rightSection={<IconArrowRight size={12} />} 
                        fullWidth 
                        mt="xs"
                        onClick={(e) => { e.stopPropagation(); handleOpenDrawer(report._id); }}
                      >
                        Deep Dive
                      </Button>
                    </Card>
                  )})}
                  {reports.length === 0 && (
                    <Text c="dimmed" ta="center" mt="xl">No active reports found in DB.</Text>
                  )}
                </Stack>
              </ScrollArea>
            </Stack>
          </Grid.Col>

          {/* Core Geographical Logic - Right Grid Column */}
          <Grid.Col span={{ base: 12, md: 9 }} style={{ position: 'relative' }}>
            <MapContainer center={mapCenter} zoom={13} style={{ height: 'calc(100vh - 70px)', width: '100%', zIndex: 1 }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              
              {/* Native React Camera Rig */}
              <FlyToLocation center={mapCenter} />
              
              {/* FR-17: Heatmap Density Conditional Injection */}
              {showHeatmap && <HeatmapLayer points={heatPoints} />}

              {/* Strict Object Mapping Logic for Discrete Pins */}
              {!showHeatmap && reports.map((report) => {
                if (!report?.location?.coordinates) return null;
                return (
                <Marker 
                  key={report._id} 
                  position={[report.location.coordinates[1], report.location.coordinates[0]]}
                >
                  <Popup>
                    <Stack gap="xs" miw={200}>
                      <Badge color={report.status === 'Resolved' ? 'teal' : 'orange'} variant="dot">{report.status}</Badge>
                      <Text fw={700} size="md">{report.title}</Text>
                      <Text size="sm" c="dimmed">{report.category}</Text>
                      <Text size="xs">{report.description}</Text>
                      {report.images && report.images[0] && (
                        <img src={report.images[0].fileUrl || report.images[0].secure_url} alt="Civic Issue" style={{width: '100%', borderRadius: '4px', marginTop: '10px'}} />
                      )}
                      <Button size="xs" color="indigo" onClick={() => handleOpenDrawer(report._id)}>Read Thread</Button>
                    </Stack>
                  </Popup>
                </Marker>
              )})}
            </MapContainer>
          </Grid.Col>

        </Grid>
      </AppShell.Main>
      
      {/* Off-canvas Isolated Drawer Logic */}
      <ReportDetailsDrawer 
        reportId={selectedReportId} 
        opened={drawerOpened} 
        onClose={() => setDrawerOpened(false)} 
      />

    </AppShell>
  );
}
