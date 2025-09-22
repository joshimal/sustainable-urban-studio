import React from 'react'
import './App.css'
import MapViewer from './components/MapViewer'
import NassauAnalysis from './components/NassauAnalysis'
import FileUploader from './components/FileUploader'

function App() {
  return (
    <div className="App">
      <header className="app-header">
        <h1>🌱 Nassau County Urban Planning Studio</h1>
        <p>Building equitable, accessible, and climate-resilient communities</p>
      </header>
      
      <main className="main-content">
        <section className="map-section">
          <MapViewer center={[40.7259, -73.5143]} zoom={10} />
        </section>
        
        <NassauAnalysis />
        <FileUploader />
        
        <div className="status-grid">
          <div className="status-card">
            <h3>✅ Nassau County Focus</h3>
            <p>Multi-family housing and climate resilience</p>
          </div>
          
          <div className="status-card">
            <h3>✅ Real Data Integration</h3>
            <p>LIRR stations, parcels, and flood zones</p>
          </div>
          
          <div className="status-card">
            <h3>✅ QGIS Analysis</h3>
            <p>Spatial modeling for policy decisions</p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App