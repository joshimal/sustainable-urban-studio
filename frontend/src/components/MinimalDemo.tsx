import React, { useState } from 'react';
import EnhancedLeafletViewer from './EnhancedLeafletViewer';
import MinimalLeafletViewer from './MinimalLeafletViewer';
import UltraMinimalViewer from './UltraMinimalViewer';

const MinimalDemo = () => {
  const [activeView, setActiveView] = useState<'enhanced' | 'minimal' | 'ultra'>('minimal');

  const demos = [
    {
      key: 'enhanced',
      title: 'Enhanced Design',
      description: 'Full-featured with dark theme, controls, popups, export',
      component: <EnhancedLeafletViewer center={[-73.5143, 40.7259]} zoom={11} />
    },
    {
      key: 'minimal',
      title: 'Minimal Design',
      description: 'Clean white background, simple controls, essential features',
      component: <MinimalLeafletViewer center={[-73.5143, 40.7259]} zoom={11} />
    },
    {
      key: 'ultra',
      title: 'Ultra-Minimal',
      description: 'Just the map - no controls, no UI, pure functionality',
      component: <UltraMinimalViewer center={[-73.5143, 40.7259]} zoom={11} />
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Leaflet Design Spectrum
          </h1>
          <p className="text-gray-600">From feature-rich to ultra-minimal</p>
        </div>

        {/* Design Level Selector */}
        <div className="flex justify-center gap-4 mb-8">
          {demos.map(({ key, title, description }) => (
            <button
              key={key}
              onClick={() => setActiveView(key as any)}
              className={`p-4 rounded-lg border-2 transition-all max-w-xs ${
                activeView === key
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <h3 className={`font-semibold mb-2 ${
                activeView === key ? 'text-blue-900' : 'text-gray-900'
              }`}>
                {title}
              </h3>
              <p className={`text-sm ${
                activeView === key ? 'text-blue-700' : 'text-gray-600'
              }`}>
                {description}
              </p>
            </button>
          ))}
        </div>

        {/* Map Display */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="h-[600px]">
            {demos.find(d => d.key === activeView)?.component}
          </div>

          {/* Info Bar */}
          <div className="p-4 bg-gray-50 border-t">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-semibold text-gray-900">
                  Current: {demos.find(d => d.key === activeView)?.title}
                </h4>
                <p className="text-sm text-gray-600">
                  {demos.find(d => d.key === activeView)?.description}
                </p>
              </div>

              <div className="text-right">
                <div className="text-sm text-gray-500">
                  Map Engine: <span className="font-medium text-green-600">Leaflet.js</span>
                </div>
                <div className="text-sm text-gray-500">
                  Tiles: <span className="font-medium">OpenStreetMap</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Comparison */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4 text-center">Enhanced Features</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>✅ Dark theme with gradients</li>
              <li>✅ Interactive layer controls</li>
              <li>✅ Multiple base maps</li>
              <li>✅ Custom styled markers</li>
              <li>✅ Hover effects & popups</li>
              <li>✅ Export functionality</li>
              <li>✅ Loading animations</li>
              <li>✅ Professional styling</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4 text-center">Minimal Features</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>✅ Clean white background</li>
              <li>✅ Simple layer toggle</li>
              <li>✅ Basic zoom controls</li>
              <li>✅ Essential GIS data</li>
              <li>✅ Subtle borders/shadows</li>
              <li>✅ Compact info display</li>
              <li>❌ No themes/gradients</li>
              <li>❌ No export features</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4 text-center">Ultra-Minimal</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>✅ Pure map display</li>
              <li>✅ Zero UI elements</li>
              <li>✅ Maximum map space</li>
              <li>✅ Lightning fast load</li>
              <li>✅ Minimal DOM nodes</li>
              <li>✅ Embedded-friendly</li>
              <li>❌ No controls</li>
              <li>❌ No data layers</li>
            </ul>
          </div>
        </div>

        {/* Code Complexity Comparison */}
        <div className="mt-8 bg-white rounded-lg p-6 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4 text-center">Code Complexity</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-red-500 mb-2">~450 Lines</div>
              <div className="text-sm text-gray-600">Enhanced Design</div>
              <div className="text-xs text-gray-500 mt-1">Multiple features, styling, interactions</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-500 mb-2">~120 Lines</div>
              <div className="text-sm text-gray-600">Minimal Design</div>
              <div className="text-xs text-gray-500 mt-1">Essential features only</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-500 mb-2">~25 Lines</div>
              <div className="text-sm text-gray-600">Ultra-Minimal</div>
              <div className="text-xs text-gray-500 mt-1">Just map initialization</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MinimalDemo;