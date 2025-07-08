import pool from './config/db.js';
import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import geoRouter from './routes/geolocalizacion.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta raíz del proyecto (un nivel arriba de backend/)
const rootPath = path.resolve(__dirname, '..');

// Cargar variables de entorno desde backend/.env
dotenv.config({ path: path.resolve(__dirname, '.env') });

console.log('📍 Ruta del .env cargado:', path.resolve(__dirname, '.env'));
console.log('🧪 DEBUG - DATABASE_URL:', process.env.DATABASE_URL);
console.log('🧪 DEBUG - EMAIL_USER:', process.env.EMAIL_USER);
console.log('🧪 DEBUG - EMAIL_PASS:', process.env.EMAIL_PASS ? '****' : 'undefined');
console.log('🧪 DEBUG - WHATSAPP_INSTANCE_ID:', process.env.WHATSAPP_INSTANCE_ID);
console.log('🧪 DEBUG - WHATSAPP_TOKEN:', process.env.WHATSAPP_TOKEN ? '****' : 'undefined');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Servir archivos estáticos del frontend (perfil.html y otros en la raíz)
app.use(express.static(rootPath));

// Opcional: cuando visiten la raíz, enviar perfil.html
app.get('/', (req, res) => {
  res.sendFile(path.join(rootPath, 'perfil.html'));
});

// Servir imágenes estáticas backend
app.use('/imagenes', express.static(path.join(__dirname, 'imagenes')));

app.use('/api', geoRouter);


// Configurar multer para subir imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'imagenes', 'mascotas'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `mascota_${Date.now()}${ext}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// Validar .env
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error('❌ ERROR: EMAIL_USER y EMAIL_PASS deben estar definidos en .env');
  process.exit(1);
}

// Configurar nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error('❌ ERROR SMTP:', error);
  } else {
    console.log('✅ Servidor SMTP verificado y listo.');
  }
});

app.post('/api/notificar-dueno', async (req, res) => {
  console.log("📥 [Paso 1] Solicitud recibida en /api/notificar-dueno");

  const { mascotaId, ubicacion, ip, dispositivo, fechaHora, lat, lon } = req.body;

  if (!mascotaId) {
    return res.status(400).json({ error: 'Debe proporcionar el ID de la mascota' });
  }

  try {
    const query = `
      SELECT 
        m.nombre AS nombre_mascota,
        m.mensaje AS mensaje_mascota,
        d.correo,
        d.telefono
      FROM mascotas m
      JOIN duenos d ON m.dueno_id = d.id
      WHERE m.id = $1
    `;

    const result = await pool.query(query, [mascotaId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mascota no encontrada' });
    }

    const datos = result.rows[0];

    let linkMapa = '';
    if (lat && lon) {
      linkMapa = `https://www.google.com/maps?q=${lat},${lon}`;
    }

    const textoMensaje = `
Hola, alguien visualizó el perfil de tu mascota "${datos.nombre_mascota}".

📍 Ubicación estimada: ${ubicacion}
${linkMapa ? `🌎 Ver en mapa: ${linkMapa}` : ''}
🌐 IP: ${ip}
💻 Dispositivo: ${dispositivo}

📝 Mensaje adicional: ${datos.mensaje_mascota || 'Ninguno'}

🕒 Fecha y hora: ${fechaHora || new Date().toLocaleString()}
    `;

  // Enviar correo
    if (datos.correo) {
      try {
        const info = await transporter.sendMail({
          from: `"IQPet Notificaciones" <${process.env.EMAIL_USER}>`,
          to: datos.correo,
          subject: `🐾 Alguien vio el perfil de ${datos.nombre_mascota}`,
          text: textoMensaje,
        });
        console.log("✅ Correo enviado. ID:", info.messageId);
      } catch (error) {
        console.error("❌ Error al enviar correo:", error);
      }
    } else {
      console.warn("⚠️ No se encontró correo del dueño.");
    }

    // Enviar WhatsApp
    if (datos.telefono && process.env.WHATSAPP_INSTANCE_ID && process.env.WHATSAPP_TOKEN) {
      try {
        const whatsappPayload = {
          token: process.env.WHATSAPP_TOKEN,
          to: datos.telefono,
          body: textoMensaje,
        };

        const whatsappUrl = `https://api.ultramsg.com/${process.env.WHATSAPP_INSTANCE_ID}/messages/chat`;

        const response = await fetch(whatsappUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(whatsappPayload),
        });

        const data = await response.json();

        if (response.ok) {
          console.log("✅ WhatsApp enviado:", data);
        } else {
          console.error("❌ Error al enviar WhatsApp:", data);
        }
      } catch (error) {
        console.error("❌ Error al procesar solicitud de WhatsApp:", error);
      }
    } else {
      console.warn("⚠️ WhatsApp no se envió: faltan datos o configuración.");
    }

    return res.json({ mensaje: 'Notificación enviada correctamente' });

  } catch (error) {
    console.error('❌ [ERROR] Fallo en el envío:', error);
    return res.status(500).json({
      error: 'Error enviando la notificación',
      detalle: error.message,
    });
  }
});

// 🔍 Obtener datos del perfil
app.get('/api/perfil/:id', async (req, res) => {
  const mascotaId = req.params.id;

  try {
    const query = `
      SELECT 
        m.id AS mascota_id,
        m.nombre AS nombre_mascota,
        m.foto,
        m.edad,
        m.raza,
        m.especie,
        m.estado,
        m.historial_salud,
        m.mensaje AS mensaje_mascota,
        d.nombre AS nombre_dueno,
        d.telefono,
        d.correo,
        d.mensaje AS mensaje_dueno
      FROM mascotas m
      JOIN duenos d ON m.dueno_id = d.id
      WHERE m.id = $1
    `;
    const result = await pool.query(query, [mascotaId]);

    console.log("🔍 Resultado de la consulta SQL:", result.rows);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mascota no encontrada' });
    }

    return res.json(result.rows[0]);

  } catch (error) {
    console.error("❌ Error al obtener perfil:", error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 🔐 Validar credenciales del dueño
app.post('/api/validar-dueno', async (req, res) => {
  const { correo, clave } = req.body;

  if (!correo || !clave) {
    return res.status(400).json({ error: 'Faltan datos: correo o clave' });
  }

  try {
    const result = await pool.query(
      'SELECT id, nombre FROM duenos WHERE correo = $1 AND clave = $2',
      [correo, clave]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Correo o clave incorrectos' });
    }

    const dueno = result.rows[0];
    return res.json({
      mensaje: 'Autenticación exitosa',
      duenoId: dueno.id,
      nombre: dueno.nombre
    });

  } catch (error) {
    console.error('❌ Error al validar dueño:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ✏️ Actualizar perfil
app.put('/api/editar-perfil/:id', upload.single('foto'), async (req, res) => {
  const mascotaId = req.params.id;
  const {
    nombre_mascota,
    estado,
    mensaje_mascota,
    especie,
    raza,
    edad,
    historial_salud,
    nombre_dueno,
    telefono,
    correo,
    mensaje_dueno
  } = req.body;

  try {
    const duenoQuery = await pool.query(
      `SELECT dueno_id FROM mascotas WHERE id = $1`,
      [mascotaId]
    );

    if (duenoQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Mascota no encontrada' });
    }

    const duenoId = duenoQuery.rows[0].dueno_id;

    let nuevaRutaFoto = null;
    if (req.file) {
      nuevaRutaFoto = `imagenes/mascotas/${req.file.filename}`;
    }

    const queryMascota = `
      UPDATE mascotas
      SET nombre = $1, estado = $2, mensaje = $3, especie = $4, raza = $5, edad = $6,
          historial_salud = $7${nuevaRutaFoto ? `, foto = '${nuevaRutaFoto}'` : ''}
      WHERE id = $8
    `;

    await pool.query(queryMascota, [
      nombre_mascota,
      estado,
      mensaje_mascota,
      especie,
      raza,
      edad,
      historial_salud,
      mascotaId
    ]);

    const queryDueno = `
      UPDATE duenos
      SET nombre = $1, telefono = $2, correo = $3, mensaje = $4
      WHERE id = $5
    `;

    await pool.query(queryDueno, [
      nombre_dueno,
      telefono,
      correo,
      mensaje_dueno,
      duenoId
    ]);

    res.json({ mensaje: 'Perfil actualizado correctamente' });

  } catch (error) {
    console.error('❌ Error actualizando perfil:', error);
    res.status(500).json({ error: 'Error al actualizar el perfil', detalle: error.message });
  }
});

// 🚀 Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend escuchando en puerto ${PORT}`);
});

