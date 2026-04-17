import React, { useState, useEffect } from 'react';
import { Menu, ActionIcon, Indicator, Notification, Text, Stack, ScrollArea } from '@mantine/core';
import { IconBell } from '@tabler/icons-react';
import { io } from 'socket.io-client';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { notifications as mantineNotifications } from '@mantine/notifications';

export default function NotificationsMenu() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Abort if no active session
    if (!user) return;

    // Load massive historical array payload
    const fetchHistory = async () => {
      try {
        const res = await API.get('/notifications');
        const logs = res.data.data.notifications;
        setNotifications(logs);
        setUnreadCount(logs.filter(n => !n.isRead).length);
      } catch (err) {
        console.error("Failed to sync historical notifications", err);
      }
    };
    fetchHistory();

    // Spawn Real-Time TCP Tether
    const socket = io('http://localhost:5000');
    
    // Subscribe physically to User ID target room
    socket.emit('joinRoom', user._id);

    // Event Hook Trigger
    socket.on('statusUpdated', (incomingPayload) => {
      setNotifications(prev => [incomingPayload, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Flash Toast
      mantineNotifications.show({
        title: 'Status Synchronized!',
        message: incomingPayload.message,
        color: 'teal',
        autoClose: 10000 
      });
    });

    return () => socket.disconnect(); // Garbage collection on module destruct
  }, [user]);

  // Read toggle
  const markAsRead = async (id) => {
    try {
      await API.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <Menu shadow="md" width={340} position="bottom-end">
      <Menu.Target>
        <Indicator color="red" size={16} offset={4} label={unreadCount} disabled={unreadCount === 0} processing>
          <ActionIcon variant="transparent" color="gray.3" size="lg" radius="xl" style={{marginTop: 5}}>
            <IconBell size={24} />
          </ActionIcon>
        </Indicator>
      </Menu.Target>

      <Menu.Dropdown p={0}>
        <Stack p="sm" style={{backgroundColor: '#101827'}}>
           <Text fw={700} c="white">Active Alerts</Text>
        </Stack>
        <ScrollArea h={380} offsetScrollbars>
          {notifications.length === 0 ? (
            <Menu.Item disabled><Text c="dimmed" ta="center" mt="md">System log is clean.</Text></Menu.Item>
          ) : (
            <Stack gap={0}>
              {notifications.map(n => (
                <Menu.Item key={n._id} onClick={() => !n.isRead && markAsRead(n._id)} style={{ backgroundColor: n.isRead ? 'transparent' : '#f0fdf4', borderBottom: '1px solid #f1f5f9' }}>
                  <Notification 
                    title={n.type === 'status_update' ? "Task Updated" : "System Ping"} 
                    withCloseButton={false}
                    color={n.isRead ? 'gray' : 'teal'}
                    m={0}
                  >
                    {n.message}
                    <Text size="xs" c="dimmed" mt={4}>{new Date(n.createdAt).toLocaleString()}</Text>
                  </Notification>
                </Menu.Item>
              ))}
            </Stack>
          )}
        </ScrollArea>
      </Menu.Dropdown>
    </Menu>
  );
}
