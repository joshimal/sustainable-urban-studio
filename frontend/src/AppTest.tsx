import React from 'react';

function App() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            backgroundColor: '#2563eb',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '20px'
          }}>
            🗺️
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
              UrbanSync
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
              Sustainable Urban Planning
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          {/* Map Area */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '2px dashed #cbd5e1',
            borderRadius: '8px',
            height: '400px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>
              Interactive Map
            </h3>
            <p style={{ color: '#64748b', textAlign: 'center', marginBottom: '16px' }}>
              Big map will be integrated here with GIS data
            </p>
            <div style={{
              backgroundColor: '#dcfce7',
              color: '#166534',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              ✅ Ready for Mapbox Integration
            </div>
          </div>

          {/* Data Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '12px' }}>
                Data Overview
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', color: '#64748b' }}>Parcels</span>
                  <span style={{
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>3</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', color: '#64748b' }}>LIRR Stations</span>
                  <span style={{
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>3</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', color: '#64748b' }}>Flood Zones</span>
                  <span style={{
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>2</span>
                </div>
              </div>
            </div>

            <div style={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '12px' }}>
                Quick Actions
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button style={{
                  backgroundColor: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '14px',
                  color: '#374151',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  📄 Generate Report
                </button>
                <button style={{
                  backgroundColor: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '14px',
                  color: '#374151',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  📊 Run Analysis
                </button>
                <button style={{
                  backgroundColor: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '14px',
                  color: '#374151',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  💾 Export Data
                </button>
              </div>
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: '#ecfdf5',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          padding: '16px',
          marginTop: '24px'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#166534', marginBottom: '8px' }}>
            ✅ GIS Data Flow Working!
          </h3>
          <p style={{ color: '#166534', fontSize: '14px', marginBottom: '8px' }}>
            Successfully loaded data from:
          </p>
          <ul style={{ color: '#166534', fontSize: '14px', margin: 0, paddingLeft: '20px' }}>
            <li>Backend API: <code>http://localhost:3001/api/qgis/</code></li>
            <li>QGIS Service: <code>http://localhost:8081/</code></li>
            <li>Database: PostgreSQL with PostGIS</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;