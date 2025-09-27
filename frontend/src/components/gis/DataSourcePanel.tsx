import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Switch,
  FormControlLabel,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Collapse,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Layers as LayersIcon,
  CloudDownload as DownloadIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Train as TrainIcon,
  Water as WaterIcon,
  LocationCity as LocationCityIcon,
  Nature as NatureIcon,
} from '@mui/icons-material';

import { useAppContext } from '../../contexts/AppContext';
import { gisAPI } from '../../services/api';
import ProgressIndicator from '../visualization/ProgressIndicator';

interface DataSource {
  id: string;
  name: string;
  description: string;
  type: 'vector' | 'raster';
  category: 'parcels' | 'stations' | 'flood_zones' | 'custom';
  enabled: boolean;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  featureCount?: number;
  icon: React.ReactNode;
  status: 'available' | 'loading' | 'error' | 'outdated';
}

const DataSourcePanel: React.FC = () => {
  const { state, actions } = useAppContext();
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  const { selectedLayers } = state.user.preferences;
  const { loading: gisLoading, error: gisError, lastUpdated } = state.gisData;

  // Define data sources configuration
  const dataSources: DataSource[] = [
    {
      id: 'parcels',
      name: 'Property Parcels',
      description: 'Nassau County property boundaries with zoning and valuation data',
      type: 'vector',
      category: 'parcels',
      enabled: selectedLayers.parcels,
      loading: gisLoading.parcels,
      error: gisError.parcels,
      lastUpdated: lastUpdated.parcels,
      featureCount: state.gisData.parcels?.features?.length,
      icon: <LocationCityIcon />,
      status: gisError.parcels ? 'error' : gisLoading.parcels ? 'loading' : 'available',
    },
    {
      id: 'lirr_stations',
      name: 'LIRR Stations',
      description: 'Long Island Rail Road station locations and transit information',
      type: 'vector',
      category: 'stations',
      enabled: selectedLayers.lirr_stations,
      loading: gisLoading.stations,
      error: gisError.stations,
      lastUpdated: lastUpdated.stations,
      featureCount: state.gisData.stations?.features?.length,
      icon: <TrainIcon />,
      status: gisError.stations ? 'error' : gisLoading.stations ? 'loading' : 'available',
    },
    {
      id: 'flood_zones',
      name: 'Flood Risk Zones',
      description: 'FEMA flood hazard areas and sea level rise projections',
      type: 'vector',
      category: 'flood_zones',
      enabled: selectedLayers.flood_zones,
      loading: gisLoading.flood_zones,
      error: gisError.flood_zones,
      lastUpdated: lastUpdated.flood_zones,
      featureCount: state.gisData.flood_zones?.features?.length,
      icon: <WaterIcon />,
      status: gisError.flood_zones ? 'error' : gisLoading.flood_zones ? 'loading' : 'available',
    },
  ];

  // Add custom layers
  const customDataSources: DataSource[] = state.gisData.custom_layers.map(layer => ({
    id: layer.id,
    name: layer.name,
    description: layer.description || 'Custom uploaded layer',
    type: layer.type || 'vector',
    category: 'custom',
    enabled: layer.visible !== false,
    loading: false,
    error: null,
    lastUpdated: layer.uploadedAt ? new Date(layer.uploadedAt) : null,
    featureCount: layer.featureCount,
    icon: <LayersIcon />,
    status: 'available',
  }));

  const allDataSources = [...dataSources, ...customDataSources];

  const handleLayerToggle = (sourceId: string, enabled: boolean) => {
    const layerMap: { [key: string]: keyof typeof selectedLayers } = {
      'parcels': 'parcels',
      'lirr_stations': 'lirr_stations',
      'flood_zones': 'flood_zones',
    };

    const layerKey = layerMap[sourceId];
    if (layerKey) {
      actions.setSelectedLayers({ [layerKey]: enabled });
    }
  };

  const handleRefreshData = async (sourceId: string) => {
    const source = dataSources.find(s => s.id === sourceId);
    if (!source) return;

    try {
      actions.setGISLoading(source.category, true);
      actions.setGISError(source.category, null);

      const data = await gisAPI.getNassauData(source.category as any);
      actions.setGISData(source.category, data.data);

      actions.addNotification({
        type: 'success',
        message: `${source.name} data refreshed successfully`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh data';
      actions.setGISError(source.category, errorMessage);
      actions.addNotification({
        type: 'error',
        message: `Failed to refresh ${source.name}: ${errorMessage}`,
      });
    } finally {
      actions.setGISLoading(source.category, false);
    }
  };

  const handleDownloadData = async (sourceId: string) => {
    // Implement data download functionality
    actions.addNotification({
      type: 'info',
      message: 'Data download feature coming soon',
    });
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, sourceId: string) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedSource(sourceId);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedSource(null);
  };

  const getStatusChip = (status: string, loading: boolean) => {
    if (loading) {
      return <Chip size="small" label="Loading..." color="primary" />;
    }

    switch (status) {
      case 'available':
        return <Chip size="small" label="Ready" color="success" />;
      case 'error':
        return <Chip size="small" label="Error" color="error" />;
      case 'outdated':
        return <Chip size="small" label="Outdated" color="warning" />;
      default:
        return <Chip size="small" label="Unknown" color="default" />;
    }
  };

  const getStatusIcon = (status: string, loading: boolean) => {
    if (loading) return null;

    switch (status) {
      case 'available':
        return <CheckCircleIcon color="success" fontSize="small" />;
      case 'error':
        return <ErrorIcon color="error" fontSize="small" />;
      case 'outdated':
        return <WarningIcon color="warning" fontSize="small" />;
      default:
        return <InfoIcon color="action" fontSize="small" />;
    }
  };

  return (
    <Card>
      <CardHeader
        title="Data Sources"
        subheader="Manage GIS datasets and layers"
        action={
          <Tooltip title="Refresh all data sources">
            <IconButton onClick={() => window.location.reload()}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        }
      />

      <CardContent sx={{ pt: 0 }}>
        <List>
          {allDataSources.map((source, index) => (
            <React.Fragment key={source.id}>
              <ListItem
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1,
                  bgcolor: source.enabled ? 'action.selected' : 'background.paper',
                }}
              >
                <ListItemIcon>
                  {source.icon}
                </ListItemIcon>

                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: source.enabled ? 600 : 400 }}>
                        {source.name}
                      </Typography>
                      {getStatusChip(source.status, source.loading)}
                      {source.featureCount && (
                        <Typography variant="caption" color="text.secondary">
                          ({source.featureCount.toLocaleString()} features)
                        </Typography>
                      )}
                    </Box>
                  }
                  secondary={source.description}
                />

                <ListItemSecondaryAction>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={source.enabled}
                          onChange={(e) => handleLayerToggle(source.id, e.target.checked)}
                          disabled={source.loading}
                        />
                      }
                      label=""
                      sx={{ mr: 1 }}
                    />

                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, source.id)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>

              {source.loading && (
                <Box sx={{ mb: 2 }}>
                  <ProgressIndicator
                    type="linear"
                    variant="indeterminate"
                    title={`Loading ${source.name}...`}
                    animated
                  />
                </Box>
              )}

              {source.error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>{source.name} Error:</strong> {source.error}
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => handleRefreshData(source.id)}
                    sx={{ mt: 1 }}
                  >
                    Retry
                  </Button>
                </Alert>
              )}

              {index < allDataSources.length - 1 && <Divider sx={{ my: 1 }} />}
            </React.Fragment>
          ))}
        </List>

        {allDataSources.length === 0 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              py: 4,
              color: 'text.secondary',
            }}
          >
            <LayersIcon sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Data Sources
            </Typography>
            <Typography variant="body2" align="center">
              Upload GIS files or connect to data sources to get started
            </Typography>
          </Box>
        )}

        <Menu
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={() => {
            if (selectedSource) handleRefreshData(selectedSource);
            handleMenuClose();
          }}>
            <RefreshIcon fontSize="small" sx={{ mr: 1 }} />
            Refresh Data
          </MenuItem>
          <MenuItem onClick={() => {
            if (selectedSource) handleDownloadData(selectedSource);
            handleMenuClose();
          }}>
            <DownloadIcon fontSize="small" sx={{ mr: 1 }} />
            Download
          </MenuItem>
          <MenuItem onClick={() => {
            setExpandedSource(selectedSource === expandedSource ? null : selectedSource);
            handleMenuClose();
          }}>
            <InfoIcon fontSize="small" sx={{ mr: 1 }} />
            Show Details
          </MenuItem>
        </Menu>
      </CardContent>
    </Card>
  );
};

export default DataSourcePanel;