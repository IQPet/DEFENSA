import express from 'express';
import pool from '../config/db.js';
import path from 'path';
// import fs from 'fs'; // ya no se usa fs para guardar imágenes localmente
import multer from 'multer';
import { enviarCredenciales } from '../utils/mailer.js';
import supabase from './supabaseClient.js'; // IMPORTA supabase aquí

const router = express.Router();

// === Configuración de Multer para subida de imágenes EN MEMORIA ===
const storage = multer.memoryStorage(); // Cambio: memoria en lugar de disco
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

      console.log('📧 Creando nuevo dueño y enviando correo...');
      try {
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

        console.log(`🔑 Clave temporal generada: ${clave}`);
        console.log(`📨 Llamando a enviarCredenciales para: ${correo}`);

        await enviarCredenciales(correo, dueno_nombre || 'Dueño', clave, duenoId);

        console.log('✅ Correo enviado correctamente o función terminó sin error.');
      } catch (error) {
        console.error('❌ Error creando dueño o enviando correo:', error);
        return res.status(500).json({ error: 'Error al crear dueño o enviar correo.' });
      }
    }

    // === NUEVO: subir imagen a Supabase Storage ===
    const archivo = req.file;
    const nombreArchivo = `mascota_${Date.now()}${path.extname(archivo.originalname)}`;

    const { error: uploadError } = await supabase.storage
      .from('mascotas')
      .upload(nombreArchivo, archivo.buffer, {
        contentType: archivo.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error('Error al subir imagen a Supabase:', uploadError.message);
      return res.status(500).json({ error: 'No se pudo subir imagen.' });
    }

    const { data: publicUrlData } = supabase.storage
      .from('mascotas')
      .getPublicUrl(nombreArchivo);

    const fotoUrl = publicUrlData.publicUrl; // guardamos URL pública

    // Validación segura de edad
    const edadParseada = parseInt(edad);
    const edadFinal = isNaN(edadParseada) ? null : edadParseada;

    // Normalizar estado
    let estadoNormalizado = estado.trim().toLowerCase();
    if (estadoNormalizado === 'perdido') estadoNormalizado = 'Perdida';
    else if (estadoNormalizado === 'en casa' || estadoNormalizado === 'en_casa') estadoNormalizado = 'En casa';
    else {
      return res.status(400).json({
        error: 'Estado inválido. Usa "Perdida" o "En casa".'
      });
    }

    // Log para depuración
    console.log('🐶 Datos para insertar mascota:', {
      nombre, especie, raza, edad: edadFinal, estado: estadoNormalizado, mensaje,
      historial_salud, fotoUrl, duenoId
    });

    const insertMascota = await pool.query(`
      INSERT INTO mascotas 
        (nombre, especie, raza, edad, estado, mensaje, historial_salud, foto, dueno_id)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, [
      nombre, especie, raza, edadFinal,
      estadoNormalizado, mensaje, historial_salud,
      fotoUrl, duenoId
    ]);

    const id = insertMascota.rows[0].id;
    console.log('✅ Mascota insertada con ID:', id);

   const url = `https://defensa-1.onrender.com/ver-mascota.html?id=${id}`;

    res.json({ id, url });
  } catch (err) {
    console.error('❌ Error al crear mascota:', err.message);
    console.error('🧠 Detalles:', err.stack);
    res.status(500).json({ error: 'Error interno al crear la mascota.', detalle: err.message });
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

/* ===============================
   GET /api/mascota/:id
   (Muestra perfil público de mascota)
================================ */
router.get('/mascota/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const result = await pool.query(`
      SELECT 
        id, nombre, especie, raza, edad, estado, mensaje, historial_salud, foto
      FROM mascotas
      WHERE id = $1
    `, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Mascota no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al buscar mascota:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

export default router;
