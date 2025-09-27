import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
// import { Progress } from './ui/progress';
import { 
  Home, 
  FileText, 
  BarChart3, 
  Database, 
  Bell, 
  MapPin, 
  Calendar, 
  TrendingUp, 
  Assessment, 
  User, 
  Monitor, 
  Settings,
  Plus,
  Download,
  Clock
} from 'lucide-react';
import ShadcnMapViewer from './components/ShadcnMapViewer';

function App() {
  const [selectedNav, setSelectedNav] = useState('Analytics');

  return (
    <div className="bg-slate-50 h-screen overflow-hidden">
      {/* Top Navigation */}
      <div className="bg-white px-6 py-4 flex items-center justify-between shadow-sm border-b">
        {/* Left - Logo */}
        <div className="flex items-center gap-2">
          <MapPin className="w-7 h-7 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-900">UrbanSync</h1>
        </div>

        {/* Center - Navigation */}
        <div className="flex gap-1">
          {[
            { icon: Home, label: 'Home' },
            { icon: FileText, label: 'Documents' },
            { icon: BarChart3, label: 'Analytics' },
            { icon: Database, label: 'Database' }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.label}
                variant={selectedNav === item.label ? 'default' : 'ghost'}
                onClick={() => setSelectedNav(item.label)}
                className={cn(
                  "rounded-lg px-4 py-2",
                  selectedNav === item.label
                    ? "bg-slate-900 text-white hover:bg-slate-800"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                )}
              >
                <Icon className="w-4 h-4 mr-2" />
                {item.label}
              </Button>
            );
          })}
        </div>

        {/* Right - User */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm">
            <Bell className="w-5 h-5" />
          </Button>
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
            JS
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex gap-4 p-4 h-[calc(100vh-80px)] overflow-hidden">
        {/* Left - Main Map Area (70% width) */}
        <Card className="flex-1 bg-slate-900 border-slate-700">
          <CardContent className="p-6 h-full">
            <ShadcnMapViewer center={[-73.5143, 40.7259]} zoom={10} />
          </CardContent>
        </Card>

        {/* Right - Analytics Panel (30% width) */}
        <div className="w-80 flex flex-col gap-4 h-full overflow-auto">
          {/* Analytics Header */}
          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg text-white">Sustainability Analytics</CardTitle>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-400">Live Data</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-green-500/10 border-green-500/30">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-green-400">Air Quality</span>
                      <TrendingUp className="w-3 h-3 text-green-400" />
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">42 AQI</div>
                    <div className="text-xs text-slate-300">Good air quality</div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs text-green-400">+2.3%</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-red-500/10 border-red-500/30">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-red-400">Energy Usage</span>
                      <TrendingUp className="w-3 h-3 text-red-400" />
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">1,247 kWh</div>
                    <div className="text-xs text-slate-300">Renewable adoption ↑</div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs text-red-400">-5.2%</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-blue-500/10 border-blue-500/30">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-400">Water Quality</span>
                      <TrendingUp className="w-3 h-3 text-blue-400" />
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">94.2%</div>
                    <div className="text-xs text-slate-300">Treatment efficiency</div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs text-blue-400">+1.8%</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-green-500/10 border-green-500/30">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-green-400">Green Coverage</span>
                      <TrendingUp className="w-3 h-3 text-green-400" />
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">67.8%</div>
                    <div className="text-xs text-slate-300">Parks & forests</div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs text-green-400">-0%</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Active Projects */}
          <Card className="bg-white border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Active Projects</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: 'Solar Farm Initiative', location: 'Hempstead Plains', cost: '$2.4M', status: 'In Progress', progress: 65, color: 'bg-green-500' },
                { name: 'Wetland Restoration', location: 'South Shore', cost: '$1.8M', status: 'Planning', progress: 25, color: 'bg-yellow-500' },
                { name: 'Transit Hub Expansion', location: 'Garden City', cost: '$5.2M', status: 'Active', progress: 80, color: 'bg-blue-500' },
                { name: 'Green Building Program', location: 'County-wide', cost: '$3.1M', status: 'Implementation', progress: 45, color: 'bg-purple-500' }
              ].map((project, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-sm">{project.name}</h4>
                      <p className="text-xs text-slate-500">{project.location}</p>
                      <p className="text-xs text-slate-600">{project.cost}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {project.status}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Progress</span>
                      <span>{project.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${project.color}`}
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-white border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="w-4 h-4 mr-2" />
                Generate Monthly Report
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Download className="w-4 h-4 mr-2" />
                Export GIS Data
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Clock className="w-4 h-4 mr-2" />
                Schedule Site Assessment
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Helper function for conditional classes
function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export default App;