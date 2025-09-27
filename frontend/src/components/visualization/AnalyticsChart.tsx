import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Skeleton,
  Alert,
  useTheme,
  Tooltip,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Download as DownloadIcon,
  Fullscreen as FullscreenIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export type ChartType = 'line' | 'area' | 'bar' | 'pie';

export interface ChartDataPoint {
  [key: string]: string | number;
}

export interface AnalyticsChartProps {
  title: string;
  subtitle?: string;
  description?: string;
  type: ChartType;
  data: ChartDataPoint[];
  xAxisKey?: string;
  yAxisKeys?: string[];
  colors?: string[];
  loading?: boolean;
  error?: string;
  height?: number;
  onRefresh?: () => void;
  onDownload?: () => void;
  onFullscreen?: () => void;
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
}

const AnalyticsChart: React.FC<AnalyticsChartProps> = ({
  title,
  subtitle,
  description,
  type,
  data,
  xAxisKey = 'x',
  yAxisKeys = ['y'],
  colors = ['#1976d2', '#dc004e', '#ed6c02', '#2e7d32', '#9c27b0'],
  loading = false,
  error,
  height = 300,
  onRefresh,
  onDownload,
  onFullscreen,
  showLegend = true,
  showGrid = true,
  showTooltip = true,
}) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const getChartColors = () => {
    return colors.length >= yAxisKeys.length
      ? colors.slice(0, yAxisKeys.length)
      : [...colors, ...theme.palette.mode === 'dark'
          ? ['#90caf9', '#f48fb1', '#ffcc02', '#81c784', '#ce93d8']
          : ['#1565c0', '#ad1457', '#e65100', '#1b5e20', '#6a1b9a']
        ].slice(0, yAxisKeys.length);
  };

  const chartColors = getChartColors();

  const renderChart = () => {
    if (loading) {
      return (
        <Box sx={{ width: '100%', height }}>
          <Skeleton variant="rectangular" width="100%" height="100%" />
        </Box>
      );
    }

    if (error) {
      return (
        <Alert severity="error" sx={{ m: 2 }}>
          <Typography variant="body2">{error}</Typography>
          {onRefresh && (
            <IconButton size="small" onClick={onRefresh} sx={{ ml: 1 }}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          )}
        </Alert>
      );
    }

    if (!data || data.length === 0) {
      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height,
            color: 'text.secondary',
          }}
        >
          <Typography variant="body2">No data available</Typography>
        </Box>
      );
    }

    const commonProps = {
      width: '100%',
      height,
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    switch (type) {
      case 'line':
        return (
          <ResponsiveContainer {...commonProps}>
            <LineChart data={data}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey={xAxisKey} />
              <YAxis />
              {showTooltip && <RechartsTooltip />}
              {showLegend && <Legend />}
              {yAxisKeys.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={chartColors[index]}
                  strokeWidth={2}
                  dot={{ fill: chartColors[index], strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer {...commonProps}>
            <AreaChart data={data}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey={xAxisKey} />
              <YAxis />
              {showTooltip && <RechartsTooltip />}
              {showLegend && <Legend />}
              {yAxisKeys.map((key, index) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={chartColors[index]}
                  fill={chartColors[index]}
                  fillOpacity={0.3}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer {...commonProps}>
            <BarChart data={data}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey={xAxisKey} />
              <YAxis />
              {showTooltip && <RechartsTooltip />}
              {showLegend && <Legend />}
              {yAxisKeys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={chartColors[index]}
                  radius={[2, 2, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer {...commonProps}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={height / 3}
                fill="#8884d8"
                dataKey={yAxisKeys[0]}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              {showTooltip && <RechartsTooltip />}
              {showLegend && <Legend />}
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return <Typography color="error">Unknown chart type: {type}</Typography>;
    }
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              {title}
            </Typography>
            {description && (
              <Tooltip title={description}>
                <InfoIcon fontSize="small" color="action" sx={{ mr: 1 }} />
              </Tooltip>
            )}
          </Box>
        }
        subheader={subtitle}
        action={
          <IconButton aria-label="settings" onClick={handleMenuOpen}>
            <MoreVertIcon />
          </IconButton>
        }
        sx={{ pb: 1 }}
      />

      <CardContent sx={{ pt: 0, '&:last-child': { pb: 2 } }}>
        {renderChart()}
      </CardContent>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {onRefresh && (
          <MenuItem onClick={() => { onRefresh(); handleMenuClose(); }}>
            <RefreshIcon fontSize="small" sx={{ mr: 1 }} />
            Refresh Data
          </MenuItem>
        )}
        {onDownload && (
          <MenuItem onClick={() => { onDownload(); handleMenuClose(); }}>
            <DownloadIcon fontSize="small" sx={{ mr: 1 }} />
            Download Chart
          </MenuItem>
        )}
        {onFullscreen && (
          <MenuItem onClick={() => { onFullscreen(); handleMenuClose(); }}>
            <FullscreenIcon fontSize="small" sx={{ mr: 1 }} />
            View Fullscreen
          </MenuItem>
        )}
      </Menu>
    </Card>
  );
};

export default AnalyticsChart;