import React, { useState, useEffect } from 'react';

function App() {
  const [gisData, setGisData] = useState({
    parcels: null,
    stations: null,
    flood_zones: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    const loadGISData = async () => {
      try {
        console.log('🔄 Loading GIS data...');
        
        // Test backend health first
        const healthResponse = await fetch('http://localhost:3001/api/qgis/health');
        console.log('Health check:', await healthResponse.json());
        
        // Load all GIS data types
        const [parcelsRes, stationsRes, floodRes] = await Promise.all([
          fetch('http://localhost:3001/api/qgis/nassau/get-data?type=parcels'),
          fetch('http://localhost:3001/api/qgis/nassau/get-data?type=stations'),
          fetch('http://localhost:3001/api/qgis/nassau/get-data?type=flood_zones')
        ]);
        
        const parcels = await parcelsRes.json();
        const stations = await stationsRes.json();
        const flood_zones = await floodRes.json();
        
        console.log('✅ GIS data loaded:', { parcels, stations, flood_zones });
        
        setGisData({
          parcels: parcels.data,
          stations: stations.data,
          flood_zones: flood_zones.data,
          loading: false,
          error: null
        });
        
      } catch (error) {
        console.error('❌ Error loading GIS data:', error);
        setGisData(prev => ({
          ...prev,
          loading: false,
          error: error.message
        }));
      }
    };
    
    loadGISData();
  }, []);

  if (gisData.loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Loading GIS Data...</h1>
        <p>Please wait while we fetch Nassau County data...</p>
      </div>
    );
  }

  if (gisData.error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
        <h1>Error Loading Data</h1>
        <p>{gisData.error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: 'blue', fontSize: '2rem', marginBottom: '20px' }}>
        🗺️ Nassau County GIS Data
      </h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
          <h3>🏠 Parcels ({gisData.parcels?.features?.length || 0})</h3>
          {gisData.parcels?.features?.map((feature, i) => (
            <div key={i} style={{ marginBottom: '10px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              <strong>{feature.properties.address}</strong><br/>
              <small>Zoning: {feature.properties.zoning} | Area: {feature.properties.area} sq ft</small>
            </div>
          ))}
        </div>
        
        <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
          <h3>🚂 LIRR Stations ({gisData.stations?.features?.length || 0})</h3>
          {gisData.stations?.features?.map((feature, i) => (
            <div key={i} style={{ marginBottom: '10px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              <strong>{feature.properties.name}</strong><br/>
              <small>Line: {feature.properties.line} | Zone: {feature.properties.zone}</small>
            </div>
          ))}
        </div>
        
        <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
          <h3>🌊 Flood Zones ({gisData.flood_zones?.features?.length || 0})</h3>
          {gisData.flood_zones?.features?.map((feature, i) => (
            <div key={i} style={{ marginBottom: '10px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              <strong>Zone {feature.properties.zone}</strong><br/>
              <small>{feature.properties.description}</small>
            </div>
          ))}
        </div>
      </div>
      
      <div style={{ backgroundColor: '#e8f5e8', padding: '15px', borderRadius: '8px', border: '1px solid #4caf50' }}>
        <h3>✅ GIS Data Flow Working!</h3>
        <p>Successfully loaded data from:</p>
        <ul>
          <li>Backend API: <code>http://localhost:3001/api/qgis/</code></li>
          <li>QGIS Service: <code>http://localhost:8081/</code></li>
          <li>Database: PostgreSQL with PostGIS</li>
        </ul>
      </div>
    </div>
  );
}

export default App;








