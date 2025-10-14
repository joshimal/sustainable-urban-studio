import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ClimateFetchContext, ClimateLayerId, getClimateLayer } from '../config/climateLayers';
import { useClimate } from '../contexts/ClimateContext';
import { LatLngBoundsLiteral } from '../types/geography';

type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

export interface LayerFetchState {
  status: FetchStatus;
  data: any | null;
  metadata?: any;
  error?: string;
  updatedAt?: number;
}

export type LayerStateMap = Partial<Record<ClimateLayerId, LayerFetchState>>;

const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, '') || 'http://localhost:3001';

const buildQueryString = (params: Record<string, string | number | boolean>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    search.append(key, String(value));
  });
  return search.toString();
};

const getBoundsKey = (bounds: LatLngBoundsLiteral | null) => {
  if (!bounds) return 'global';
  return `${bounds.north}:${bounds.south}:${bounds.east}:${bounds.west}:${bounds.zoom || 10}`;
};

export const useClimateLayerData = (bounds: LatLngBoundsLiteral | null) => {
  const { controls, activeLayerIds } = useClimate();
  const [layerStates, setLayerStates] = useState<LayerStateMap>({});
  const cacheRef = useRef<Map<string, LayerFetchState>>(new Map());
  const abortControllers = useRef<Map<ClimateLayerId, AbortController>>(new Map());

  const boundsKey = useMemo(() => getBoundsKey(bounds), [bounds]);

  const fetchContext: ClimateFetchContext = useMemo(
    () => ({
      bounds,
      scenario: controls.scenario,
      projectionYear: controls.projectionYear,
      seaLevelFeet: controls.seaLevelFeet,
      analysisDate: controls.analysisDate,
      displayStyle: controls.displayStyle,
      resolution: controls.resolution,
      projectionOpacity: controls.projectionOpacity,
      useRealData: controls.useRealData
    }),
    [bounds, controls, boundsKey]
  );

  const setLayerState = useCallback(
    (
      layerId: ClimateLayerId,
      nextState: LayerFetchState | ((previous?: LayerFetchState) => LayerFetchState)
    ) => {
      setLayerStates(prev => {
        const previous = prev[layerId];
        const resolved =
          typeof nextState === 'function'
            ? (nextState as (previous?: LayerFetchState) => LayerFetchState)(previous)
            : nextState;
        return {
          ...prev,
          [layerId]: resolved
        };
      });
    },
    []
  );

  const fetchLayer = useCallback(
    async (layerId: ClimateLayerId, forceRefresh = false) => {
      const layer = getClimateLayer(layerId);
      if (!layer) {
        setLayerState(layerId, {
          status: 'error',
          data: null,
          error: `Unknown layer: ${layerId}`
        });
        return;
      }

      const params = layer.fetch.query(fetchContext);
      const cacheKey = `${layerId}:${JSON.stringify(params)}`;

      if (!forceRefresh && cacheRef.current.has(cacheKey)) {
        const cached = cacheRef.current.get(cacheKey)!;
        setLayerState(layerId, {
          ...cached,
          status: 'success'
        });
        return;
      }

      if (abortControllers.current.has(layerId)) {
        abortControllers.current.get(layerId)?.abort();
      }

      const controller = new AbortController();
      abortControllers.current.set(layerId, controller);
      setLayerState(layerId, previous => ({
        status: 'loading',
        data: previous?.data ?? null,
        metadata: previous?.metadata,
        updatedAt: previous?.updatedAt
      }));

      try {
        const queryString = buildQueryString(params);
        const url = `${BACKEND_BASE_URL}${layer.fetch.route}${queryString ? `?${queryString}` : ''}`;
        const response = await fetch(url, {
          method: layer.fetch.method,
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = await response.json();
        const result: LayerFetchState = {
          status: 'success',
          data: payload.data ?? payload,
          metadata: payload.metadata,
          updatedAt: Date.now()
        };

        cacheRef.current.set(cacheKey, result);
        setLayerState(layerId, result);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        const message = error instanceof Error ? error.message : 'Unknown error';
        setLayerState(layerId, {
          status: 'error',
          data: null,
          error: message
        });
      } finally {
        abortControllers.current.delete(layerId);
      }
    },
    [fetchContext, setLayerState]
  );

  useEffect(() => {
    const uniqueActiveLayers = Array.from(new Set(activeLayerIds));
    uniqueActiveLayers.forEach(layerId => {
      fetchLayer(layerId);
    });

    return () => {
      uniqueActiveLayers.forEach(layerId => {
        if (abortControllers.current.has(layerId)) {
          abortControllers.current.get(layerId)?.abort();
          abortControllers.current.delete(layerId);
        }
      });
    };
  }, [activeLayerIds, fetchLayer]);

  const refreshLayer = useCallback(
    (layerId: ClimateLayerId) => {
      cacheRef.current.clear();
      fetchLayer(layerId, true);
    },
    [fetchLayer]
  );

  const refreshAll = useCallback(() => {
    cacheRef.current.clear();
    activeLayerIds.forEach(layerId => fetchLayer(layerId, true));
  }, [activeLayerIds, fetchLayer]);

  return {
    layers: layerStates,
    controls: fetchContext,
    refreshLayer,
    refreshAll
  };
};
