export const loadLeaflet = async (): Promise<any> => {
  // Try common import patterns and fallbacks
  const tryGetL = (mod: any) => (mod && (mod.default || mod)) as any;

  let L: any | null = null;

  try {
    const mod = await import('leaflet');
    L = tryGetL(mod);
  } catch (_) {}

  if (!L || typeof L.map !== 'function') {
    try {
      const mod = await import('leaflet/dist/leaflet-src.esm.js');
      L = tryGetL(mod);
    } catch (_) {}
  }

  if (!L || typeof L.map !== 'function') {
    try {
      const mod = await import('leaflet/dist/leaflet.js');
      L = tryGetL(mod);
    } catch (_) {}
  }

  // Last resort: look for global
  if ((!L || typeof L.map !== 'function') && typeof window !== 'undefined') {
    const globalL = (window as any).L;
    if (globalL && typeof globalL.map === 'function') {
      L = globalL;
    }
  }

  if (!L || typeof L.map !== 'function') {
    throw new Error('Leaflet failed to load (no valid L.map)');
  }

  // Ensure global for plugins that expect window.L
  if (typeof window !== 'undefined') {
    (window as any).L = L;
  }

  return L;
};



