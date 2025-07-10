// routes/validarDueno.js
import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { correo, clave } = req.body;

  if (!correo || !clave) {
    return res.status(400).json({ error: 'Correo y clave son obligatorios' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT * FROM duenos WHERE correo = $1 AND clave = $2',
      [correo, clave]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Correo o clave incorrectos' });
    }

    const dueno = rows[0];

    const mascotas = await pool.query(
      'SELECT id FROM mascotas WHERE dueno_id = $1',
      [dueno.id]
    );

    return res.json({
      duenoId: dueno.id,
      mascotas: mascotas.rows
    });
  } catch (error) {
    console.error('❌ Error al validar dueño:', error);
    return res.status(500).json({ error: 'Error del servidor al validar dueño' });
  }
});

export default router;
