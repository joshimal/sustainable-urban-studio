import React from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  useTheme,
  Fade,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';

export type ProgressType = 'linear' | 'circular' | 'stepped';
export type ProgressStatus = 'active' | 'completed' | 'error' | 'warning' | 'paused' | 'cancelled';

export interface ProgressStep {
  id: string;
  label: string;
  description?: string;
  status: ProgressStatus;
  progress?: number;
}

export interface ProgressIndicatorProps {
  type?: ProgressType;
  value?: number;
  status?: ProgressStatus;
  title?: string;
  description?: string;
  steps?: ProgressStep[];
  showPercentage?: boolean;
  showETA?: boolean;
  eta?: number; // in seconds
  animated?: boolean;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'small' | 'medium' | 'large';
  variant?: 'determinate' | 'indeterminate';
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  type = 'linear',
  value = 0,
  status = 'active',
  title,
  description,
  steps,
  showPercentage = true,
  showETA = false,
  eta,
  animated = true,
  color = 'primary',
  size = 'medium',
  variant = 'determinate',
}) => {
  const theme = useTheme();

  const getStatusColor = (stepStatus: ProgressStatus) => {
    switch (stepStatus) {
      case 'completed':
        return theme.palette.success.main;
      case 'error':
        return theme.palette.error.main;
      case 'warning':
        return theme.palette.warning.main;
      case 'cancelled':
        return theme.palette.text.disabled;
      case 'paused':
        return theme.palette.warning.main;
      case 'active':
      default:
        return theme.palette.primary.main;
    }
  };

  const getStatusIcon = (stepStatus: ProgressStatus) => {
    switch (stepStatus) {
      case 'completed':
        return <CheckIcon fontSize="small" color="success" />;
      case 'error':
        return <ErrorIcon fontSize="small" color="error" />;
      case 'warning':
        return <WarningIcon fontSize="small" color="warning" />;
      case 'cancelled':
        return <CancelIcon fontSize="small" color="disabled" />;
      default:
        return null;
    }
  };

  const formatETA = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const getProgressSize = () => {
    switch (size) {
      case 'small':
        return { linear: 4, circular: 24 };
      case 'large':
        return { linear: 12, circular: 64 };
      case 'medium':
      default:
        return { linear: 8, circular: 40 };
    }
  };

  const progressSize = getProgressSize();

  if (type === 'stepped' && steps) {
    return (
      <Card>
        <CardContent>
          {title && (
            <Typography variant="h6" gutterBottom>
              {title}
            </Typography>
          )}
          {description && (
            <Typography variant="body2" color="text.secondary" paragraph>
              {description}
            </Typography>
          )}

          <Box>
            {steps.map((step, index) => (
              <Fade in key={step.id} timeout={300} style={{ transitionDelay: `${index * 100}ms` }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    mb: index === steps.length - 1 ? 0 : 2,
                    position: 'relative',
                  }}
                >
                  {/* Step connector line */}
                  {index < steps.length - 1 && (
                    <Box
                      sx={{
                        position: 'absolute',
                        left: 12,
                        top: 32,
                        width: 2,
                        height: 32,
                        bgcolor: step.status === 'completed'
                          ? 'success.main'
                          : 'divider',
                        zIndex: 0,
                      }}
                    />
                  )}

                  {/* Step indicator */}
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      bgcolor: getStatusColor(step.status),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2,
                      zIndex: 1,
                      position: 'relative',
                    }}
                  >
                    {step.status === 'active' && step.progress !== undefined ? (
                      <CircularProgress
                        size={20}
                        value={step.progress}
                        variant="determinate"
                        color="inherit"
                        sx={{ color: 'white' }}
                      />
                    ) : getStatusIcon(step.status) ? (
                      getStatusIcon(step.status)
                    ) : (
                      <Typography variant="caption" color="white" sx={{ fontWeight: 600 }}>
                        {index + 1}
                      </Typography>
                    )}
                  </Box>

                  {/* Step content */}
                  <Box sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: step.status === 'active' ? 600 : 400,
                          color: step.status === 'cancelled' ? 'text.disabled' : 'text.primary',
                        }}
                      >
                        {step.label}
                      </Typography>

                      <Chip
                        size="small"
                        label={step.status}
                        color={
                          step.status === 'completed' ? 'success' :
                          step.status === 'error' ? 'error' :
                          step.status === 'warning' ? 'warning' : 'default'
                        }
                        sx={{ ml: 2 }}
                      />
                    </Box>

                    {step.description && (
                      <Typography variant="body2" color="text.secondary">
                        {step.description}
                      </Typography>
                    )}

                    {step.status === 'active' && step.progress !== undefined && (
                      <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                        <LinearProgress
                          variant="determinate"
                          value={step.progress}
                          sx={{ flexGrow: 1, mr: 1 }}
                          color={color}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {step.progress}%
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Fade>
            ))}
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (type === 'circular') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {title && (
          <Typography variant="h6" gutterBottom>
            {title}
          </Typography>
        )}

        <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
          <CircularProgress
            variant={variant}
            value={value}
            size={progressSize.circular}
            color={color}
            thickness={size === 'large' ? 6 : 4}
          />
          {showPercentage && variant === 'determinate' && (
            <Box
              sx={{
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                position: 'absolute',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography
                variant={size === 'small' ? 'caption' : 'body2'}
                component="div"
                color="text.secondary"
                sx={{ fontWeight: 600 }}
              >
                {Math.round(value)}%
              </Typography>
            </Box>
          )}
        </Box>

        {description && (
          <Typography variant="body2" color="text.secondary" align="center">
            {description}
          </Typography>
        )}

        {showETA && eta && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            ETA: {formatETA(eta)}
          </Typography>
        )}
      </Box>
    );
  }

  // Linear progress (default)
  return (
    <Box sx={{ width: '100%' }}>
      {title && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body1">{title}</Typography>
          {showPercentage && variant === 'determinate' && (
            <Typography variant="body2" color="text.secondary">
              {Math.round(value)}%
            </Typography>
          )}
        </Box>
      )}

      <LinearProgress
        variant={variant}
        value={value}
        color={color}
        sx={{
          height: progressSize.linear,
          borderRadius: progressSize.linear / 2,
          ...(animated && {
            '& .MuiLinearProgress-bar': {
              transition: 'transform 0.4s ease-in-out',
            },
          }),
        }}
      />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
        {description && (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        )}

        {showETA && eta && (
          <Typography variant="caption" color="text.secondary">
            ETA: {formatETA(eta)}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default ProgressIndicator;