import React, { createContext, useContext, useState, useEffect } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider, Theme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
  theme: Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Create base theme configurations
const getTheme = (mode: ThemeMode): Theme => {
  const palette = mode === 'dark'
    ? {
        mode: 'dark' as const,
        primary: {
          main: '#4fc3f7',
          light: '#8bf6ff',
          dark: '#0093c4',
        },
        secondary: {
          main: '#81c784',
          light: '#b2fab4',
          dark: '#519657',
        },
        background: {
          default: '#0a0e27',
          paper: '#1a1f3a',
        },
        surface: {
          main: 'rgba(255, 255, 255, 0.05)',
          hover: 'rgba(255, 255, 255, 0.08)',
        },
        success: {
          main: '#4caf50',
          light: '#81c784',
          dark: '#388e3c',
        },
        warning: {
          main: '#ff9800',
          light: '#ffb74d',
          dark: '#f57c00',
        },
        error: {
          main: '#f44336',
          light: '#e57373',
          dark: '#d32f2f',
        },
        text: {
          primary: 'rgba(255, 255, 255, 0.87)',
          secondary: 'rgba(255, 255, 255, 0.6)',
        },
      }
    : {
        mode: 'light' as const,
        primary: {
          main: '#1976d2',
          light: '#42a5f5',
          dark: '#1565c0',
        },
        secondary: {
          main: '#388e3c',
          light: '#66bb6a',
          dark: '#2e7d32',
        },
        background: {
          default: '#f5f7fa',
          paper: '#ffffff',
        },
        surface: {
          main: 'rgba(0, 0, 0, 0.04)',
          hover: 'rgba(0, 0, 0, 0.08)',
        },
        success: {
          main: '#4caf50',
          light: '#81c784',
          dark: '#388e3c',
        },
        warning: {
          main: '#ff9800',
          light: '#ffb74d',
          dark: '#f57c00',
        },
        error: {
          main: '#f44336',
          light: '#e57373',
          dark: '#d32f2f',
        },
        text: {
          primary: 'rgba(0, 0, 0, 0.87)',
          secondary: 'rgba(0, 0, 0, 0.6)',
        },
      };

  return createTheme({
    palette,
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontSize: '2.5rem',
        fontWeight: 700,
        letterSpacing: '-0.02em',
      },
      h2: {
        fontSize: '2rem',
        fontWeight: 600,
        letterSpacing: '-0.01em',
      },
      h3: {
        fontSize: '1.5rem',
        fontWeight: 600,
      },
      h4: {
        fontSize: '1.25rem',
        fontWeight: 500,
      },
      h5: {
        fontSize: '1.125rem',
        fontWeight: 500,
      },
      h6: {
        fontSize: '1rem',
        fontWeight: 500,
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            background: mode === 'dark'
              ? 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)'
              : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            minHeight: '100vh',
            backgroundAttachment: 'fixed',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backdropFilter: 'blur(10px)',
            border: mode === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.1)'
              : '1px solid rgba(0, 0, 0, 0.06)',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            background: mode === 'dark'
              ? 'rgba(255, 255, 255, 0.05)'
              : 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(10px)',
            borderRadius: 16,
            boxShadow: mode === 'dark'
              ? '0 8px 32px rgba(0, 0, 0, 0.3)'
              : '0 8px 32px rgba(0, 0, 0, 0.1)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 12,
            padding: '8px 24px',
          },
          contained: {
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            '&:hover': {
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2)',
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            background: mode === 'dark'
              ? 'rgba(26, 31, 58, 0.95)'
              : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRight: mode === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.1)'
              : '1px solid rgba(0, 0, 0, 0.06)',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            background: mode === 'dark'
              ? 'rgba(10, 14, 39, 0.95)'
              : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            boxShadow: mode === 'dark'
              ? '0 1px 3px rgba(255, 255, 255, 0.1)'
              : '0 1px 3px rgba(0, 0, 0, 0.1)',
          },
        },
      },
    },
  });
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const savedMode = localStorage.getItem('theme-mode');
    return (savedMode as ThemeMode) || 'light';
  });

  const toggleTheme = () => {
    setMode(prevMode => {
      const newMode = prevMode === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme-mode', newMode);
      return newMode;
    });
  };

  const theme = getTheme(mode);

  useEffect(() => {
    localStorage.setItem('theme-mode', mode);
  }, [mode]);

  const value: ThemeContextType = {
    mode,
    toggleTheme,
    theme,
  };

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Extend the theme interface to include custom properties
declare module '@mui/material/styles' {
  interface Palette {
    surface: {
      main: string;
      hover: string;
    };
  }

  interface PaletteOptions {
    surface?: {
      main: string;
      hover: string;
    };
  }
}