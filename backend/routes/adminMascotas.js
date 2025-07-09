import express from 'express';
import pool from '../config/db.js';
import path from 'path';
import fs from 'fs';
import multer from 'multer';

const router = express.Router();

// === Configuración de Multer para subida de imágenes ===
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join('imagenes', 'mascotas');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `mascota_${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ storage });

// === Verificación básica de admin (mejor usar token en producción) ===
function verificarAdmin(req, res) {
  const adminCorreo = req.headers['x-admin-correo'];
  if (adminCorreo !== 'admin@iqpet.com') {
    res.status(403).json({ error: 'Acceso denegado. Solo para administradores.' });
    return false;
  }
  return true;
}

/* =========================
   GET /api/admin/mascotas
=========================== */
router.get('/mascotas', async (req, res) => {
  if (!verificarAdmin(req, res)) return;

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

/* ===============================
   POST /api/admin/crear-mascota
================================ */
router.post('/crear-mascota', upload.single('foto'), async (req, res) => {
  if (!verificarAdmin(req, res)) return;

  const {
    nombre, especie, raza, edad, estado,
    mensaje, historial_salud,
    correo, dueno_nombre, telefono, mensaje_dueno
  } = req.body;

  if (!nombre || !correo || !req.file) {
    return res.status(400).json({ error: 'Faltan campos requeridos o imagen.' });
  }

  try {
    let duenoId;

    const duenoRes = await pool.query('SELECT id FROM duenos WHERE correo = $1', [correo]);

    if (duenoRes.rowCount > 0) {
      duenoId = duenoRes.rows[0].id;
    } else {
      const clave = Math.random().toString(36).substring(2, 8); // clave temporal
      const nuevoDueno = await pool.query(
        `INSERT INTO duenos (nombre, telefono, correo, mensaje, clave)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [
          dueno_nombre || 'Dueño',
          telefono || '',
          correo,
          mensaje_dueno || '',
          clave
        ]
      );
      duenoId = nuevoDueno.rows[0].id;

      // 🚀 Aquí podrías enviar correo con la clave
      // await enviarCredenciales(correo, dueno_nombre, clave, duenoId);
    }

    const fotoUrl = `/imagenes/mascotas/${req.file.filename}`; // ruta pública

    const insertMascota = await pool.query(`
      INSERT INTO mascotas 
        (nombre, especie, raza, edad, estado, mensaje, historial_salud, foto, dueno_id)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, [
      nombre, especie, raza, edad,
      estado, mensaje, historial_salud,
      fotoUrl, duenoId
    ]);

    const id = insertMascota.rows[0].id;

    const url = id === 1
      ? 'https://defensa-1.onrender.com/perfil.html'
      : `https://defensa-1.onrender.com/perfil.html?id=${id}`;

    res.json({ id, url });
  } catch (err) {
    console.error('Error creando mascota como admin:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

/* ===============================
   GET /api/admin/dueno-por-correo
================================ */
router.get('/dueno-por-correo', async (req, res) => {
  if (!verificarAdmin(req, res)) return;

  const correo = req.query.correo;

  if (!correo) {
    return res.status(400).json({ error: 'Correo no proporcionado' });
  }

  try {
    const result = await pool.query(
      'SELECT nombre, telefono, mensaje FROM duenos WHERE correo = $1',
      [correo]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Dueño no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error consultando dueño:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

export default router;

