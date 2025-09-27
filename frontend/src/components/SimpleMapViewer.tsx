import React, { useState } from 'react';
import { Box, Typography, Card, CardContent, Chip, Button } from '@mui/material';

interface SimpleMapViewerProps {
  center?: [number, number];
  zoom?: number;
}

const SimpleMapViewer: React.FC<SimpleMapViewerProps> = ({
  center = [-73.5143, 40.7259],
  zoom = 10
}) => {
  const [selectedLayers, setSelectedLayers] = useState({
    parcels: true,
    transit: true,
    flood_zones: true,
    environmental: true
  });

  return (
    <Box sx={{
      width: '100%',
      height: '100vh',
      minHeight: '600px',
      bgcolor: '#f8fafc',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Map Background with Geometric Patterns */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%),
          radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 70%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)
        `,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            linear-gradient(90deg, rgba(148, 163, 184, 0.1) 1px, transparent 1px),
            linear-gradient(rgba(148, 163, 184, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }
      }}>
        {/* Geometric Shapes - Inspired by Agricultural Fields */}
        <Box sx={{
          position: 'absolute',
          top: '20%',
          left: '15%',
          width: '300px',
          height: '200px',
          border: '2px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '8px',
          bgcolor: 'rgba(59, 130, 246, 0.05)',
          transform: 'rotate(-5deg)',
        }}>
          <Typography variant="caption" sx={{
            position: 'absolute',
            top: -20,
            left: 0,
            color: '#3b82f6',
            fontWeight: 600,
            bgcolor: 'white',
            px: 1,
            borderRadius: 1,
            border: '1px solid rgba(59, 130, 246, 0.3)'
          }}>
            Downtown Nassau
          </Typography>
        </Box>

        <Box sx={{
          position: 'absolute',
          top: '40%',
          right: '20%',
          width: '250px',
          height: '180px',
          border: '2px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '8px',
          bgcolor: 'rgba(16, 185, 129, 0.05)',
          transform: 'rotate(8deg)',
        }}>
          <Typography variant="caption" sx={{
            position: 'absolute',
            top: -20,
            left: 0,
            color: '#10b981',
            fontWeight: 600,
            bgcolor: 'white',
            px: 1,
            borderRadius: 1,
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}>
            Residential Zone
          </Typography>
        </Box>

        <Box sx={{
          position: 'absolute',
          bottom: '25%',
          left: '30%',
          width: '200px',
          height: '150px',
          border: '2px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '8px',
          bgcolor: 'rgba(245, 158, 11, 0.05)',
          transform: 'rotate(-3deg)',
        }}>
          <Typography variant="caption" sx={{
            position: 'absolute',
            top: -20,
            left: 0,
            color: '#f59e0b',
            fontWeight: 600,
            bgcolor: 'white',
            px: 1,
            borderRadius: 1,
            border: '1px solid rgba(245, 158, 11, 0.3)'
          }}>
            Commercial District
          </Typography>
        </Box>

        {/* Central Focus Point - Like Drone Position */}
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 20,
          height: 20,
          borderRadius: '50%',
          bgcolor: '#3b82f6',
          boxShadow: '0 0 0 8px rgba(59, 130, 246, 0.2), 0 0 0 16px rgba(59, 130, 246, 0.1)',
          animation: 'pulse 2s infinite',
          '@keyframes pulse': {
            '0%': { transform: 'translate(-50%, -50%) scale(1)' },
            '50%': { transform: 'translate(-50%, -50%) scale(1.1)' },
            '100%': { transform: 'translate(-50%, -50%) scale(1)' },
          }
        }}>
          <Box sx={{
            position: 'absolute',
            top: -25,
            left: '50%',
            transform: 'translateX(-50%)',
            bgcolor: 'white',
            px: 1,
            py: 0.5,
            borderRadius: 1,
            border: '1px solid rgba(59, 130, 246, 0.3)',
            whiteSpace: 'nowrap',
            fontSize: '11px',
            fontWeight: 600,
            color: '#3b82f6'
          }}>
            Analysis Center
          </Box>
        </Box>

        {/* Transportation Lines */}
        <Box sx={{
          position: 'absolute',
          top: '30%',
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, transparent 0%, #3b82f6 20%, #3b82f6 80%, transparent 100%)',
          transform: 'rotate(-10deg)',
          transformOrigin: 'center'
        }} />

        <Box sx={{
          position: 'absolute',
          top: '70%',
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, transparent 0%, #10b981 20%, #10b981 80%, transparent 100%)',
          transform: 'rotate(5deg)',
          transformOrigin: 'center'
        }} />
      </Box>

      {/* Layer Controls - Inspired by Drone Interface */}
      <Box sx={{
        position: 'absolute',
        top: 16,
        left: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 1
      }}>
        {Object.entries(selectedLayers).map(([key, active]) => (
          <Button
            key={key}
            variant={active ? "contained" : "outlined"}
            size="small"
            onClick={() => setSelectedLayers(prev => ({...prev, [key]: !prev[key as keyof typeof prev]}))}
            sx={{
              minWidth: 120,
              bgcolor: active ? 'primary.main' : 'rgba(255,255,255,0.9)',
              color: active ? 'white' : 'text.primary',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
              '&:hover': {
                bgcolor: active ? 'primary.dark' : 'rgba(255,255,255,0.95)'
              }
            }}
          >
            {key.replace('_', ' ').toUpperCase()}
          </Button>
        ))}
      </Box>

      {/* Map Controls */}
      <Box sx={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 1
      }}>
        <Button
          variant="contained"
          sx={{
            minWidth: 40,
            height: 40,
            bgcolor: 'rgba(255,255,255,0.9)',
            color: 'text.primary',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
            fontSize: '18px',
            fontWeight: 'bold'
          }}
        >
          +
        </Button>
        <Button
          variant="contained"
          sx={{
            minWidth: 40,
            height: 40,
            bgcolor: 'rgba(255,255,255,0.9)',
            color: 'text.primary',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
            fontSize: '18px',
            fontWeight: 'bold'
          }}
        >
          −
        </Button>
      </Box>

      {/* Status Indicator */}
      <Box sx={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        bgcolor: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: 1,
        p: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        <Box sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: '#10b981',
          animation: 'pulse 2s infinite'
        }} />
        <Typography variant="caption" sx={{ fontWeight: 600 }}>
          Live Analysis
        </Typography>
      </Box>
    </Box>
  );
};

export default SimpleMapViewer;