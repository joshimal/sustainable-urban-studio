import React, { useState } from 'react';

interface AnalysisResult {
  success: boolean;
  analysis_type?: string;
  location?: string;
  results?: any;
  error?: string;
}

const NassauAnalysis: React.FC = () => {
  const [housingResult, setHousingResult] = useState<AnalysisResult | null>(null);
  const [floodResult, setFloodResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [bufferDistance, setBufferDistance] = useState(0.5);

  const runHousingAnalysis = async () => {
    setLoading('housing');
    try {
      const response = await fetch('http://localhost:8081/nassau/analyze-housing-transit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buffer_miles: bufferDistance })
      });
      
      const result = await response.json();
      setHousingResult(result);
    } catch (error) {
      setHousingResult({ success: false, error: 'Failed to connect to analysis server' });
    }
    setLoading(null);
  };

  const runFloodAnalysis = async () => {
    setLoading('flood');
    try {
      const response = await fetch('http://localhost:8081/nassau/analyze-flood-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      setFloodResult(result);
    } catch (error) {
      setFloodResult({ success: false, error: 'Failed to connect to analysis server' });
    }
    setLoading(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.1)',
      borderRadius: '20px',
      padding: '1.5rem',
      border: '1px solid rgba(255,255,255,0.2)',
      marginTop: '2rem'
    }}>
      <h3 style={{ color: 'white', marginBottom: '1rem' }}>
        🏡 Nassau County: Housing Equity & Climate Resilience
      </h3>
      
      {/* Housing Analysis Section */}
      <div style={{ marginBottom: '2rem' }}>
        <h4 style={{ color: 'white', marginBottom: '1rem' }}>
          Multi-Family Housing Opportunities Near Transit
        </h4>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ color: 'white', display: 'block', marginBottom: '0.5rem' }}>
            Analysis Distance from LIRR Stations (miles):
          </label>
          <input
            type="number"
            step="0.1"
            min="0.1"
            max="2.0"
            value={bufferDistance}
            onChange={(e) => setBufferDistance(Number(e.target.value))}
            style={{
              padding: '0.5rem',
              borderRadius: '8px',
              border: 'none',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              width: '100px'
            }}
          />
        </div>

        <button
          onClick={runHousingAnalysis}
          disabled={loading === 'housing'}
          style={{
            padding: '0.75rem 1.5rem',
            background: loading === 'housing' ? '#6b7280' : '#3b82f6',
            border: 'none',
            borderRadius: '12px',
            color: 'white',
            cursor: loading === 'housing' ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            marginRight: '1rem'
          }}
        >
          {loading === 'housing' ? '🔄 Analyzing...' : '🏠 Analyze Housing Opportunities'}
        </button>

        {housingResult && (
          <div style={{
            marginTop: '1rem',
            background: 'rgba(255,255,255,0.1)',
            padding: '1rem',
            borderRadius: '12px'
          }}>
            {housingResult.success ? (
              <div style={{ color: 'white' }}>
                <h5 style={{ color: '#22c55e', marginBottom: '0.5rem' }}>
                  ✅ Housing Analysis Complete
                </h5>
                <p><strong>LIRR Stations Analyzed:</strong> {housingResult.results?.stations_analyzed}</p>
                <p><strong>Parcels Near Transit:</strong> {housingResult.results?.parcels_near_transit}</p>
                <p><strong>Current Single-Family Zoning:</strong> {housingResult.results?.current_single_family}</p>
                <p><strong>Multi-Family Development Potential:</strong> {housingResult.results?.multi_family_potential} parcels</p>
                
                {housingResult.results?.recommendations && housingResult.results.recommendations.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <strong>Policy Recommendations:</strong>
                    <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                      {housingResult.results.recommendations.map((rec: string, i: number) => (
                        <li key={i} style={{ marginBottom: '0.25rem' }}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <h5 style={{ color: '#ef4444', marginBottom: '0.5rem' }}>❌ Analysis Failed</h5>
                <p style={{ color: 'white' }}>{housingResult.error}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Flood Analysis Section */}
      <div>
        <h4 style={{ color: 'white', marginBottom: '1rem' }}>
          South Shore Climate Resilience
        </h4>

        <button
          onClick={runFloodAnalysis}
          disabled={loading === 'flood'}
          style={{
            padding: '0.75rem 1.5rem',
            background: loading === 'flood' ? '#6b7280' : '#ef4444',
            border: 'none',
            borderRadius: '12px',
            color: 'white',
            cursor: loading === 'flood' ? 'not-allowed' : 'pointer',
            fontWeight: '600'
          }}
        >
          {loading === 'flood' ? '🔄 Analyzing...' : '🌊 Analyze Flood Vulnerability'}
        </button>

        {floodResult && (
          <div style={{
            marginTop: '1rem',
            background: 'rgba(255,255,255,0.1)',
            padding: '1rem',
            borderRadius: '12px'
          }}>
            {floodResult.success ? (
              <div style={{ color: 'white' }}>
                <h5 style={{ color: '#22c55e', marginBottom: '0.5rem' }}>
                  ✅ Flood Risk Analysis Complete
                </h5>
                <p><strong>Properties in Flood Zones:</strong> {floodResult.results?.properties_in_flood_zones}</p>
                <p><strong>Total Value at Risk:</strong> {formatCurrency(floodResult.results?.total_value_at_risk || 0)}</p>
                <p><strong>Average Property Value:</strong> {formatCurrency(floodResult.results?.average_property_value || 0)}</p>
                
                {floodResult.results?.recommendations && floodResult.results.recommendations.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <strong>Resilience Strategies:</strong>
                    <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                      {floodResult.results.recommendations.map((rec: string, i: number) => (
                        <li key={i} style={{ marginBottom: '0.25rem' }}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <h5 style={{ color: '#ef4444', marginBottom: '0.5rem' }}>❌ Analysis Failed</h5>
                <p style={{ color: 'white' }}>{floodResult.error}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NassauAnalysis;