import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@mantine/core';
import { IconLanguage } from '@tabler/icons-react';
import API from '../services/api';

export default function LanguageToggle() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'bn' : 'en';
    i18n.changeLanguage(newLang);
    // Persist to server silently (fire-and-forget — non-critical)
    API.put('/auth/profile', { language: newLang }).catch(() => {});
  };

  return (
    <Button 
      variant="subtle" 
      color="gray.3" 
      size="xs" 
      onClick={toggleLanguage} 
      leftSection={<IconLanguage size={14} />}
      style={{ borderRadius: 20 }}
    >
      {i18n.language === 'en' ? 'বাংলা' : 'English'}
    </Button>
  );
}
