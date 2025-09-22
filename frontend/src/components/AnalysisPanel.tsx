import React, { useState } from 'react';

interface AnalysisResult {
  success: boolean;
  analysis_type?: string;
  results?: any[];
  error?: string;
}

const AnalysisPanel: React.FC = () => {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [targetCoverage, setTargetCoverage] = useState(30);

  const runTreeCanopyAnalysis = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8081/analyze/tree-canopy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_coverage: targetCoverage
        })
      });
      
      const result = await response.json();
      setAnalysisResult(result);
    } catch (error) {
      setAnalysisResult({
        success: false,
        error: 'Failed to connect to QGIS server'
      });
    }
    setLoading(false);
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
        🌳 QGIS Tree Canopy Analysis
      </h3>
      
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ color: 'white', display: 'block', marginBottom: '0.5rem' }}>
          Target Tree Coverage (%):
        </label>
        <input
          type="number"
          value={targetCoverage}
          onChange={(e) => setTargetCoverage(Number(e.target.value))}
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
        onClick={runTreeCanopyAnalysis}
        disabled={loading}
        style={{
          padding: '0.75rem 1.5rem',
          background: loading ? '#6b7280' : '#22c55e',
          border: 'none',
          borderRadius: '12px',
          color: 'white',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontWeight: '600'
        }}
      >
        {loading ? '🔄 Analyzing...' : '🔍 Run QGIS Analysis'}
      </button>

      {analysisResult && (
        <div style={{
          marginTop: '1.5rem',
          background: 'rgba(255,255,255,0.1)',
          padding: '1rem',
          borderRadius: '12px'
        }}>
          {analysisResult.success ? (
            <div>
              <h4 style={{ color: '#22c55e', marginBottom: '1rem' }}>
                ✅ Analysis Complete
              </h4>
              {analysisResult.results?.map((result: any, index: number) => (
                <div key={index} style={{
                  background: 'rgba(255,255,255,0.1)',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  marginBottom: '0.5rem',
                  color: 'white'
                }}>
                  <strong>{result.neighborhood}</strong><br/>
                  Current: {result.current_coverage}% | 
                  Target: {result.target_coverage}% | 
                  Trees needed: {result.trees_needed.toLocaleString()}
                </div>
              ))}
            </div>
          ) : (
            <div>
              <h4 style={{ color: '#ef4444', marginBottom: '0.5rem' }}>
                ❌ Analysis Failed
              </h4>
              <p style={{ color: 'white' }}>{analysisResult.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalysisPanel;