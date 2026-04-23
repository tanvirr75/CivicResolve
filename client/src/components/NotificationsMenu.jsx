import React, { useState, useEffect, useCallback } from 'react';
import { ActionIcon, Indicator, Tooltip } from '@mantine/core';
import { IconBell } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications as toast } from '@mantine/notifications';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../services/socket';

// ─────────────────────────────────────────────────────────────────────────────
// NotificationsMenu
//
// Replaces the old dropdown-menu approach.
// Now acts as a Navbar bell icon that:
//   1. Shows an Indicator badge with real unread count
//   2. Navigates to /citizen/notifications on click
//   3. Listens for real-time new notifications to increment badge
//   4. Listens for page-level events to decrement / clear the badge
// ─────────────────────────────────────────────────────────────────────────────
export default function NotificationsMenu() {
  const { user }     = useAuth();
  const navigate     = useNavigate();
  const [count, setCount] = useState(0);

  // ── Initial unread count fetch ─────────────────────────────────────────────
  const fetchCount = useCallback(async () => {
    if (!user) return;
    try {
      const res = await API.get('/notifications/unread-count');
      setCount(res.data.data?.count ?? 0);
    } catch {
      // Gracefully degrade — badge stays 0
    }
  }, [user]);

  useEffect(() => { fetchCount(); }, [fetchCount]);

  // ── Real-time socket — increment badge on new notification ─────────────────
  useSocket(user?._id, {
    newNotification: () => setCount(prev => prev + 1),
    statusUpdated:   () => setCount(prev => prev + 1),
  });

  // ── Page-level events from NotificationsPage ───────────────────────────────
  // notifications:viewed → user opened the page, reset count to 0
  // notifications:decrement → single item marked read
  useEffect(() => {
    const onViewed     = () => setCount(0);
    const onDecrement  = () => setCount(prev => Math.max(0, prev - 1));

    window.addEventListener('notifications:viewed',   onViewed);
    window.addEventListener('notifications:decrement', onDecrement);
    return () => {
      window.removeEventListener('notifications:viewed',   onViewed);
      window.removeEventListener('notifications:decrement', onDecrement);
    };
  }, []);

  const handleClick = () => {
    navigate('/notifications');
  };

  const label = count > 99 ? '99+' : count > 0 ? String(count) : undefined;

  return (
    <Tooltip label="Notifications" position="bottom" withArrow>
      <Indicator
        color="red"
        size={count > 9 ? 18 : 16}
        offset={4}
        label={label}
        disabled={count === 0}
        processing={count > 0}
        styles={{ indicator: { fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 10 } }}
      >
        <ActionIcon
          variant="transparent"
          color="gray.3"
          size="lg"
          radius="xl"
          style={{ marginTop: 4 }}
          onClick={handleClick}
          aria-label={`Notifications${count > 0 ? `, ${count} unread` : ''}`}
        >
          <IconBell size={22} stroke={count > 0 ? 2.2 : 1.6} />
        </ActionIcon>
      </Indicator>
    </Tooltip>
  );
}
