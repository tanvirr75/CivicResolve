import React, { useState } from 'react';
import { Menu, ActionIcon, Text } from '@mantine/core';
import { IconSettings, IconDownload, IconFileSpreadsheet } from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';
import { notifications } from '@mantine/notifications';
import API from '../services/api';

export default function SystemAdminMenu() {
  const { user } = useAuth();
  const [downloading, setDownloading] = useState(false);

  // Aggressive Hard-Lock Validation: Render absolutely nothing unless Auth Context dictates 'system_admin'
  if (!user || user.role !== 'system_admin') return null;

  const handleDownloadCsv = async () => {
    setDownloading(true);
    try {
      // Force native Blob interception mapping - DO NOT ACCEPT JSON
      const res = await API.get('/export/reports', { responseType: 'blob' });
      
      const fileUrl = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = fileUrl;
      link.setAttribute('download', `civicresolve_reports_export_${new Date().getTime()}.csv`);
      document.body.appendChild(link); // Append to DOM tree to prevent browser blocking hooks
      link.click();
      
      // Memory Optimization: Clean up the virtual DOM node and URL mapping immediately!
      link.remove();
      window.URL.revokeObjectURL(fileUrl);
      
      notifications.show({ title: 'Data Extracted', message: 'The Global CSV analytics dump was fully downloaded to your physical partition.', color: 'green' });
    } catch (err) {
      notifications.show({ title: 'Extraction Error', message: 'The backend explicitly blocked the bulk data extraction payload.', color: 'red' });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Menu shadow="md" width={240} position="bottom-end">
      <Menu.Target>
        <ActionIcon variant="light" color="indigo" size="lg" radius="xl" style={{marginTop: 5}}>
          <IconSettings size={20} />
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Administrator Diagnostics Console</Menu.Label>
        
        <Menu.Item 
          leftSection={downloading ? <IconDownload size={14} /> : <IconFileSpreadsheet size={14} />} 
          onClick={handleDownloadCsv}
          disabled={downloading}
          color="indigo"
        >
          <Text size="sm" fw={600}>{downloading ? 'Decrypting Raw Stream...' : 'Download Database (.CSV)'}</Text>
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
