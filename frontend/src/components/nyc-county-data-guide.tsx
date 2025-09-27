import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { ExternalLink, Download, Database, MapPin } from "lucide-react"

export function NYCCountyDataGuide() {
  const dataSources = [
    {
      name: "NYC Open Data - Borough Boundaries",
      description: "Official NYC borough/county boundaries in GeoJSON format",
      url: "https://data.cityofnewyork.us/City-Government/Borough-Boundaries/tqmj-j8zm",
      format: "GeoJSON, Shapefile",
      coverage: "5 NYC Boroughs",
      free: true,
    },
    {
      name: "NYS GIS Clearinghouse - Counties",
      description: "New York State county boundaries including Nassau County",
      url: "https://gis.ny.gov/civil-boundaries",
      format: "GeoJSON, Shapefile",
      coverage: "All NY Counties",
      free: true,
    },
    {
      name: "US Census Bureau - TIGER/Line",
      description: "Federal county boundary data for all US counties",
      url: "https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html",
      format: "Shapefile, GeoJSON",
      coverage: "All US Counties",
      free: true,
    },
    {
      name: "Mapbox Boundaries",
      description: "Global administrative boundaries with licensing",
      url: "https://docs.mapbox.com/data/boundaries/",
      format: "Vector Tiles, GeoJSON",
      coverage: "Global",
      free: false,
    },
  ]

  const apiEndpoints = [
    {
      name: "NYC Planning - BYTES of the BIG APPLE",
      endpoint: "https://www1.nyc.gov/site/planning/data-maps/open-data.page",
      description: "Comprehensive NYC geographic data",
    },
    {
      name: "NYS GIS REST Services",
      endpoint: "https://gisservices.its.ny.gov/arcgis/rest/services/",
      description: "Live GIS services for NY State data",
    },
  ]

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">NYC & Nassau County Data Sources</h2>
        <p className="text-muted-foreground">
          Complete guide to accessing boundary data for New York City counties and Nassau County
        </p>
      </div>

      {/* Data Sources */}
      <div className="grid gap-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Database className="h-5 w-5" />
          Boundary Data Sources
        </h3>

        {dataSources.map((source, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{source.name}</CardTitle>
                  <CardDescription className="mt-1">{source.description}</CardDescription>
                </div>
                <div className="flex gap-2">
                  {source.free ? <Badge variant="secondary">Free</Badge> : <Badge variant="outline">Licensed</Badge>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                <div>
                  <span className="font-medium">Format:</span> {source.format}
                </div>
                <div>
                  <span className="font-medium">Coverage:</span> {source.coverage}
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href={source.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Access Data
                </a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* API Endpoints */}
      <div className="grid gap-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Live API Endpoints
        </h3>

        {apiEndpoints.map((api, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium">{api.name}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{api.description}</p>
                  <code className="text-xs bg-muted px-2 py-1 rounded mt-2 inline-block">{api.endpoint}</code>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={api.endpoint} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Implementation Example */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Quick Implementation
          </CardTitle>
          <CardDescription>Example code to load NYC county boundaries in your Mapbox map</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
            {`// Load NYC borough boundaries
const response = await fetch(
  'https://data.cityofnewyork.us/resource/tqmj-j8zm.geojson'
)
const nycBoroughs = await response.json()

map.addSource('nyc-boroughs', {
  type: 'geojson',
  data: nycBoroughs
})

map.addLayer({
  id: 'nyc-boroughs-fill',
  type: 'fill',
  source: 'nyc-boroughs',
  paint: {
    'fill-color': '#3b82f6',
    'fill-opacity': 0.3
  }
})`}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
