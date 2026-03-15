import { useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

export const getTheme = (): Theme => {
  if (typeof window !== 'undefined') {
    const savedTheme = localStorage.getItem('rankfire-theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      return savedTheme;
    }
  }
  return 'dark'; // Default to dark
};

export const setTheme = (theme: Theme) => {
  localStorage.setItem('rankfire-theme', theme);
  const root = window.document.documentElement;
  
  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }
};

export const useTheme = () => {
  const [theme, setThemeState] = useState<Theme>(getTheme);

  useEffect(() => {
    // Component mounted, apply the theme to be sure
    setTheme(theme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setThemeState(newTheme);
    setTheme(newTheme);
  };

  return { theme, toggleTheme };
};
