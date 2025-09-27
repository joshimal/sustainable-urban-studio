import React from 'react';
import {
  Activity,
  TreePine,
  Zap,
  Droplet,
  Wind,
  TrendingUp,
  TrendingDown,
  Minus,
  MapPin,
  Building2,
  Bus
} from 'lucide-react';
import HybridMapViewer from './components/HybridMapViewerFixed';

function App() {
  const metrics = [
    {
      title: "Air Quality Index",
      value: "42",
      unit: "AQI",
      change: "+2.3%",
      trend: "up" as const,
      color: "text-green-400",
      icon: Wind,
      description: "Good air quality in Nassau County"
    },
    {
      title: "Energy Usage",
      value: "1,247",
      unit: "kWh",
      change: "-5.2%",
      trend: "down" as const,
      color: "text-blue-400",
      icon: Zap,
      description: "Renewable energy adoption increasing"
    },
    {
      title: "Water Quality",
      value: "94.2",
      unit: "%",
      change: "+1.8%",
      trend: "up" as const,
      color: "text-cyan-400",
      icon: Droplet,
      description: "Water treatment efficiency"
    },
    {
      title: "Green Coverage",
      value: "67.8",
      unit: "%",
      change: "0%",
      trend: "stable" as const,
      color: "text-emerald-400",
      icon: TreePine,
      description: "Forest and park areas"
    }
  ];

  const developments = [
    {
      name: "Solar Farm Initiative",
      location: "Hempstead Plains",
      status: "In Progress",
      progress: 65,
      type: "Energy",
      icon: Zap,
      color: "bg-yellow-500"
    },
    {
      name: "Wetland Restoration",
      location: "South Shore",
      status: "Planning",
      progress: 25,
      type: "Environmental",
      icon: Droplet,
      color: "bg-blue-500"
    },
    {
      name: "Transit Hub Expansion",
      location: "Garden City",
      status: "Active",
      progress: 80,
      type: "Transportation",
      icon: Bus,
      color: "bg-green-500"
    },
    {
      name: "Green Building Standards",
      location: "County-wide",
      status: "Implementation",
      progress: 45,
      type: "Development",
      icon: Building2,
      color: "bg-purple-500"
    }
  ];

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-3 h-3" />;
      case "down":
        return <TrendingDown className="w-3 h-3" />;
      default:
        return <Minus className="w-3 h-3" />;
    }
  };

  const getTrendColor = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return "text-green-400";
      case "down":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      <div className="h-screen flex p-4 gap-4">

        {/* Main Map Area (70%) */}
        <div className="flex-[7] bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden">
          <div className="p-6 h-full flex flex-col">
            <HybridMapViewer center={[-73.5143, 40.7259]} zoom={10} />
          </div>
        </div>

        {/* Analytics Sidebar (30%) */}
        <div className="flex-[3] flex flex-col gap-4 overflow-y-auto">

          {/* Header */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                  Nassau County
                </h1>
                <p className="text-slate-400 text-sm mt-1">Sustainable Urban Planning Dashboard</p>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-400 animate-pulse" />
                <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-1 rounded text-sm">
                  Live
                </span>
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            {metrics.map((metric, index) => {
              const Icon = metric.icon;
              return (
                <div key={index} className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <Icon className={`w-5 h-5 ${metric.color}`} />
                    <div className={`flex items-center gap-1 text-xs ${getTrendColor(metric.trend)}`}>
                      {getTrendIcon(metric.trend)}
                      <span>{metric.change}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-white">{metric.value}</span>
                      <span className="text-sm text-slate-400">{metric.unit}</span>
                    </div>

                    <h4 className="text-sm font-medium text-slate-200">{metric.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{metric.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Developments */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg flex-1">
            <div className="p-4 border-b border-slate-800">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                Active Developments
              </h2>
            </div>

            <div className="p-4 space-y-4">
              {developments.map((dev, index) => {
                const Icon = dev.icon;
                return (
                  <div key={index} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${dev.color} bg-opacity-20`}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium text-white text-sm">{dev.name}</h4>
                          <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                            <MapPin className="w-3 h-3" />
                            <span>{dev.location}</span>
                          </div>
                        </div>
                      </div>

                      <span className={`text-xs px-2 py-1 rounded border ${
                        dev.status === "Active" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                        dev.status === "In Progress" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                        dev.status === "Planning" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                        "bg-purple-500/10 text-purple-400 border-purple-500/20"
                      }`}>
                        {dev.status}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Progress</span>
                        <span className="text-white font-medium">{dev.progress}%</span>
                      </div>

                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${dev.color}`}
                          style={{ width: `${dev.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-2">
              <button className="text-xs h-8 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded transition-colors">
                Generate Report
              </button>
              <button className="text-xs h-8 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded transition-colors">
                Export Data
              </button>
              <button className="text-xs h-8 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded transition-colors col-span-2">
                Schedule Assessment
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;