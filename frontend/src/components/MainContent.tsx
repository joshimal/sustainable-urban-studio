import React from 'react';
import { Box, Typography, Alert } from '@mui/material';

import { useAppContext } from '../contexts/AppContext';
import Dashboard from '../pages/Dashboard';
import MapViewer from './MapViewer';
import AnalysisPanel from './AnalysisPanel';
import NassauAnalysis from './NassauAnalysis';
import DataSourcePanel from './gis/DataSourcePanel';
import FileUploadPanel from './gis/FileUploadPanel';

const MainContent: React.FC = () => {
  const { state } = useAppContext();
  const { selectedTool } = state.ui;

  const renderContent = () => {
    switch (selectedTool) {
      case 'dashboard':
        return <Dashboard />;

      case 'map':
        return (
          <Box>
            <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 700 }}>
              Interactive Map
            </Typography>
            <MapViewer center={[40.7259, -73.5143]} zoom={10} />
          </Box>
        );

      case 'analysis':
        return (
          <Box>
            <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 700 }}>
              Spatial Analysis
            </Typography>
            <AnalysisPanel />
          </Box>
        );

      case 'visualization':
        return (
          <Box>
            <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 700 }}>
              Data Visualization
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              Advanced visualization tools are coming soon. Use the Dashboard for current charts and metrics.
            </Alert>
          </Box>
        );

      case 'upload':
        return (
          <Box>
            <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 700 }}>
              Upload Data
            </Typography>
            <FileUploadPanel />
          </Box>
        );

      case 'layers':
        return (
          <Box>
            <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 700 }}>
              Layer Management
            </Typography>
            <DataSourcePanel />
          </Box>
        );

      case 'datasets':
        return (
          <Box>
            <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 700 }}>
              Available Datasets
            </Typography>
            <DataSourcePanel />
          </Box>
        );

      case 'housing-transit':
        return (
          <Box>
            <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 700 }}>
              Housing & Transit Analysis
            </Typography>
            <NassauAnalysis />
          </Box>
        );

      case 'flood-risk':
        return (
          <Box>
            <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 700 }}>
              Flood Risk Assessment
            </Typography>
            <NassauAnalysis />
          </Box>
        );

      case 'tree-canopy':
        return (
          <Box>
            <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 700 }}>
              Tree Canopy Analysis
            </Typography>
            <AnalysisPanel />
          </Box>
        );

      case 'development':
        return (
          <Box>
            <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 700 }}>
              Development Patterns
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              Development pattern analysis tools are in development.
            </Alert>
          </Box>
        );

      case 'equity-metrics':
        return (
          <Box>
            <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 700 }}>
              Equity Metrics
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              Social equity analysis tools are coming soon.
            </Alert>
          </Box>
        );

      case 'preferences':
        return (
          <Box>
            <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 700 }}>
              Preferences
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              User preferences panel is in development.
            </Alert>
          </Box>
        );

      case 'help':
        return (
          <Box>
            <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 700 }}>
              Help & Documentation
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              Documentation and help resources are being prepared.
            </Alert>
          </Box>
        );

      default:
        return <Dashboard />;
    }
  };

  return (
    <Box sx={{ minHeight: 'calc(100vh - 120px)' }}>
      {renderContent()}
    </Box>
  );
};

export default MainContent;