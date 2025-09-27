import React, { useState } from 'react';
import {
  MapPin,
  BarChart3,
  Map as MapIcon,
  Home,
  FileText,
  Database,
  Bell,
  User,
  Calendar,
  TrendingUp,
  Activity,
  Layers,
  Settings
} from 'lucide-react';
import BioSyncMapViewer from './components/BioSyncMapViewer';

function App() {
  const [activeTab, setActiveTab] = useState('analytics');

  const navigationItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'database', label: 'Database', icon: Database },
  ];

  const riskMetrics = [
    {
      title: 'Environmental Risk',
      subtitle: 'Air quality and pollution levels monitored',
      value: '18%',
      status: 'Normal',
      color: 'text-green-400',
      bgColor: 'bg-green-500/20'
    },
    {
      title: 'Development Pressure',
      subtitle: 'Urban sprawl and density indicators',
      value: '34%',
      status: 'Elevated',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20'
    }
  ];

  const urbanMetrics = [
    {
      title: 'Urban Activity Index',
      value: '87',
      max: '100',
      trend: 'Normal',
      chartData: Array.from({length: 12}, (_, i) => 70 + Math.random() * 30),
      color: 'text-blue-400'
    },
    {
      title: 'Transit Connectivity Index',
      value: '0.92',
      trend: 'Normal',
      chartData: Array.from({length: 20}, (_, i) => 0.8 + Math.random() * 0.3),
      color: 'text-emerald-400'
    }
  ];

  const volumeMetrics = [
    {
      title: 'Green Space Volume',
      value: '2.4',
      unit: 'km²',
      average: '1.8 km²',
      status: 'Above Average',
      progress: 75,
      color: 'bg-green-500'
    },
    {
      title: 'Built Environment',
      value: '485',
      unit: 'km²',
      average: '520 km²',
      status: 'Below Average',
      progress: 60,
      color: 'bg-blue-500'
    }
  ];

  const nextSteps = [
    {
      category: 'Planning',
      date: 'Nov - Dec',
      tasks: [
        'Update zoning maps in 3-6 months',
        'Environmental impact assessment',
        'Review transit accessibility data'
      ]
    },
    {
      category: 'Assessment',
      date: 'Jan',
      tasks: [
        'Conduct air quality monitoring',
        'Review development permits',
        'Site inspection recommended'
      ]
    },
    {
      category: 'Implementation',
      date: 'Ongoing',
      tasks: [
        'Deploy smart city sensors',
        'Monitor real-time traffic patterns',
        'Track sustainability metrics'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header Navigation */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">UrbanSync</span>
              </div>
            </div>

            <nav className="flex items-center gap-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === item.id
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="flex items-center gap-3">
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                <Bell className="w-5 h-5" />
              </button>
              <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-12 gap-6">

          {/* Main Map Area - Dark Theme Like Brain Mapping */}
          <div className="col-span-8">
            <div className="bg-gray-900 rounded-2xl p-6 h-[500px]">
              <BioSyncMapViewer />
            </div>
          </div>

          {/* Right Sidebar - Analytics */}
          <div className="col-span-4">
            <div className="bg-gray-900 rounded-2xl p-6 text-white">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">AI Analytics Insights</h2>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <span>26 Mar - 24 Apr, 2025</span>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                {riskMetrics.map((metric, index) => (
                  <div key={index} className="bg-gray-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-white">{metric.title}</h3>
                      <span className={`text-sm px-2 py-1 rounded-full ${metric.bgColor} ${metric.color}`}>
                        {metric.status}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm mb-3">{metric.subtitle}</p>
                    <div className="text-2xl font-bold text-white">{metric.value}</div>
                  </div>
                ))}
              </div>

              {/* Circular Progress */}
              <div className="text-center mb-6">
                <div className="relative inline-flex items-center justify-center w-32 h-32">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" stroke="rgba(75, 85, 99, 0.3)" strokeWidth="8" fill="none" />
                    <circle
                      cx="60" cy="60" r="50"
                      stroke="url(#gradient)"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${87 * 3.14159} ${100 * 3.14159}`}
                      className="transition-all duration-1000"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#ef4444" />
                        <stop offset="50%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#22c55e" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute text-center">
                    <div className="text-3xl font-bold text-white">87</div>
                    <div className="text-sm text-gray-400">Sustainability Score</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section - Metrics */}
          <div className="col-span-8 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              {urbanMetrics.map((metric, index) => (
                <div key={index} className="bg-white rounded-2xl p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">{metric.title}</h3>
                    <span className="text-sm text-green-600 font-medium">✓ {metric.trend}</span>
                  </div>

                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-3xl font-bold text-gray-900">{metric.value}</span>
                    {metric.max && <span className="text-gray-500">/{metric.max}</span>}
                  </div>

                  <div className="h-16 mb-4">
                    <svg className="w-full h-full" viewBox="0 0 300 60">
                      <polyline
                        points={metric.chartData.map((value, i) => `${(i / (metric.chartData.length - 1)) * 300},${60 - (value / 100) * 60}`).join(' ')}
                        fill="none"
                        stroke={index === 0 ? "#3b82f6" : "#10b981"}
                        strokeWidth="2"
                        className="drop-shadow-sm"
                      />
                      {metric.chartData.map((value, i) => (
                        <circle
                          key={i}
                          cx={(i / (metric.chartData.length - 1)) * 300}
                          cy={60 - (value / 100) * 60}
                          r="2"
                          fill={index === 0 ? "#3b82f6" : "#10b981"}
                        />
                      ))}
                    </svg>
                  </div>

                  {index === 1 && (
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500 flex justify-between">
                        <span>Left District</span>
                        <span>Right District</span>
                      </div>
                      <div className="grid grid-cols-20 gap-px h-4">
                        {Array.from({length: 20}, (_, i) => (
                          <div
                            key={i}
                            className={`rounded-sm ${i < 15 ? 'bg-orange-400' : 'bg-orange-200'}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-6">
              {volumeMetrics.map((metric, index) => (
                <div key={index} className="bg-white rounded-2xl p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{metric.title}</h3>
                    <span className="text-sm text-green-600 font-medium">✓ {metric.status}</span>
                  </div>

                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-3xl font-bold text-gray-900">{metric.value}</span>
                    <span className="text-gray-500">{metric.unit}</span>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Average</span>
                      <span>{metric.average}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${metric.color} transition-all duration-1000`}
                        style={{ width: `${metric.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-gray-600">Your Result</div>
                    <div className={`text-lg font-bold ${index === 0 ? 'text-green-600' : 'text-blue-600'}`}>
                      {metric.value} {metric.unit} ▲
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Suggested Next Steps */}
          <div className="col-span-4">
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Suggested Next Steps</h3>
                <button className="text-sm text-blue-600 font-medium hover:text-blue-700">
                  Create Plan +
                </button>
              </div>

              <div className="space-y-6">
                {nextSteps.map((step, index) => (
                  <div key={index}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        {index === 0 ? <MapPin className="w-4 h-4 text-gray-600" /> :
                         index === 1 ? <Activity className="w-4 h-4 text-gray-600" /> :
                         <Settings className="w-4 h-4 text-gray-600" />}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{step.category}</div>
                        <div className="text-sm text-gray-500">{step.date}</div>
                      </div>
                    </div>
                    <ul className="space-y-2 ml-11">
                      {step.tasks.map((task, taskIndex) => (
                        <li key={taskIndex} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-gray-400 mt-1">•</span>
                          <span>{task}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;