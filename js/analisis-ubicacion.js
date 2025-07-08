// analisis-ubicacion.js

/**
 * Calcula la distancia en metros entre dos coordenadas GPS
 * usando la fórmula Haversine.
 * @param {object} loc1 { lat: number, lon: number }
 * @param {object} loc2 { lat: number, lon: number }
 * @returns {number} distancia en metros
 */
function distanciaMetros(loc1, loc2) {
  const R = 6371e3; // Radio Tierra en metros
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(loc2.lat - loc1.lat);
  const dLon = toRad(loc2.lon - loc1.lon);
  const lat1Rad = toRad(loc1.lat);
  const lat2Rad = toRad(loc2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // metros
}

/**
 * Valida si la precisión es aceptable (menos de 1000 metros).
 * @param {number} accuracy
 * @returns {boolean}
 */
function precisionAceptable(accuracy) {
  return accuracy && accuracy <= 1000;
}

/**
 * Decide qué ubicación usar según precisión y distancia entre ambas.
 * @param {object} gps { lat, lon, accuracy }
 * @param {object} api { lat, lon, accuracy }
 * @returns {object|null} ubicación final o null si no confiable
 */
function decidirUbicacion(gps, api) {
  if (!gps && !api) return null;

  const gpsValida = gps && precisionAceptable(gps.accuracy);
  const apiValida = api && precisionAceptable(api.accuracy);

  if (gpsValida && apiValida) {
    const dist = distanciaMetros(gps, api);
    // Si están cerca (menos de 2000 m) usamos la que tiene mejor precisión
    if (dist < 2000) {
      return gps.accuracy <= api.accuracy ? gps : api;
    } else {
      // Diferencia grande → damos preferencia a GPS
      return gps;
    }
  } else if (gpsValida) {
    return gps;
  } else if (apiValida) {
    return api;
  }

  return null; // Ninguna ubicación confiable
}

/**
 * Genera link Google Maps para coordenadas.
 * @param {object} loc { lat, lon }
 * @returns {string}
 */
function generarLinkGoogleMaps(loc) {
  return `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lon}`;
}

/**
 * Muestra en el DOM la ubicación y el link, o mensaje de error.
 * @param {object|null} loc
 */
function mostrarUbicacionFinal(loc) {
  const contenedor = document.getElementById("zona-info") || document.body;
  contenedor.innerHTML = ""; // limpiar

  if (!loc) {
    const p = document.createElement("p");
    p.style.color = "red";
    p.textContent = "⚠️ No se pudo determinar una ubicación precisa confiable.";
    contenedor.appendChild(p);
    return;
  }

  const div = document.createElement("div");
  div.style = "margin-top: 20px; padding: 10px; background: #e0ffe0; border-radius: 10px;";

  div.innerHTML = `
    <p>📍 Ubicación seleccionada con precisión: ${loc.accuracy} metros</p>
    <p><a href="${generarLinkGoogleMaps(loc)}" target="_blank" rel="noopener noreferrer">Abrir en Google Maps</a></p>
  `;

  contenedor.appendChild(div);
}

/**
 * Función principal que recibe datos GPS y API,
 * decide cuál usar, muestra el resultado y devuelve
 * la ubicación final para enviar.
 * @param {object|null} gps
 * @param {object|null} api
 * @returns {object|null} ubicación final o null
 */
function analizarYEnviarUbicacion(gps, api) {
  const final = decidirUbicacion(gps, api);
  mostrarUbicacionFinal(final);
  return final;
}

export {
  analizarYEnviarUbicacion,
};
