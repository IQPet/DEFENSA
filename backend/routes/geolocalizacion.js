import express from 'express';
const router = express.Router();

router.post('/geolocalizar-por-ip', async (req, res) => {
  try {
    const GOOGLE_API_KEY = process.env.GOOGLE_GEO_API_KEY;
    if (!GOOGLE_API_KEY) {
      return res.status(500).json({ error: 'Falta GOOGLE_GEO_API_KEY en .env' });
    }

    // 🔍 Parámetros recibidos desde el frontend
    const considerIp = req.body.considerIp !== false;
    const wifiAccessPoints = req.body.wifiAccessPoints || [];

    // 📡 Construimos payload
    const payload = { considerIp };
    if (wifiAccessPoints.length > 0) {
      payload.wifiAccessPoints = wifiAccessPoints;
      console.log(`📶 Recibidas ${wifiAccessPoints.length} redes WiFi para mejorar precisión.`);
    }

    const url = `https://www.googleapis.com/geolocation/v1/geolocate?key=${GOOGLE_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const lat = data.location.lat;
    const lon = data.location.lng;
    const accuracy = data.accuracy;

    // 🧠 Verificación de calidad de ubicación
    console.log(`📍 Ubicación estimada: ${lat}, ${lon} (±${accuracy}m) - Fuente: Google Geolocation API`);
    if (accuracy > 50000) {
      console.warn('⚠️ La precisión es muy baja (> 50km). Es probable que solo se haya usado la IP.');
    }

    return res.json({
      lat,
      lon,
      accuracy,
      fuente: "Google Geolocation API",
    });

  } catch (error) {
    console.error('❌ Error usando Google Geolocation API:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;

