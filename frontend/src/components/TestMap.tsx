import React from 'react';
import { Box, Typography, Button } from '@mui/material';

const TestMap: React.FC = () => {
  return (
    <Box sx={{
      width: '100%',
      height: '100%',
      minHeight: '600px',
      bgcolor: '#e3f2fd',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      border: '3px solid #1976d2',
      borderRadius: 2,
      position: 'relative'
    }}>
      <Typography variant="h4" sx={{ color: '#1976d2', fontWeight: 'bold', mb: 2 }}>
        🗺️ Map Area
      </Typography>

      <Typography variant="body1" sx={{ color: '#666', mb: 3, textAlign: 'center' }}>
        This is where the interactive map will be displayed.<br/>
        Nassau County GIS data visualization
      </Typography>

      {/* Fake map elements */}
      <Box sx={{
        position: 'relative',
        width: 400,
        height: 200,
        bgcolor: '#f5f5f5',
        borderRadius: 1,
        border: '2px dashed #ccc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Typography variant="body2" color="text.secondary">
          Interactive Map Placeholder
        </Typography>
      </Box>

      {/* Test buttons */}
      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button variant="contained" size="small">
          Zoom In
        </Button>
        <Button variant="outlined" size="small">
          Layers
        </Button>
        <Button variant="outlined" size="small">
          Reset View
        </Button>
      </Box>

      {/* Corner indicators */}
      <Box sx={{ position: 'absolute', top: 16, left: 16, bgcolor: 'success.main', color: 'white', px: 1, py: 0.5, borderRadius: 1, fontSize: 12 }}>
        TOP LEFT
      </Box>
      <Box sx={{ position: 'absolute', top: 16, right: 16, bgcolor: 'error.main', color: 'white', px: 1, py: 0.5, borderRadius: 1, fontSize: 12 }}>
        TOP RIGHT
      </Box>
      <Box sx={{ position: 'absolute', bottom: 16, left: 16, bgcolor: 'warning.main', color: 'white', px: 1, py: 0.5, borderRadius: 1, fontSize: 12 }}>
        BOTTOM LEFT
      </Box>
      <Box sx={{ position: 'absolute', bottom: 16, right: 16, bgcolor: 'info.main', color: 'white', px: 1, py: 0.5, borderRadius: 1, fontSize: 12 }}>
        BOTTOM RIGHT
      </Box>
    </Box>
  );
};

export default TestMap;