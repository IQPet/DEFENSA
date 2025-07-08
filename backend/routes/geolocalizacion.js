// backend/routes/geolocalizacion.js
import express from 'express';
const router = express.Router();

router.post('/geolocalizar-por-ip', async (req, res) => {
  try {
    const GOOGLE_API_KEY = process.env.GOOGLE_GEO_API_KEY;
    if (!GOOGLE_API_KEY) {
      return res.status(500).json({ error: 'Falta GOOGLE_GEO_API_KEY en .env' });
    }

    const url = `https://www.googleapis.com/geolocation/v1/geolocate?key=${GOOGLE_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ considerIp: true }),
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    return res.json({
      lat: data.location.lat,
      lon: data.location.lng,
      accuracy: data.accuracy,
      fuente: "Google Geolocation API",
    });

  } catch (error) {
    console.error('❌ Error usando Google Geolocation API:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
