// routes/adminMascotas.js
import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

// GET /api/admin/mascotas
router.get('/mascotas', async (req, res) => {
  const adminCorreo = req.headers['x-admin-correo'];

  // Validación simple de administrador
  if (adminCorreo !== 'admin@iqpet.com') {
    return res.status(403).json({ error: 'Acceso denegado. Solo para administradores.' });
  }

  try {
    const query = `
      SELECT 
        mascotas.id,
        mascotas.nombre,
        mascotas.especie,
        mascotas.raza,
        mascotas.edad,
        mascotas.historial_salud,
        mascotas.estado,
        mascotas.mensaje,
        mascotas.foto,
        duenos.id AS dueno_id,
        duenos.nombre AS dueno_nombre,
        duenos.telefono AS dueno_telefono,
        duenos.correo AS dueno_correo,
        duenos.mensaje AS dueno_mensaje
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
