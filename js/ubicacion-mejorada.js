// Analiza y elige la ubicación más precisa entre dos fuentes
export function elegirUbicacionMasPrecisa(gps, api) {
  // Validar si la ubicación es válida antes de parsearla
  const parse = (loc) => {
    if (!loc || typeof loc.lat !== 'number' || typeof loc.lon !== 'number') {
      return null;
    }

    return {
      lat: parseFloat(loc.lat),
      lon: parseFloat(loc.lon),
      accuracy: parseFloat(loc.accuracy) || 999999, // muy impreciso si no viene
      fuente: loc.fuente || 'desconocida',
    };
  };

  const gpsData = parse(gps);
  const apiData = parse(api);

  // Caso ideal: ambas son válidas
  if (gpsData && apiData) {
    return gpsData.accuracy <= apiData.accuracy ? gpsData : apiData;
  }

  // Si solo una es válida
  if (gpsData) return gpsData;
  if (apiData) return apiData;

  // Si ninguna sirve
  return null;
}
