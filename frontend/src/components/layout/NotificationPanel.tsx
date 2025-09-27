import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Button,
  Divider,
  Alert,
  Fade,
  Collapse,
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ClearAll as ClearAllIcon,
  MarkAsUnread as UnreadIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

import { useAppContext } from '../../contexts/AppContext';

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ open, onClose }) => {
  const { state, actions } = useAppContext();
  const { notifications } = state.ui;

  const unreadCount = notifications.filter(n => !n.read).length;
  const hasNotifications = notifications.length > 0;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <SuccessIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'info':
      default:
        return <InfoIcon color="info" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
      default:
        return 'info';
    }
  };

  const handleMarkAsRead = (id: string) => {
    actions.markNotificationRead(id);
  };

  const handleClearAll = () => {
    actions.clearNotifications();
  };

  const groupedNotifications = React.useMemo(() => {
    const groups: { [key: string]: typeof notifications } = {
      today: [],
      yesterday: [],
      older: [],
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    notifications.forEach(notification => {
      const notificationDate = new Date(notification.timestamp);
      const notificationDay = new Date(
        notificationDate.getFullYear(),
        notificationDate.getMonth(),
        notificationDate.getDate()
      );

      if (notificationDay.getTime() === today.getTime()) {
        groups.today.push(notification);
      } else if (notificationDay.getTime() === yesterday.getTime()) {
        groups.yesterday.push(notification);
      } else {
        groups.older.push(notification);
      }
    });

    return groups;
  }, [notifications]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 400 },
          maxWidth: '100vw',
        },
      }}
    >
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="div">
            Notifications
            {unreadCount > 0 && (
              <Chip
                size="small"
                label={unreadCount}
                color="primary"
                sx={{ ml: 1 }}
              />
            )}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {hasNotifications && (
          <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
            <Button
              size="small"
              startIcon={<ClearAllIcon />}
              onClick={handleClearAll}
              variant="outlined"
            >
              Clear All
            </Button>
          </Box>
        )}
      </Box>

      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {!hasNotifications ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              p: 4,
              textAlign: 'center',
            }}
          >
            <InfoIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Notifications
            </Typography>
            <Typography variant="body2" color="text.secondary">
              All caught up! New notifications will appear here.
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {Object.entries(groupedNotifications).map(([group, groupNotifications]) => {
              if (groupNotifications.length === 0) return null;

              return (
                <Box key={group}>
                  <Typography
                    variant="overline"
                    sx={{
                      px: 2,
                      py: 1,
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'text.secondary',
                      textTransform: 'capitalize',
                    }}
                  >
                    {group}
                  </Typography>

                  {groupNotifications.map((notification, index) => (
                    <Fade in key={notification.id} timeout={300} style={{ transitionDelay: `${index * 50}ms` }}>
                      <ListItem
                        sx={{
                          flexDirection: 'column',
                          alignItems: 'stretch',
                          py: 1.5,
                          px: 2,
                          opacity: notification.read ? 0.6 : 1,
                          borderLeft: notification.read ? 'none' : '3px solid',
                          borderColor: `${getNotificationColor(notification.type)}.main`,
                          '&:hover': {
                            backgroundColor: 'action.hover',
                          },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                          <ListItemIcon sx={{ minWidth: 32, mt: 0.5 }}>
                            {getNotificationIcon(notification.type)}
                          </ListItemIcon>

                          <ListItemText
                            primary={notification.message}
                            primaryTypographyProps={{
                              variant: 'body2',
                              sx: { fontWeight: notification.read ? 400 : 600 },
                            }}
                            sx={{ flexGrow: 1, m: 0 }}
                          />

                          {!notification.read && (
                            <IconButton
                              size="small"
                              onClick={() => handleMarkAsRead(notification.id)}
                              sx={{ ml: 1 }}
                            >
                              <UnreadIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Box>

                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ ml: 4 }}
                        >
                          {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                        </Typography>
                      </ListItem>
                    </Fade>
                  ))}

                  {group !== 'older' && <Divider />}
                </Box>
              );
            })}
          </List>
        )}
      </Box>

      {hasNotifications && (
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" align="center" display="block">
            {notifications.length} total • {unreadCount} unread
          </Typography>
        </Box>
      )}
    </Drawer>
  );
};

export default NotificationPanel;