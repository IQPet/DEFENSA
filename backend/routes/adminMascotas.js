// routes/adminMascotas.js
import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET /api/admin/mascotas
router.get('/mascotas', async (req, res) => {
  const adminCorreo = req.headers['x-admin-correo'];

  // Validación sencilla de admin (esto lo mejoraremos luego)
  if (adminCorreo !== 'admin@iqpet.com') {
    return res.status(403).json({ error: 'Acceso denegado. Solo para administradores.' });
  }

  try {
    const query = `
      SELECT mascotas.id, mascotas.nombre, mascotas.tipo, duenos.correo AS dueno_correo
      FROM mascotas
      JOIN duenos ON mascotas.dueno_id = duenos.id
      ORDER BY mascotas.id DESC
      LIMIT 50;
    `;
    const resultado = await pool.query(query);
    res.json({ mascotas: resultado.rows });
  } catch (error) {
    console.error('Error al obtener mascotas:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

export default router;
