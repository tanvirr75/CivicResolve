import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@mantine/core';
import { IconLanguage } from '@tabler/icons-react';

export default function LanguageToggle() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    // Explicitly mutate internal JSON dictionary arrays instantaneously without reloading physics
    i18n.changeLanguage(i18n.language === 'en' ? 'bn' : 'en');
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
