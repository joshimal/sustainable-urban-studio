import React from 'react';
import {
  Grid,
  Typography,
  Box,
  Paper,
  Alert,
} from '@mui/material';
import {
  LocationCity as CityIcon,
  Train as TrainIcon,
  Water as WaterIcon,
  Nature as NatureIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';

import { useAppContext } from '../contexts/AppContext';
import KPICard from '../components/visualization/KPICard';
import AnalyticsChart from '../components/visualization/AnalyticsChart';

const Dashboard: React.FC = () => {
  const { state } = useAppContext();
  const { gisData, analysis } = state;

  // Sample data for demonstration
  const housingData = [
    { month: 'Jan', permits: 45, completions: 32 },
    { month: 'Feb', permits: 52, completions: 38 },
    { month: 'Mar', permits: 48, completions: 42 },
    { month: 'Apr', permits: 61, completions: 45 },
    { month: 'May', permits: 55, completions: 48 },
    { month: 'Jun', permits: 67, completions: 52 },
  ];

  const sustainabilityData = [
    { category: 'Tree Canopy', current: 24, target: 30 },
    { category: 'Transit Access', current: 45, target: 60 },
    { category: 'Flood Resilience', current: 78, target: 85 },
    { category: 'Energy Efficiency', current: 32, target: 50 },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 700 }}>
        Nassau County Planning Dashboard
      </Typography>

      <Grid container spacing={3}>
        {/* KPI Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Total Parcels"
            value={gisData.parcels?.features?.length || 0}
            unit="properties"
            subtitle="Analyzed parcels"
            icon={<CityIcon />}
            color="primary"
            loading={gisData.loading.parcels}
            error={gisData.error.parcels}
            formatValue={(value) => typeof value === 'number' ? value.toLocaleString() : String(value)}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="LIRR Stations"
            value={gisData.stations?.features?.length || 0}
            unit="stations"
            subtitle="Transit hubs"
            icon={<TrainIcon />}
            color="secondary"
            loading={gisData.loading.stations}
            error={gisData.error.stations}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Flood Risk Areas"
            value={gisData.flood_zones?.features?.length || 0}
            unit="zones"
            subtitle="FEMA flood zones"
            icon={<WaterIcon />}
            color="warning"
            loading={gisData.loading.flood_zones}
            error={gisData.error.flood_zones}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Tree Canopy Coverage"
            value={24.5}
            unit="%"
            subtitle="Current coverage"
            target={30}
            trend="up"
            trendValue={2.1}
            icon={<NatureIcon />}
            color="success"
            formatValue={(value) => typeof value === 'number' ? value.toFixed(1) : String(value)}
          />
        </Grid>

        {/* Housing Development Chart */}
        <Grid item xs={12} md={8}>
          <AnalyticsChart
            title="Housing Development Trends"
            subtitle="Monthly permits and completions"
            type="bar"
            data={housingData}
            xAxisKey="month"
            yAxisKeys={['permits', 'completions']}
            colors={['#1976d2', '#2e7d32']}
            height={350}
          />
        </Grid>

        {/* Sustainability Metrics */}
        <Grid item xs={12} md={4}>
          <AnalyticsChart
            title="Sustainability Goals"
            subtitle="Progress toward 2030 targets"
            type="bar"
            data={sustainabilityData}
            xAxisKey="category"
            yAxisKeys={['current', 'target']}
            colors={['#1976d2', '#90caf9']}
            height={350}
          />
        </Grid>

        {/* Analysis Results */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Housing & Transit Analysis
            </Typography>

            {analysis.results.housing ? (
              <Box>
                <Typography variant="body2" paragraph>
                  Analysis completed successfully with the following findings:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • {analysis.results.housing.stations_analyzed} LIRR stations analyzed
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • {analysis.results.housing.parcels_near_transit} parcels near transit
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • {analysis.results.housing.multi_family_potential} multi-family development potential
                </Typography>
              </Box>
            ) : analysis.loading.housing ? (
              <Alert severity="info">
                Housing analysis in progress...
              </Alert>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Run housing and transit analysis from the Analysis panel to see results here.
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Climate Resilience */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Climate Resilience Assessment
            </Typography>

            {analysis.results.flood ? (
              <Box>
                <Typography variant="body2" paragraph>
                  Flood risk analysis shows:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • {analysis.results.flood.properties_in_flood_zones} properties in flood zones
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • ${(analysis.results.flood.total_value_at_risk / 1000000).toFixed(1)}M total value at risk
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • ${(analysis.results.flood.average_property_value / 1000).toFixed(0)}K average property value
                </Typography>
              </Box>
            ) : analysis.loading.flood ? (
              <Alert severity="info">
                Flood risk analysis in progress...
              </Alert>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Run flood risk analysis to assess climate vulnerability across Nassau County.
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {state.ui.notifications.slice(0, 5).map((notification) => (
                <Alert
                  key={notification.id}
                  severity={notification.type}
                  sx={{ '& .MuiAlert-message': { width: '100%' } }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2">
                      {notification.message}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(notification.timestamp).toLocaleTimeString()}
                    </Typography>
                  </Box>
                </Alert>
              ))}

              {state.ui.notifications.length === 0 && (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                  No recent activity
                </Typography>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;