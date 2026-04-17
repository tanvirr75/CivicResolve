import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { AuthProvider } from './context/AuthContext';
import App from './App.jsx';
import './i18n'; // Explicitly load dictionaries before DOM payload executes

const theme = createTheme({
  defaultColorScheme: 'light',
  primaryColor: 'orange',
  fontFamily: 'Inter, sans-serif',
  headings: { fontFamily: 'Inter, sans-serif' },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <MantineProvider theme={theme} defaultColorScheme="light">
        <Notifications position="top-right" />
        <AuthProvider>
          <App />
        </AuthProvider>
      </MantineProvider>
    </BrowserRouter>
  </StrictMode>,
);
