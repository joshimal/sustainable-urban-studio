import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Chip,
  Divider,
  Collapse,
  Badge,
} from '@mui/material';
import {
  Map as MapIcon,
  Analytics as AnalyticsIcon,
  CloudUpload as UploadIcon,
  Layers as LayersIcon,
  Assessment as AssessmentIcon,
  Home as HomeIcon,
  DataThresholding as DataIcon,
  Settings as SettingsIcon,
  Help as HelpIcon,
  ExpandLess,
  ExpandMore,
  Nature as NatureIcon,
  Train as TrainIcon,
  Water as WaterIcon,
  LocationCity as CityIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

import { useAppContext } from '../../contexts/AppContext';

const Sidebar: React.FC = () => {
  const theme = useTheme();
  const { state, actions } = useAppContext();
  const [expandedSections, setExpandedSections] = React.useState<string[]>(['tools', 'data']);

  const { selectedTool } = state.ui;
  const { selectedLayers } = state.user.preferences;
  const { loading: gisLoading } = state.gisData;
  const { loading: analysisLoading } = state.analysis;

  const handleToolSelect = (tool: string) => {
    actions.setSelectedTool(tool);
  };

  const handleSectionToggle = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const isLoading = Object.values(gisLoading).some(Boolean) ||
                   Object.values(analysisLoading).some(Boolean);

  const navigation = [
    {
      id: 'overview',
      title: 'Overview',
      items: [
        {
          id: 'dashboard',
          text: 'Dashboard',
          icon: <HomeIcon />,
          badge: null,
        },
      ],
    },
    {
      id: 'tools',
      title: 'Planning Tools',
      expandable: true,
      items: [
        {
          id: 'map',
          text: 'Interactive Map',
          icon: <MapIcon />,
          badge: selectedLayers ? Object.values(selectedLayers).filter(Boolean).length : 0,
        },
        {
          id: 'analysis',
          text: 'Spatial Analysis',
          icon: <AnalyticsIcon />,
          badge: isLoading ? 'loading' : null,
        },
        {
          id: 'visualization',
          text: 'Data Visualization',
          icon: <AssessmentIcon />,
          badge: null,
        },
      ],
    },
    {
      id: 'data',
      title: 'Data Management',
      expandable: true,
      items: [
        {
          id: 'upload',
          text: 'Upload Data',
          icon: <UploadIcon />,
          badge: null,
        },
        {
          id: 'layers',
          text: 'Layer Management',
          icon: <LayersIcon />,
          badge: state.gisData.custom_layers.length,
        },
        {
          id: 'datasets',
          text: 'Datasets',
          icon: <DataIcon />,
          badge: null,
        },
      ],
    },
    {
      id: 'analyses',
      title: 'Nassau County Focus',
      expandable: true,
      items: [
        {
          id: 'housing-transit',
          text: 'Housing & Transit',
          icon: <TrainIcon />,
          badge: state.analysis.results.housing ? 'complete' : null,
          description: 'Multi-family housing near LIRR',
        },
        {
          id: 'flood-risk',
          text: 'Flood Risk',
          icon: <WaterIcon />,
          badge: state.analysis.results.flood ? 'complete' : null,
          description: 'South Shore climate resilience',
        },
        {
          id: 'tree-canopy',
          text: 'Tree Canopy',
          icon: <NatureIcon />,
          badge: state.analysis.results.tree_canopy ? 'complete' : null,
          description: 'Urban forest coverage',
        },
        {
          id: 'development',
          text: 'Development Patterns',
          icon: <CityIcon />,
          badge: null,
          description: 'Zoning and land use analysis',
        },
        {
          id: 'equity-metrics',
          text: 'Equity Metrics',
          icon: <TrendingUpIcon />,
          badge: null,
          description: 'Social equity indicators',
        },
      ],
    },
    {
      id: 'settings',
      title: 'Settings & Support',
      items: [
        {
          id: 'preferences',
          text: 'Preferences',
          icon: <SettingsIcon />,
          badge: null,
        },
        {
          id: 'help',
          text: 'Help & Documentation',
          icon: <HelpIcon />,
          badge: null,
        },
      ],
    },
  ];

  const renderBadge = (badge: any) => {
    if (badge === null || badge === 0) return null;

    if (badge === 'loading') {
      return (
        <Chip
          size="small"
          label="•••"
          sx={{
            minWidth: 40,
            height: 20,
            fontSize: '0.7rem',
            animation: 'pulse 1.5s ease-in-out infinite',
            '@keyframes pulse': {
              '0%': { opacity: 1 },
              '50%': { opacity: 0.5 },
              '100%': { opacity: 1 },
            },
          }}
          color="primary"
        />
      );
    }

    if (badge === 'complete') {
      return (
        <Chip
          size="small"
          label="✓"
          sx={{ minWidth: 24, height: 20, fontSize: '0.7rem' }}
          color="success"
        />
      );
    }

    return (
      <Badge
        badgeContent={badge}
        color="primary"
        sx={{
          '& .MuiBadge-badge': {
            fontSize: '0.7rem',
            minWidth: 16,
            height: 16,
          },
        }}
      />
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700 }}>
          Planning Studio
        </Typography>
      </Toolbar>

      <Divider />

      <Box sx={{ flexGrow: 1, overflow: 'auto', py: 1 }}>
        <List>
          {navigation.map((section) => (
            <React.Fragment key={section.id}>
              {section.expandable ? (
                <>
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => handleSectionToggle(section.id)}
                      sx={{
                        minHeight: 40,
                        px: 2,
                        py: 1,
                      }}
                    >
                      <ListItemText
                        primary={section.title}
                        primaryTypographyProps={{
                          variant: 'overline',
                          sx: {
                            fontWeight: 600,
                            letterSpacing: 1,
                            fontSize: '0.75rem',
                          },
                        }}
                      />
                      {expandedSections.includes(section.id) ? (
                        <ExpandLess fontSize="small" />
                      ) : (
                        <ExpandMore fontSize="small" />
                      )}
                    </ListItemButton>
                  </ListItem>

                  <Collapse
                    in={expandedSections.includes(section.id)}
                    timeout="auto"
                    unmountOnExit
                  >
                    <List component="div" disablePadding>
                      {section.items.map((item) => (
                        <ListItem key={item.id} disablePadding>
                          <ListItemButton
                            selected={selectedTool === item.id}
                            onClick={() => handleToolSelect(item.id)}
                            sx={{
                              pl: 4,
                              pr: 2,
                              minHeight: 48,
                              borderRadius: 1,
                              mx: 1,
                              mb: 0.5,
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              {item.icon}
                            </ListItemIcon>
                            <ListItemText
                              primary={item.text}
                              secondary={'description' in item ? item.description : undefined}
                              primaryTypographyProps={{
                                variant: 'body2',
                                sx: { fontWeight: selectedTool === item.id ? 600 : 400 },
                              }}
                              secondaryTypographyProps={{
                                variant: 'caption',
                                sx: { fontSize: '0.7rem' },
                              }}
                            />
                            {renderBadge(item.badge)}
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  </Collapse>
                </>
              ) : (
                <>
                  <ListItem disablePadding>
                    <ListItemText
                      primary={section.title}
                      primaryTypographyProps={{
                        variant: 'overline',
                        sx: {
                          fontWeight: 600,
                          letterSpacing: 1,
                          fontSize: '0.75rem',
                          px: 2,
                          py: 1,
                        },
                      }}
                    />
                  </ListItem>
                  {section.items.map((item) => (
                    <ListItem key={item.id} disablePadding>
                      <ListItemButton
                        selected={selectedTool === item.id}
                        onClick={() => handleToolSelect(item.id)}
                        sx={{
                          pl: 2,
                          pr: 2,
                          minHeight: 48,
                          borderRadius: 1,
                          mx: 1,
                          mb: 0.5,
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          {item.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={item.text}
                          primaryTypographyProps={{
                            variant: 'body2',
                            sx: { fontWeight: selectedTool === item.id ? 600 : 400 },
                          }}
                        />
                        {renderBadge(item.badge)}
                      </ListItemButton>
                    </ListItem>
                  ))}
                </>
              )}
              {section.id !== 'settings' && <Divider sx={{ my: 1 }} />}
            </React.Fragment>
          ))}
        </List>
      </Box>

      <Divider />

      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary" align="center" display="block">
          Nassau County Urban Planning Studio
        </Typography>
        <Typography variant="caption" color="text.secondary" align="center" display="block">
          v2.0 Beta
        </Typography>
      </Box>
    </Box>
  );
};

export default Sidebar;