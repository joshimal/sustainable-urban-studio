import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Info as InfoIcon,
} from '@mui/icons-material';

export interface KPICardProps {
  title: string;
  value: number | string;
  unit?: string;
  subtitle?: string;
  target?: number;
  previousValue?: number;
  trend?: 'up' | 'down' | 'flat';
  trendValue?: number;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  icon?: React.ReactNode;
  description?: string;
  loading?: boolean;
  error?: string;
  formatValue?: (value: number | string) => string;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  unit,
  subtitle,
  target,
  previousValue,
  trend,
  trendValue,
  color = 'primary',
  icon,
  description,
  loading = false,
  error,
  formatValue,
}) => {
  const theme = useTheme();

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp fontSize="small" color="success" />;
      case 'down':
        return <TrendingDown fontSize="small" color="error" />;
      case 'flat':
        return <TrendingFlat fontSize="small" color="warning" />;
      default:
        return null;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return theme.palette.success.main;
      case 'down':
        return theme.palette.error.main;
      case 'flat':
        return theme.palette.warning.main;
      default:
        return theme.palette.text.secondary;
    }
  };

  const getProgressValue = (): number => {
    if (typeof value !== 'number' || !target) return 0;
    return Math.min((value / target) * 100, 100);
  };

  const displayValue = formatValue ? formatValue(value) : value;

  if (loading) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
            {description && (
              <Tooltip title={description}>
                <IconButton size="small" sx={{ ml: 'auto' }}>
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box sx={{ flexGrow: 1 }}>
              <Box
                sx={{
                  width: '60%',
                  height: 32,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  animation: 'pulse 1.5s ease-in-out infinite',
                  '@keyframes pulse': {
                    '0%': { opacity: 1 },
                    '50%': { opacity: 0.5 },
                    '100%': { opacity: 1 },
                  },
                }}
              />
            </Box>
            {icon && (
              <Box sx={{ ml: 2, color: `${color}.main` }}>
                {icon}
              </Box>
            )}
          </Box>

          {target && (
            <LinearProgress
              variant="indeterminate"
              sx={{ mb: 1 }}
            />
          )}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
            {description && (
              <Tooltip title={description}>
                <IconButton size="small" sx={{ ml: 'auto' }}>
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          <Typography variant="body2" color="error.main" sx={{ fontStyle: 'italic' }}>
            {error}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        height: '100%',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[8],
        },
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
            {title}
          </Typography>
          {description && (
            <Tooltip title={description}>
              <IconButton size="small">
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: target ? 2 : 1 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
              <Typography
                variant="h4"
                component="div"
                color={`${color}.main`}
                sx={{ fontWeight: 700, lineHeight: 1 }}
              >
                {displayValue}
              </Typography>
              {unit && (
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ ml: 0.5 }}
                >
                  {unit}
                </Typography>
              )}
            </Box>

            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
          </Box>

          {icon && (
            <Box sx={{ ml: 2, color: `${color}.main`, fontSize: 48 }}>
              {icon}
            </Box>
          )}
        </Box>

        {target && typeof value === 'number' && (
          <Box sx={{ mb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Progress to target
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {Math.round(getProgressValue())}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={getProgressValue()}
              color={color}
              sx={{
                height: 6,
                borderRadius: 3,
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Target: {formatValue ? formatValue(target) : target}{unit}
            </Typography>
          </Box>
        )}

        {(trend || trendValue !== undefined) && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            {trend && getTrendIcon()}
            {trendValue !== undefined && (
              <Typography
                variant="body2"
                sx={{
                  ml: trend ? 0.5 : 0,
                  color: getTrendColor(),
                  fontWeight: 500,
                }}
              >
                {trendValue > 0 ? '+' : ''}{formatValue ? formatValue(trendValue) : trendValue}
                {unit && ` ${unit}`}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              vs. previous period
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default KPICard;