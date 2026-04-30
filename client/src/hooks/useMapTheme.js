import { useState, useCallback } from 'react';

export const TILE_URLS = {
  dark:     'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  colorful: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
};

export const MAP_ATTRIBUTION = '&copy; <a href="https://carto.com/">CARTO</a>';

export function useMapTheme() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('cr_map_theme') ?? 'dark'
  );

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'colorful' : 'dark';
      localStorage.setItem('cr_map_theme', next);
      return next;
    });
  }, []);

  return { theme, toggleTheme, tileUrl: TILE_URLS[theme], attribution: MAP_ATTRIBUTION };
}
