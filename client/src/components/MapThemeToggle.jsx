import { ActionIcon, Tooltip } from '@mantine/core';
import { IconSun, IconMoon } from '@tabler/icons-react';

export default function MapThemeToggle({ theme, onToggle, style = {} }) {
  const isDark = theme === 'dark';
  return (
    <Tooltip
      label={isDark ? 'Switch to colorful map' : 'Switch to dark map'}
      withArrow
      position="left"
      color="dark"
    >
      <ActionIcon
        onClick={onToggle}
        size={30}
        radius="md"
        style={{
          background:    isDark ? 'rgba(20,20,20,0.88)' : 'rgba(255,255,255,0.88)',
          border:        `1px solid ${isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)'}`,
          color:         isDark ? '#e5e5e5' : '#333',
          backdropFilter:'blur(8px)',
          boxShadow:     '0 2px 8px rgba(0,0,0,0.30)',
          cursor:        'pointer',
          ...style,
        }}
      >
        {isDark ? <IconSun size={14} /> : <IconMoon size={14} />}
      </ActionIcon>
    </Tooltip>
  );
}
