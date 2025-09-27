import React from 'react';
import Map from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const SimpleMapTest: React.FC = () => {
  return (
    <div style={{ width: '100%', height: '400px', background: '#f0f0f0' }}>
      <Map
        initialViewState={{
          longitude: -73.5143,
          latitude: 40.7259,
          zoom: 10
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken="pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw"
      />
    </div>
  );
};

export default SimpleMapTest;


