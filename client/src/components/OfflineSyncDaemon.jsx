import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { notifications } from '@mantine/notifications';

export default function OfflineSyncDaemon() {
  const { user } = useAuth(); // Hard validation: Core syncing inherently requires active system identity

  useEffect(() => {
    const executeBackgroundSync = async () => {
      // Interrogate local partition geometry for array payloads
      const existingQueue = JSON.parse(localStorage.getItem('civicresolve_drafts_queue') || '[]');
      
      if (existingQueue.length > 0 && user) {
        try {
          // Push entire cached schema straight into MongoDB
          await API.post('/drafts/sync', { drafts: existingQueue });
          
          // Dump memory completely to prevent recursive spamming
          localStorage.removeItem('civicresolve_drafts_queue');
          
          // Visual telemetry
          notifications.show({ 
            title: 'Cellular Connection Restored', 
            message: `Autonomously synthesized and uploaded ${existingQueue.length} offline report block(s) directly to the server matrix!`, 
            color: 'teal',
            autoClose: 10000
          });
        } catch (err) {
          console.error("Offline Synchronization Engine Crash:", err);
        }
      }
    };

    // Global background hook
    window.addEventListener('online', executeBackgroundSync);
    
    // Aggressive initialization check (in case user reloaded physically WITH internet after being completely offline earlier)
    if (navigator.onLine) {
      executeBackgroundSync();
    }

    return () => window.removeEventListener('online', executeBackgroundSync);
  }, [user]);

  return null; // Structurally invisible DOM node
}
