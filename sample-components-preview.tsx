import React, { useState } from 'react';

const SampleComponents = () => {
  const [activeTab, setActiveTab] = useState('map');
  const [analysisRunning, setAnalysisRunning] = useState(false);

  // Sample data for demonstrations
  const floodRiskData = [
    { zone: 'Downtown', risk: 'High', population: 15000, color: '#ef4444' },
    { zone: 'Riverside', risk: 'Very High', population: 8500, color: '#dc2626' },
    { zone: 'Hillside', risk: 'Low', population: 12000, color: '#22c55e' },
    { zone: 'Industrial', risk: 'Medium', population: 3200, color: '#f59e0b' }
  ];

  const treeCanopyData = [
    { neighborhood: 'Green Valley', current: 45, target: 50, potential: 180 },
    { neighborhood: 'Urban Core', current: 12, target: 30, potential: 450 },
    { neighborhood: 'Suburbs', current: 38, target: 40, potential: 95 },
    { neighborhood: 'Waterfront', current: 25, target: 35, potential: 220 }
  ];

  // 1. Interactive Map Component
  const InteractiveMap = () => (
    <div className="map-container">
      <div className="map-header">
        <h3>🗺️ Interactive Planning Map</h3>
        <div className="map-controls">
          <button className="map-btn active">Satellite</button>
          <button className="map-btn">Terrain</button>
          <button className="map-btn">Planning</button>
        </div>
      </div>
      <div className="map-display">
        <div className="map-placeholder">
          <div className="map-grid">
            {Array.from({length: 20}, (_, i) => (
              <div key={i} className={`grid-cell ${i % 4 === 0 ? 'water' : i % 3 === 0 ? 'green' : 'urban'}`}></div>
            ))}
          </div>
          <div className="map-overlay">
            <div className="map-marker flood-risk" style={{top: '20%', left: '30%'}}>⚠️</div>
            <div className="map-marker green-space" style={{top: '60%', left: '70%'}}>🌳</div>
            <div className="map-marker building" style={{top: '45%', left: '50%'}}>🏢</div>
          </div>
        </div>
        <div className="map-legend">
          <div className="legend-item"><span className="legend-color water"></span> Water Bodies</div>
          <div className="legend-item"><span className="legend-color green"></span> Green Space</div>
          <div className="legend-item"><span className="legend-color urban"></span> Urban Areas</div>
        </div>
      </div>
    </div>
  );

  // 2. Climate Analysis Panel
  const ClimateAnalysisPanel = () => (
    <div className="analysis-panel">
      <h3>🌡️ Climate Risk Analysis</h3>
      <div className="analysis-controls">
        <div className="input-group">
          <label>Sea Level Rise (cm)</label>
          <input type="range" min="0" max="100" defaultValue="30" className="slider" />
          <span>30 cm</span>
        </div>
        <div className="input-group">
          <label>Storm Intensity</label>
          <select className="select-input">
            <option>100-year storm</option>
            <option>500-year storm</option>
            <option>1000-year storm</option>
          </select>
        </div>
        <button 
          className={`analysis-btn ${analysisRunning ? 'running' : ''}`}
          onClick={() => setAnalysisRunning(!analysisRunning)}
        >
          {analysisRunning ? '⏳ Analyzing...' : '🔍 Run Analysis'}
        </button>
      </div>
      
      {analysisRunning && (
        <div className="analysis-results">
          <h4>Flood Risk Assessment</h4>
          <div className="risk-grid">
            {floodRiskData.map((zone, index) => (
              <div key={index} className="risk-card" style={{borderLeft: `4px solid ${zone.color}`}}>
                <div className="risk-title">{zone.zone}</div>
                <div className="risk-level" style={{color: zone.color}}>{zone.risk} Risk</div>
                <div className="risk-population">{zone.population.toLocaleString()} people affected</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // 3. Green Infrastructure Designer
  const GreenInfrastructureDesigner = () => (
    <div className="green-designer">
      <h3>🌱 Green Infrastructure Designer</h3>
      <div className="designer-tabs">
        <button className="tab-btn active">Tree Canopy</button>
        <button className="tab-btn">Bioswales</button>
        <button className="tab-btn">Green Corridors</button>
      </div>
      
      <div className="tree-canopy-section">
        <h4>Tree Canopy Optimization</h4>
        <div className="canopy-grid">
          {treeCanopyData.map((area, index) => (
            <div key={index} className="canopy-card">
              <h5>{area.neighborhood}</h5>
              <div className="canopy-stats">
                <div className="stat">
                  <span className="stat-label">Current</span>
                  <span className="stat-value">{area.current}%</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Target</span>
                  <span className="stat-value target">{area.target}%</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Trees Needed</span>
                  <span className="stat-value potential">{area.potential}</span>
                </div>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{width: `${(area.current / area.target) * 100}%`}}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // 4. Data Upload and Management
  const DataManager = () => (
    <div className="data-manager">
      <h3>📊 Spatial Data Manager</h3>
      <div className="upload-section">
        <div className="upload-area">
          <div className="upload-icon">📁</div>
          <p>Drop GIS files here or click to upload</p>
          <p className="upload-formats">Supports: .shp, .geojson, .tiff, .gpkg</p>
          <button className="upload-btn">Choose Files</button>
        </div>
      </div>
      
      <div className="data-layers">
        <h4>Active Data Layers</h4>
        <div className="layer-list">
          <div className="layer-item">
            <input type="checkbox" defaultChecked />
            <span className="layer-name">🏢 Buildings (2024)</span>
            <span className="layer-type">Vector</span>
            <button className="layer-action">⚙️</button>
          </div>
          <div className="layer-item">
            <input type="checkbox" defaultChecked />
            <span className="layer-name">🌊 Flood Zones</span>
            <span className="layer-type">Raster</span>
            <button className="layer-action">⚙️</button>
          </div>
          <div className="layer-item">
            <input type="checkbox" />
            <span className="layer-name">🌳 Tree Inventory</span>
            <span className="layer-type">Point</span>
            <button className="layer-action">⚙️</button>
          </div>
        </div>
      </div>
    </div>
  );

  // 5. Report Generator
  const ReportGenerator = () => (
    <div className="report-generator">
      <h3>📋 Sustainability Report</h3>
      <div className="report-options">
        <div className="report-section">
          <h4>Include in Report:</h4>
          <label><input type="checkbox" defaultChecked /> Climate Risk Assessment</label>
          <label><input type="checkbox" defaultChecked /> Green Infrastructure Plan</label>
          <label><input type="checkbox" /> Economic Impact Analysis</label>
          <label><input type="checkbox" /> Community Engagement Results</label>
        </div>
        
        <div className="report-format">
          <h4>Export Format:</h4>
          <button className="format-btn">📄 PDF Report</button>
          <button className="format-btn">📊 Excel Data</button>
          <button className="format-btn">🗺️ Map Package</button>
        </div>
      </div>
      
      <div className="report-preview">
        <h4>Report Preview</h4>
        <div className="preview-content">
          <div className="preview-page">
            <h5>Climate Resilience Plan</h5>
            <div className="preview-chart"></div>
            <p>Analysis shows 23% improvement in flood resilience...</p>
          </div>
        </div>
        <button className="generate-btn">🚀 Generate Report</button>
      </div>
    </div>
  );

  const components = {
    map: <InteractiveMap />,
    climate: <ClimateAnalysisPanel />,
    green: <GreenInfrastructureDesigner />,
    data: <DataManager />,
    report: <ReportGenerator />
  };

  return (
    <div className="components-showcase">
      <h1>🏗️ Urban Planning Components You'll Build</h1>
      
      <div className="component-tabs">
        <button 
          className={`tab ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => setActiveTab('map')}
        >
          🗺️ Interactive Maps
        </button>
        <button 
          className={`tab ${activeTab === 'climate' ? 'active' : ''}`}
          onClick={() => setActiveTab('climate')}
        >
          🌡️ Climate Analysis
        </button>
        <button 
          className={`tab ${activeTab === 'green' ? 'active' : ''}`}
          onClick={() => setActiveTab('green')}
        >
          🌱 Green Design
        </button>
        <button 
          className={`tab ${activeTab === 'data' ? 'active' : ''}`}
          onClick={() => setActiveTab('data')}
        >
          📊 Data Management
        </button>
        <button 
          className={`tab ${activeTab === 'report' ? 'active' : ''}`}
          onClick={() => setActiveTab('report')}
        >
          📋 Reports
        </button>
      </div>

      <div className="component-display">
        {components[activeTab]}
      </div>

      <style jsx>{`
        .components-showcase {
          padding: 2rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          color: white;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .component-tabs {
          display: flex;
          gap: 1rem;
          margin: 2rem 0;
          overflow-x: auto;
        }

        .tab {
          padding: 0.75rem 1.5rem;
          background: rgba(255,255,255,0.1);
          border: none;
          border-radius: 25px;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
          white-space: nowrap;
        }

        .tab.active, .tab:hover {
          background: rgba(255,255,255,0.3);
          transform: translateY(-2px);
        }

        .component-display {
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 2rem;
          border: 1px solid rgba(255,255,255,0.2);
        }

        /* Map Component Styles */
        .map-container h3 {
          margin-bottom: 1rem;
        }

        .map-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .map-controls {
          display: flex;
          gap: 0.5rem;
        }

        .map-btn {
          padding: 0.5rem 1rem;
          background: rgba(255,255,255,0.2);
          border: none;
          border-radius: 15px;
          color: white;
          cursor: pointer;
        }

        .map-btn.active {
          background: rgba(255,255,255,0.4);
        }

        .map-display {
          position: relative;
          background: rgba(0,0,0,0.3);
          border-radius: 15px;
          overflow: hidden;
        }

        .map-placeholder {
          height: 300px;
          position: relative;
        }

        .map-grid {
          display: grid;
          grid-template-columns: repeat(10, 1fr);
          grid-template-rows: repeat(6, 1fr);
          height: 100%;
        }

        .grid-cell {
          border: 1px solid rgba(255,255,255,0.1);
        }

        .grid-cell.water { background: #3b82f6; }
        .grid-cell.green { background: #22c55e; }
        .grid-cell.urban { background: #6b7280; }

        .map-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
        }

        .map-marker {
          position: absolute;
          font-size: 1.5rem;
          animation: pulse 2s infinite;
        }

        .map-legend {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          background: rgba(0,0,0,0.5);
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
        }

        .legend-color {
          width: 16px;
          height: 16px;
          border-radius: 3px;
        }

        .legend-color.water { background: #3b82f6; }
        .legend-color.green { background: #22c55e; }
        .legend-color.urban { background: #6b7280; }

        /* Analysis Panel Styles */
        .analysis-panel h3 {
          margin-bottom: 1.5rem;
        }

        .analysis-controls {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .input-group label {
          font-weight: 600;
          font-size: 0.9rem;
        }

        .slider {
          width: 100%;
          height: 8px;
          border-radius: 5px;
          background: rgba(255,255,255,0.3);
          outline: none;
        }

        .select-input {
          padding: 0.5rem;
          border-radius: 8px;
          border: none;
          background: rgba(255,255,255,0.2);
          color: white;
        }

        .analysis-btn {
          grid-column: span 2;
          padding: 1rem;
          background: #22c55e;
          border: none;
          border-radius: 12px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .analysis-btn.running {
          background: #f59e0b;
          animation: pulse 1s infinite;
        }

        .risk-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .risk-card {
          background: rgba(255,255,255,0.1);
          padding: 1rem;
          border-radius: 10px;
          border-left: 4px solid;
        }

        .risk-title {
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .risk-level {
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .risk-population {
          font-size: 0.9rem;
          opacity: 0.8;
        }

        /* Green Infrastructure Styles */
        .designer-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .tab-btn {
          padding: 0.5rem 1rem;
          background: rgba(255,255,255,0.2);
          border: none;
          border-radius: 20px;
          color: white;
          cursor: pointer;
        }

        .tab-btn.active {
          background: rgba(255,255,255,0.4);
        }

        .canopy-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }

        .canopy-card {
          background: rgba(255,255,255,0.1);
          padding: 1.5rem;
          border-radius: 12px;
        }

        .canopy-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin: 1rem 0;
        }

        .stat {
          text-align: center;
        }

        .stat-label {
          display: block;
          font-size: 0.8rem;
          opacity: 0.8;
        }

        .stat-value {
          display: block;
          font-size: 1.5rem;
          font-weight: 700;
          margin-top: 0.25rem;
        }

        .stat-value.target { color: #f59e0b; }
        .stat-value.potential { color: #22c55e; }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: rgba(255,255,255,0.2);
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: #22c55e;
          transition: width 0.5s ease;
        }

        /* Data Manager Styles */
        .upload-area {
          text-align: center;
          padding: 3rem;
          border: 2px dashed rgba(255,255,255,0.3);
          border-radius: 15px;
          margin-bottom: 2rem;
        }

        .upload-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .upload-formats {
          font-size: 0.9rem;
          opacity: 0.7;
          margin: 0.5rem 0;
        }

        .upload-btn {
          padding: 0.75rem 2rem;
          background: #3b82f6;
          border: none;
          border-radius: 25px;
          color: white;
          cursor: pointer;
          margin-top: 1rem;
        }

        .layer-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .layer-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
        }

        .layer-name {
          flex: 1;
        }

        .layer-type {
          font-size: 0.8rem;
          padding: 0.25rem 0.75rem;
          background: rgba(255,255,255,0.2);
          border-radius: 12px;
        }

        .layer-action {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          font-size: 1.2rem;
        }

        /* Report Generator Styles */
        .report-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .report-section label {
          display: block;
          margin: 0.5rem 0;
          cursor: pointer;
        }

        .report-format {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .format-btn {
          padding: 0.75rem;
          background: rgba(255,255,255,0.2);
          border: none;
          border-radius: 10px;
          color: white;
          cursor: pointer;
        }

        .report-preview {
          background: rgba(255,255,255,0.1);
          padding: 1.5rem;
          border-radius: 12px;
        }

        .preview-content {
          background: white;
          color: black;
          padding: 1rem;
          border-radius: 8px;
          margin: 1rem 0;
        }

        .preview-chart {
          width: 100%;
          height: 60px;
          background: linear-gradient(90deg, #3b82f6, #22c55e);
          border-radius: 4px;
          margin: 0.5rem 0;
        }

        .generate-btn {
          width: 100%;
          padding: 1rem;
          background: #22c55e;
          border: none;
          border-radius: 12px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          font-size: 1.1rem;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default SampleComponents;