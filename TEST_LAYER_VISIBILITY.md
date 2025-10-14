# Testing Temperature Projection Layer Visibility

## Quick Test Steps

### 1. Open the Application
```
http://localhost:8080
```

### 2. Check Layer is Active
Look for **"Future Temperature Anomaly"** in the Climate Layers panel:
- [ ] Checkbox should be **checked** by default
- [ ] Layer title should have blue highlight

### 3. Verify Hexagons Appear on Map
You should see:
- [ ] **Hexagonal polygons** covering the visible map area
- [ ] **Orange/red colors** indicating temperature anomalies
- [ ] Hexagons are **semi-transparent** (you can see the base map through them)

If you **DON'T** see hexagons:

#### Troubleshooting Step A: Check Browser Console
1. Open DevTools (F12 or right-click → Inspect)
2. Go to Console tab
3. Look for any errors
4. Common issues:
   - Network errors (red text)
   - "Failed to fetch" messages
   - TypeScript errors

#### Troubleshooting Step B: Check Network Tab
1. Open DevTools → Network tab
2. Filter by "temperature"
3. Look for request to `/api/nasa/temperature-projection`
4. Click on it and check:
   - **Status**: Should be `200 OK`
   - **Response**: Should have `"success": true` and `features` array
   - **Size**: Should be ~500KB-1MB (lots of hexagon data)

#### Troubleshooting Step C: Force Refresh
1. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Clear browser cache
3. Close and reopen browser tab

### 4. Test the Real Data Toggle

In the **Layer Controls** panel:

1. Locate the "Real NASA Data" toggle
2. Currently it should show: **"Using simulated data (faster)"**
3. Toggle it **ON**
4. Should now show: **"Using NEX-GDDP-CMIP6 from AWS S3"**
5. Warning should appear: **"⚠️ First load may take 10-30 seconds"**
6. Wait 10-30 seconds for data to load
7. Hexagons should update with real NASA data

### 5. Verify Data is Loading

Check the browser Network tab:
- New request to `/api/nasa/temperature-projection?use_real_data=true`
- Status: 200 OK
- Response time: 10-30 seconds (first time)
- Response size: Similar to simulated data

### 6. Test Other Controls

Try adjusting:
- **Scenario**: Switch between RCP 2.6, 4.5, 8.5
  - Hexagons should update with different temperature values
  - Higher RCP = warmer colors (more red/orange)

- **Projection Year**: Slide from 2025 to 2100
  - Later years = warmer colors

- **Layer Opacity**: Slide from 10% to 100%
  - Hexagons should become more/less transparent

## Expected Visual Result

The map should show:
```
┌────────────────────────────────────┐
│  Map with Base Tiles               │
│                                    │
│    ⬡ ⬡ ⬡ ⬡ ⬡ ⬡                   │
│   ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡                  │
│    ⬡ ⬡ ⬡ ⬡ ⬡ ⬡    (Hexagons)    │
│   ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡   in orange/red  │
│    ⬡ ⬡ ⬡ ⬡ ⬡ ⬡    colors)        │
│                                    │
└────────────────────────────────────┘
```

### Color Coding
- **Blue/Cool colors**: Negative anomaly (cooling)
- **White**: ~0°C anomaly (no change)
- **Yellow/Orange**: +2-4°C anomaly
- **Red/Dark red**: +4-7°C anomaly (significant warming)

## Debugging Commands

### Check Backend is Running
```bash
curl -s "http://localhost:3001/api/nasa/temperature-projection?north=41&south=40&east=-73&west=-74&year=2050&scenario=rcp45" | head -20
```

Should return JSON with `"success": true`

### Check Python Climate Service
```bash
curl -s "http://localhost:8081/health"
```

Should return:
```json
{
  "status": "healthy",
  "service": "climate-data-server",
  "version": "1.0.0"
}
```

### Check Docker Containers
```bash
docker-compose ps
```

All services should be "Up":
- urban-studio-frontend (port 8080)
- urban-studio-backend (port 3001)
- urban-studio-qgis (port 8081)
- urban-studio-db (port 5432)

### View Logs
```bash
# Frontend logs
docker-compose logs -f urban-studio-frontend

# Backend logs
docker-compose logs -f urban-studio-backend

# Climate service logs
docker-compose logs -f urban-studio-qgis
```

## Common Issues

### Issue: Layer checkbox is checked but no hexagons
**Solution**:
1. Check that map has zoomed to an area (not zoomed out to whole world)
2. Try toggling the layer off and on again
3. Check browser console for JavaScript errors

### Issue: "Failed to fetch" error in console
**Solution**:
1. Check backend is running: `docker-compose ps`
2. Restart backend: `docker-compose restart urban-studio-backend`
3. Check backend logs for errors

### Issue: Hexagons appear but are all one color
**Solution**:
1. This might be normal - check the temperature legend
2. Try changing the projection year or scenario
3. Verify data has `tempAnomaly` values (check Network response)

### Issue: Toggle switch doesn't appear
**Solution**:
1. Make sure layer is active (checkbox checked)
2. Scroll down in the Layer Controls panel
3. Hard refresh browser (Ctrl+Shift+R)

### Issue: Real data toggle takes forever
**Solution**:
1. First request downloads ~2-5GB from AWS S3 (can take minutes)
2. Check `docker-compose logs urban-studio-qgis` for progress
3. Subsequent requests should be much faster (cached)
4. Consider using simulated data for development

## Success Criteria

✅ **Layer is working if you can:**
1. See the temperature projection layer checked by default
2. See orange/red hexagons on the map
3. Click on a hexagon and see a popup with temperature anomaly
4. Toggle the layer off and hexagons disappear
5. Toggle the layer on and hexagons reappear
6. Adjust controls (year/scenario) and hexagons update
7. Toggle real data switch and see status change

## Still Not Working?

If hexagons still don't appear after all troubleshooting:

1. **Restart everything**:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

2. **Check this file was updated**:
   ```bash
   grep "defaultActive" frontend/src/config/climateLayers.ts
   ```
   Should show `defaultActive: true` for temperature_projection

3. **Verify Switch component exists**:
   ```bash
   ls frontend/src/components/ui/switch.tsx
   ```
   Should exist

4. **Report the issue with**:
   - Browser console errors (screenshot)
   - Network tab showing the API request
   - Docker logs from all services
