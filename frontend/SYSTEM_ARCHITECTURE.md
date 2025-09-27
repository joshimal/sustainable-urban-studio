# 🏗️ Sustainable Urban Studio - System Architecture Diagram

## 🌐 **High-Level System Overview**

```mermaid
graph TD
    subgraph "Client Browser"
        UI[🖥️ React Frontend<br/>Port 8082<br/>Vite Dev Server]
    end

    subgraph "API Layer"
        CLIMATE[🌍 Climate API Server<br/>Port 3002<br/>Express.js]
        GIS[🗺️ GIS API Server<br/>Port 3001<br/>QGIS Backend]
    end

    subgraph "Data Sources"
        MOCK[📊 Mock Data<br/>Climate Projections<br/>Environmental Data]
        QGIS_DATA[🗃️ QGIS Files<br/>Nassau County<br/>Parcels, Stations, Floods]
        FEMA[🌊 FEMA Data<br/>Sea Level Rise<br/>Flood Zones]
    end

    subgraph "External APIs (Future)"
        NOAA[🌡️ NOAA<br/>Climate Data]
        EPA[💨 EPA<br/>Air Quality]
        CENSUS[👥 Census<br/>Population Data]
    end

    UI -->|HTTP Requests| CLIMATE
    UI -->|HTTP Requests| GIS
    CLIMATE -->|Generates| MOCK
    GIS -->|Reads| QGIS_DATA
    GIS -->|Accesses| FEMA

    NOAA -.->|Future Integration| CLIMATE
    EPA -.->|Future Integration| CLIMATE
    CENSUS -.->|Future Integration| CLIMATE

    style UI fill:#e1f5fe
    style CLIMATE fill:#c8e6c9
    style GIS fill:#fff3e0
    style MOCK fill:#f3e5f5
```

## 🎛️ **Frontend Component Architecture**

```mermaid
graph TD
    subgraph "React Application (Port 8082)"
        APP[📱 App.tsx<br/>Main Container]

        subgraph "Map Components"
            MINIMAL[🗺️ MinimalLeafletViewer<br/>Working Map Display]
            ENHANCED[✨ EnhancedLeafletViewer<br/>Feature-Rich Version]
            ULTRA[⚡ UltraMinimalViewer<br/>Basic Map Only]
            PROF[🎛️ ProfessionalSliderViewer<br/>Advanced Interface]
        end

        subgraph "UI Components"
            SLIDERS[🎚️ Slider Controls<br/>Environmental Parameters]
            STATUS[📊 API Status Display<br/>Live Data Indicators]
            LEGEND[🏷️ Map Legend<br/>Parameter Colors]
        end

        subgraph "Data Management"
            STATE[💾 React State<br/>climateData, gisData]
            EFFECTS[⚡ useEffect Hooks<br/>API Data Fetching]
        end
    end

    APP --> MINIMAL
    APP --> SLIDERS
    APP --> STATUS
    APP --> STATE
    STATE --> EFFECTS
    EFFECTS -->|Fetch Data| SLIDERS

    style APP fill:#e3f2fd
    style MINIMAL fill:#e8f5e8
    style SLIDERS fill:#fff8e1
    style STATE fill:#fce4ec
```

## 📡 **API Data Flow Architecture**

```mermaid
sequenceDiagram
    participant Browser as 🖥️ Browser UI
    participant Frontend as 📱 React App
    participant ClimateAPI as 🌍 Climate API
    participant GISAPI as 🗺️ GIS API
    participant MockData as 📊 Mock Data
    participant QGISFiles as 🗃️ QGIS Files

    Browser->>Frontend: Load Application
    Frontend->>Frontend: Initialize State

    par Load Climate Data
        Frontend->>ClimateAPI: GET /api/climate/temperature/heatmap
        ClimateAPI->>MockData: Generate temp projections
        MockData-->>ClimateAPI: Temperature data + time series
        ClimateAPI-->>Frontend: JSON response (100 coordinates)

        Frontend->>ClimateAPI: GET /api/climate/sea-level-rise/projection
        ClimateAPI->>MockData: Generate flood risk data
        MockData-->>ClimateAPI: Sea level + affected areas
        ClimateAPI-->>Frontend: JSON response (flood zones)

        Frontend->>ClimateAPI: GET /api/environment/air-quality/index
        ClimateAPI->>MockData: Generate AQI data
        MockData-->>ClimateAPI: Air quality readings
        ClimateAPI-->>Frontend: JSON response (40 stations)
    and Load GIS Data
        Frontend->>GISAPI: GET /api/qgis/nassau/get-data?type=parcels
        GISAPI->>QGISFiles: Read parcel data
        QGISFiles-->>GISAPI: GeoJSON features
        GISAPI-->>Frontend: Property parcels

        Frontend->>GISAPI: GET /api/qgis/nassau/get-data?type=stations
        GISAPI->>QGISFiles: Read station data
        QGISFiles-->>GISAPI: GeoJSON features
        GISAPI-->>Frontend: LIRR stations
    end

    Frontend->>Frontend: Update UI with real data
    Frontend->>Browser: Render sliders with live values
```

## 🎚️ **Slider Parameter Data Mapping**

```mermaid
graph LR
    subgraph "Climate Parameters"
        TEMP[🌡️ Temperature Change<br/>API: /climate/temperature<br/>Range: -5°F to +15°F<br/>Current: 4.2°F]
        SEA[🌊 Sea Level Rise<br/>API: /climate/sea-level-rise<br/>Range: 0-10 ft<br/>Current: 2.5 ft]
        PRECIP[🌧️ Precipitation<br/>API: /climate/precipitation<br/>Range: 0-200% normal<br/>Current: 85%]
    end

    subgraph "Environmental Monitoring"
        AQI[💨 Air Quality Index<br/>API: /environment/air-quality<br/>Range: 0-300 AQI<br/>Current: 85 AQI]
        WATER[💧 Water Quality<br/>API: /environment/water-quality<br/>Range: 0-100 score<br/>Current: 78]
    end

    subgraph "Urban Development"
        POP[👥 Population Density<br/>API: /urban/density<br/>Range: 0-25K per km²<br/>Current: 8500]
        GREEN[🌳 Green Space<br/>API: /urban/green-space<br/>Range: 0-100%<br/>Current: 35%]
        DEV[🏗️ Development Intensity<br/>API: /urban/development<br/>Range: 1-10 scale<br/>Current: 6]
    end

    TEMP -->|Real-time Data| API1[Climate API Server]
    SEA -->|Real-time Data| API1
    PRECIP -->|Real-time Data| API1

    AQI -->|Real-time Data| API1
    WATER -->|Real-time Data| API1

    POP -->|Real-time Data| API1
    GREEN -->|Real-time Data| API1
    DEV -->|Real-time Data| API1

    style TEMP fill:#ffcdd2
    style SEA fill:#e1f5fe
    style AQI fill:#fff3e0
    style GREEN fill:#e8f5e8
```

## 🗂️ **File System Structure**

```
sustainable-urban-studio/
├── frontend/                              # Main application directory
│   ├── src/
│   │   ├── App.tsx                       # 📱 Main application component
│   │   ├── main.tsx                      # ⚡ React entry point
│   │   ├── globals.css                   # 🎨 Global Tailwind styles
│   │   └── components/
│   │       ├── MinimalLeafletViewer.tsx  # 🗺️ Working map component
│   │       ├── EnhancedLeafletViewer.tsx # ✨ Advanced map features
│   │       ├── UltraMinimalViewer.tsx    # ⚡ Basic map only
│   │       ├── ProfessionalSliderViewer.tsx # 🎛️ Professional interface
│   │       └── MinimalDemo.tsx           # 🔄 Design comparison demo
│   ├── climate-api-server.cjs            # 🌍 Climate API backend (Port 3002)
│   ├── package.json                      # 📦 Dependencies & scripts
│   ├── vite.config.ts                    # ⚙️ Vite configuration
│   ├── tailwind.config.js                # 🎨 Tailwind CSS config
│   ├── API_MAP.md                        # 📊 API documentation
│   └── ARCHITECTURE.md                   # 📋 Previous architecture docs
├── backend/ (External - Port 3001)       # 🗺️ GIS API server
│   ├── QGIS data files                   # 🗃️ Nassau County GIS data
│   └── FEMA flood zone data              # 🌊 Sea level rise data
```

## 🔄 **Data Processing Pipeline**

```mermaid
flowchart TD
    subgraph "Data Generation"
        COORDS[📍 Generate Coordinates<br/>Nassau County Bounds<br/>40.7259, -73.5143]
        SCENARIOS[📈 Climate Scenarios<br/>Conservative: +2.5°F<br/>Moderate: +4.2°F<br/>Aggressive: +6.8°F]
        TIMESERIES[⏱️ Time Series Generation<br/>2020-2050 projections<br/>Annual data points]
    end

    subgraph "API Processing"
        TEMP_CALC[🌡️ Temperature Calculation<br/>Base + Projection + Random<br/>Heat Island Effects]
        FLOOD_CALC[🌊 Flood Risk Calculation<br/>Elevation vs Sea Level<br/>Population Impact]
        AQI_CALC[💨 AQI Calculation<br/>PM2.5, Ozone, NO2<br/>Health Categories]
    end

    subgraph "Response Format"
        JSON[📄 JSON Response<br/>Coordinates + Values<br/>Metadata + Confidence]
        GEOJSON[🗺️ GeoJSON Features<br/>Polygon boundaries<br/>Property data]
    end

    COORDS --> TEMP_CALC
    SCENARIOS --> TEMP_CALC
    TIMESERIES --> TEMP_CALC

    COORDS --> FLOOD_CALC
    COORDS --> AQI_CALC

    TEMP_CALC --> JSON
    FLOOD_CALC --> GEOJSON
    AQI_CALC --> JSON

    JSON --> FRONTEND[📱 React Frontend]
    GEOJSON --> FRONTEND

    style COORDS fill:#e8eaf6
    style TEMP_CALC fill:#ffcdd2
    style JSON fill:#e8f5e8
```

## 🌐 **Network Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    🖥️ Client Browser                        │
│                   http://localhost:8082                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
              ┌───────▼────────┐
              │  🌐 HTTP/HTTPS  │
              │   API Calls     │
              └───────┬────────┘
                      │
        ┌─────────────▼─────────────┐
        │                          │
┌───────▼──────┐           ┌───────▼──────┐
│ 🌍 Climate API │           │ 🗺️ GIS API    │
│ Port 3002     │           │ Port 3001     │
│ Express.js    │           │ QGIS Backend  │
└───────┬──────┘           └───────┬──────┘
        │                          │
┌───────▼──────┐           ┌───────▼──────┐
│ 📊 Mock Data  │           │ 🗃️ QGIS Files │
│ Climate Sims  │           │ Nassau County │
│ Environmental │           │ GeoJSON Data  │
└──────────────┘           └──────────────┘
```

## 🎯 **Key Integration Points**

1. **Frontend ↔ Climate API**: Real-time environmental data fetching
2. **Frontend ↔ GIS API**: Geographic boundary and feature data
3. **Climate API ↔ Mock Data**: Realistic climate projections and scenarios
4. **GIS API ↔ QGIS Files**: Actual Nassau County geographic data
5. **React State ↔ UI Components**: Dynamic slider values and map updates

## 🔮 **Future Architecture Enhancements**

```mermaid
graph TD
    subgraph "Phase 2: Real Data Integration"
        NOAA_API[🌡️ NOAA Climate API<br/>Real weather data<br/>Historical trends]
        EPA_API[💨 EPA AirNow API<br/>Live air quality<br/>Sensor networks]
        CENSUS_API[👥 Census Bureau API<br/>Population demographics<br/>Urban statistics]
    end

    subgraph "Phase 3: Advanced Features"
        WEBSOCKET[⚡ WebSocket Server<br/>Real-time updates<br/>Live data streaming]
        ML_MODEL[🤖 ML Predictions<br/>Climate forecasting<br/>Pattern analysis]
        CACHE[💾 Redis Cache<br/>Performance optimization<br/>API rate limiting]
    end

    subgraph "Phase 4: Scaling"
        DOCKER[🐳 Docker Containers<br/>Microservice architecture<br/>Easy deployment]
        CLOUD[☁️ Cloud Hosting<br/>AWS/Azure deployment<br/>Global CDN]
        DB[🗄️ PostgreSQL + PostGIS<br/>Spatial database<br/>Large dataset storage]
    end

    NOAA_API --> WEBSOCKET
    EPA_API --> WEBSOCKET
    CENSUS_API --> WEBSOCKET

    WEBSOCKET --> ML_MODEL
    ML_MODEL --> CACHE

    CACHE --> DOCKER
    DOCKER --> CLOUD
    CLOUD --> DB

    style NOAA_API fill:#e3f2fd
    style WEBSOCKET fill:#e8f5e8
    style DOCKER fill:#fff3e0
```

---

## 📊 **Current System Status**

✅ **Operational Components:**
- React Frontend (Port 8082) - Professional slider interface
- Climate API Server (Port 3002) - 7 endpoints with realistic data
- GIS API Server (Port 3001) - Nassau County geographic data
- Real-time data flow between frontend and APIs
- Professional map visualization with Leaflet.js

🔄 **In Development:**
- Heat map overlay generation based on slider values
- Interactive time-series visualization
- Advanced climate scenario modeling

🎯 **Architecture Goals Achieved:**
- Modular component design for maintainability
- Separation of concerns (UI, API, Data)
- Scalable API architecture for future real data integration
- Professional data visualization interface
- Real-time environmental monitoring capabilities

**This architecture supports your vision of climate projections, heat islands, and urban environmental monitoring with a clean, scalable foundation!** 🌍🏙️