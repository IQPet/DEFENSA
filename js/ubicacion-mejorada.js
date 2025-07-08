// Analiza y elige la ubicación más precisa entre dos fuentes
export function elegirUbicacionMasPrecisa(gps, api) {
  const parse = (loc) => ({
    lat: parseFloat(loc.lat),
    lon: parseFloat(loc.lon),
    accuracy: parseFloat(loc.accuracy),
    fuente: loc.fuente || 'desconocida',
  });

  const gpsData = parse(gps);
  const apiData = parse(api);

  const ambasValidas = !isNaN(gpsData.accuracy) && !isNaN(apiData.accuracy);

  // Caso ideal: ambas tienen datos → elegir la de menor 'accuracy'
  if (ambasValidas) {
    return gpsData.accuracy <= apiData.accuracy ? gpsData : apiData;
  }

  // Si solo una es válida, usar esa
  if (!isNaN(gpsData.accuracy)) return gpsData;
  if (!isNaN(apiData.accuracy)) return apiData;

  // Si ninguna tiene precisión, pero sí lat/lon, usar alguna
  if (!isNaN(gpsData.lat) && !isNaN(gpsData.lon)) return gpsData;
  if (!isNaN(apiData.lat) && !isNaN(apiData.lon)) return apiData;

  // Si nada sirve, devolver nulo
  return null;
}
