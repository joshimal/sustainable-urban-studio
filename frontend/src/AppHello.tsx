import React from 'react';

function App() {
  return (
    <div style={{ 
      padding: '20px', 
      textAlign: 'center',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f0f9ff',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        maxWidth: '600px'
      }}>
        <h1 style={{ 
          fontSize: '48px', 
          color: '#1e40af', 
          marginBottom: '20px',
          fontWeight: 'bold'
        }}>
          🗺️ UrbanSync
        </h1>
        <p style={{ 
          fontSize: '24px', 
          color: '#64748b', 
          marginBottom: '30px' 
        }}>
          Sustainable Urban Planning
        </p>
        <div style={{
          backgroundColor: '#dcfce7',
          color: '#166534',
          padding: '16px',
          borderRadius: '8px',
          fontSize: '18px',
          fontWeight: '500'
        }}>
          ✅ React App is Working!
        </div>
        <p style={{ 
          fontSize: '16px', 
          color: '#64748b', 
          marginTop: '20px' 
        }}>
          Ready to integrate with GIS data and Mapbox
        </p>
      </div>
    </div>
  );
}

export default App;








