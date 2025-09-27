import React, { useState } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Badge,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  useMediaQuery,
  Fab,
  Zoom,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  AccountCircle as AccountIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
} from '@mui/icons-material';

import { useTheme as useCustomTheme } from '../../contexts/ThemeContext';
import { useAppContext } from '../../contexts/AppContext';
import Sidebar from './Sidebar';
import NotificationPanel from './NotificationPanel';
import { ErrorBoundary } from '../ErrorBoundary';

const DRAWER_WIDTH = 280;

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const theme = useTheme();
  const { mode, toggleTheme } = useCustomTheme();
  const { state, actions } = useAppContext();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Local state
  const [accountMenuAnchor, setAccountMenuAnchor] = useState<null | HTMLElement>(null);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Derived state
  const { sidebarCollapsed } = state.user.preferences;
  const { notifications } = state.ui;
  const unreadNotifications = notifications.filter(n => !n.read).length;

  // Handlers
  const handleDrawerToggle = () => {
    actions.toggleSidebar();
  };

  const handleAccountMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAccountMenuAnchor(event.currentTarget);
  };

  const handleAccountMenuClose = () => {
    setAccountMenuAnchor(null);
  };

  const handleNotificationToggle = () => {
    setNotificationPanelOpen(prev => !prev);
  };

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Scroll detection
  React.useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Drawer content
  const drawerContent = (
    <ErrorBoundary>
      <Sidebar />
    </ErrorBoundary>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          width: {
            md: sidebarCollapsed || isMobile ? '100%' : `calc(100% - ${DRAWER_WIDTH}px)`,
          },
          ml: {
            md: sidebarCollapsed || isMobile ? 0 : `${DRAWER_WIDTH}px`,
          },
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="toggle navigation"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>

          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ flexGrow: 1 }}
          >
            Nassau County Urban Planning Studio
          </Typography>

          {/* Theme toggle */}
          <IconButton
            color="inherit"
            onClick={toggleTheme}
            aria-label="toggle theme"
            sx={{ mr: 1 }}
          >
            {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>

          {/* Notifications */}
          <IconButton
            color="inherit"
            onClick={handleNotificationToggle}
            aria-label="notifications"
            sx={{ mr: 1 }}
          >
            <Badge badgeContent={unreadNotifications} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          {/* Settings */}
          <IconButton
            color="inherit"
            aria-label="settings"
            sx={{ mr: 1 }}
          >
            <SettingsIcon />
          </IconButton>

          {/* Account menu */}
          <IconButton
            color="inherit"
            onClick={handleAccountMenuOpen}
            aria-label="account menu"
          >
            <AccountIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Account Menu */}
      <Menu
        anchorEl={accountMenuAnchor}
        open={Boolean(accountMenuAnchor)}
        onClose={handleAccountMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleAccountMenuClose}>
          <Avatar sx={{ mr: 1, width: 24, height: 24 }} />
          Profile
        </MenuItem>
        <MenuItem onClick={handleAccountMenuClose}>
          My Projects
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleAccountMenuClose}>
          Settings
        </MenuItem>
        <MenuItem onClick={handleAccountMenuClose}>
          Help & Support
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleAccountMenuClose}>
          Sign Out
        </MenuItem>
      </Menu>

      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: sidebarCollapsed ? 0 : DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        {/* Mobile drawer */}
        {isMobile && (
          <Drawer
            variant="temporary"
            open={!sidebarCollapsed}
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }}
            sx={{
              display: { xs: 'block', md: 'none' },
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: DRAWER_WIDTH,
              },
            }}
          >
            {drawerContent}
          </Drawer>
        )}

        {/* Desktop drawer */}
        {!isMobile && (
          <Drawer
            variant="persistent"
            open={!sidebarCollapsed}
            sx={{
              display: { xs: 'none', md: 'block' },
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: DRAWER_WIDTH,
              },
            }}
          >
            {drawerContent}
          </Drawer>
        )}
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: {
            md: sidebarCollapsed || isMobile ? '100%' : `calc(100% - ${DRAWER_WIDTH}px)`,
          },
          minHeight: '100vh',
          pt: '88px', // Account for AppBar height + padding
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </Box>

      {/* Notification Panel */}
      <NotificationPanel
        open={notificationPanelOpen}
        onClose={() => setNotificationPanelOpen(false)}
      />

      {/* Scroll to top FAB */}
      <Zoom in={showScrollTop}>
        <Fab
          color="primary"
          size="small"
          aria-label="scroll back to top"
          onClick={handleScrollToTop}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: (theme) => theme.zIndex.speedDial,
          }}
        >
          <KeyboardArrowUpIcon />
        </Fab>
      </Zoom>
    </Box>
  );
};

export default DashboardLayout;