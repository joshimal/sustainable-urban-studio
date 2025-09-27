import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { MapPin, Layers, Train, Building2, Droplets, Eye, EyeOff } from 'lucide-react';

function AppSimple() {
  const [gisData, setGisData] = useState({
    parcels: null,
    stations: null,
    flood_zones: null,
    loading: true,
    error: null
  });

  const [selectedLayers, setSelectedLayers] = useState({
    parcels: true,
    stations: true,
    flood_zones: true
  });

  useEffect(() => {
    const loadGISData = async () => {
      try {
        console.log('🔄 Loading GIS data...');
        
        const [parcelsRes, stationsRes, floodRes] = await Promise.all([
          fetch('http://localhost:3001/api/qgis/nassau/get-data?type=parcels'),
          fetch('http://localhost:3001/api/qgis/nassau/get-data?type=stations'),
          fetch('http://localhost:3001/api/qgis/nassau/get-data?type=flood_zones')
        ]);
        
        const parcels = await parcelsRes.json();
        const stations = await stationsRes.json();
        const flood_zones = await floodRes.json();
        
        console.log('✅ GIS data loaded successfully');
        
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
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
    };
    
    loadGISData();
  }, []);

  const toggleLayer = (layer) => {
    setSelectedLayers(prev => ({
      ...prev,
      [layer]: !prev[layer]
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Top Navigation */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">UrbanSync</h1>
              <p className="text-sm text-slate-600">Sustainable Urban Planning</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Big Map Area (75% width) */}
        <div className="flex-1 relative">
          <div className="h-full m-4 rounded-xl shadow-xl overflow-hidden bg-white">
            {gisData.loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4">⏳</div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Loading GIS Data...</h3>
                  <p className="text-slate-600">Fetching Nassau County data from the server</p>
                </div>
              </div>
            ) : gisData.error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Error Loading Data</h3>
                  <p className="text-slate-600 mb-4">{gisData.error}</p>
                  <Button onClick={() => window.location.reload()} variant="outline">
                    Retry
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative h-full bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <MapPin className="w-12 h-12 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900 mb-4">🗺️ Big Map Interface</h2>
                  <p className="text-lg text-slate-600 mb-6">Ready for Mapbox integration with live GIS data</p>
                  <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                    ✅ GIS Data Loaded Successfully!
                  </div>
                </div>
              </div>
            )}

            {/* Layer Controls */}
            <div className="absolute top-4 left-4 z-10 w-64 bg-white rounded-lg shadow-lg p-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Map Layers
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium">Parcels</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleLayer('parcels')}
                  >
                    {selectedLayers.parcels ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Train className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium">LIRR Stations</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleLayer('stations')}
                  >
                    {selectedLayers.stations ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium">Flood Zones</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleLayer('flood_zones')}
                  >
                    {selectedLayers.flood_zones ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Map Info */}
            <div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-lg p-4">
              <div className="text-center">
                <h3 className="font-semibold text-slate-900 mb-2">Nassau County</h3>
                <div className="space-y-1 text-sm text-slate-600">
                  <p>Active Layers: {Object.values(selectedLayers).filter(Boolean).length}/3</p>
                  <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                    Live Data
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Panel (25% width) */}
        <div className="w-80 bg-white border-l border-slate-200 flex flex-col">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Data Overview</h2>
            <p className="text-sm text-slate-600">Real-time Nassau County GIS data</p>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Data Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-lg p-4 text-center">
                <Building2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-slate-900">
                  {gisData.parcels?.features?.length || 0}
                </div>
                <div className="text-sm text-slate-600">Parcels</div>
              </div>
              
              <div className="bg-white border border-slate-200 rounded-lg p-4 text-center">
                <Train className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-slate-900">
                  {gisData.stations?.features?.length || 0}
                </div>
                <div className="text-sm text-slate-600">Stations</div>
              </div>
            </div>

            {/* Data Details */}
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">GIS Data Status</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Parcels:</span>
                  <span className="text-sm font-medium text-slate-900">
                    {gisData.parcels?.features?.length || 0} features
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Stations:</span>
                  <span className="text-sm font-medium text-slate-900">
                    {gisData.stations?.features?.length || 0} features
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Flood Zones:</span>
                  <span className="text-sm font-medium text-slate-900">
                    {gisData.flood_zones?.features?.length || 0} features
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AppSimple;