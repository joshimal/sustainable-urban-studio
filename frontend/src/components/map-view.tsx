"use client"

import { Card } from "./ui/card"

export function MapView() {
  return (
    <div className="h-full bg-background relative overflow-hidden">
      {/* Map Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-muted to-background">
        {/* Simulated map grid lines */}
        <svg className="absolute inset-0 w-full h-full opacity-20">
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Simulated Heatmap Overlay */}
      <div className="absolute inset-0">
        {/* Main heatmap area - simulating the purple/magenta overlay from the screenshot */}
        <div className="absolute top-1/3 left-1/4 w-1/2 h-1/3 bg-gradient-radial from-purple-500/60 via-purple-600/40 to-transparent rounded-full blur-xl"></div>
        <div className="absolute top-1/2 left-1/3 w-1/3 h-1/4 bg-gradient-radial from-pink-500/50 via-purple-500/30 to-transparent rounded-full blur-lg"></div>

        {/* Scattered data points */}
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-green-400 rounded-full opacity-70"
            style={{
              left: `${Math.random() * 80 + 10}%`,
              top: `${Math.random() * 80 + 10}%`,
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}

        {/* Larger data clusters */}
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={`cluster-${i}`}
            className="absolute w-3 h-3 bg-yellow-400 rounded-full opacity-80"
            style={{
              left: `${Math.random() * 60 + 20}%`,
              top: `${Math.random() * 60 + 20}%`,
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}
      </div>

      {/* Geographic Labels */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 text-white/70 text-sm font-medium">Victoria</div>
        <div className="absolute top-1/3 right-1/4 text-white/70 text-sm font-medium">Vancouver</div>
        <div className="absolute bottom-1/3 left-1/4 text-white/70 text-sm font-medium">Seattle</div>
        <div className="absolute top-1/2 left-1/2 text-white/70 text-xs transform -translate-x-1/2 -translate-y-1/2">
          Strait of Georgia
        </div>
      </div>

      {/* Legend */}
      <Card className="absolute bottom-4 left-4 p-3 bg-card/90 backdrop-blur-sm">
        <div className="text-xs font-medium mb-2">Density Scale</div>
        <div className="flex items-center gap-2">
          <div className="w-16 h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-red-500 rounded"></div>
          <div className="text-xs text-muted-foreground">High</div>
        </div>
      </Card>
    </div>
  )
}
