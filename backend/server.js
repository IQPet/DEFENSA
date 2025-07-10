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
import adminMascotasRoutes from './routes/adminMascotas.js';
import supabase from './routes/supabaseClient.js';
import validarDuenoRoutes from './routes/validarDueno.js';


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

// ✅ CORS configurado bien para permitir el frontend
const corsOptions = {
  origin: 'https://defensa-1.onrender.com', // tu dominio frontend
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// 🔧 Aplicar CORS correctamente a TODAS las rutas
app.use(cors(corsOptions));
app.set('trust proxy', 1); // necesario en Render para manejar cookies y headers correctamente

// 🔧 Asegura respuesta correcta a preflight (OPTIONS)
app.options('*', cors(corsOptions), (req, res) => {
  res.sendStatus(204);
});


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
app.use('/api/admin', adminMascotasRoutes);
app.use('/api/validar-dueno', validarDuenoRoutes);


// Configurar multer para subir imágenes
const storage = multer.memoryStorage();
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

// 🔍 Obtener datos del perfil por ID desde la BD
console.log('Definiendo ruta GET /api/perfil/:id');
app.get('/api/perfil/:id', async (req, res) => {
  const mascotaId = req.params.id;

  try {
    const query = `
      SELECT 
        m.id,
        m.dueno_id,
        m.nombre AS nombre_mascota,
        m.especie,
        m.raza,
        m.edad,
        m.historial_salud,
        m.estado,
        m.mensaje AS mensaje_mascota,
        m.foto AS foto_url,
        d.id AS dueno_id,
        d.nombre AS nombre_dueno,
        d.telefono,
        d.correo,
        d.mensaje AS mensaje_dueno
      FROM mascotas m
      JOIN duenos d ON m.dueno_id = d.id
      WHERE m.id = $1
    `;

    const result = await pool.query(query, [mascotaId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mascota no encontrada' });
    }

    // Estructura para que coincida con la que usas en frontend
    const fila = result.rows[0];
    const respuesta = {
      id: fila.id,
      dueno_id: fila.dueno_id,
      nombre_mascota: fila.nombre_mascota,
      especie: fila.especie,
      raza: fila.raza,
      edad: fila.edad,
      historial_salud: fila.historial_salud,
      estado: fila.estado,
      mensaje_mascota: fila.mensaje_mascota,
      foto_url: fila.foto_url || 'https://hfmfwrgnaxknywfbocrl.supabase.co/storage/v1/object/public/mascotas/default.jpg',
      nombre_dueno: fila.nombre_dueno,
      telefono: fila.telefono,
      correo: fila.correo,
      mensaje_dueno: fila.mensaje_dueno
    };

    return res.json(respuesta);
  } catch (error) {
    console.error('❌ Error obteniendo perfil:', error);
    return res.status(500).json({
      error: 'Error al obtener el perfil',
      detalle: error.message,
    });
  }
});



console.log("🛠️ Versión corregida sin path-to-regexp directa");

// 🧪 Ruta temporal para testear conectividad con Supabase
app.get('/api/test-supabase', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('mascotas')
      .select('id')
      .limit(1);

    if (error) {
      console.error('❌ Error al conectar con Supabase:', error);
      return res.status(500).json({ error: 'Error conectando con Supabase', detalle: error.message });
    }

    res.json({ mensaje: '✅ Conexión a Supabase exitosa', data });
  } catch (err) {
    console.error('❌ Error inesperado en test Supabase:', err);
    res.status(500).json({ error: 'Fallo inesperado', detalle: err.message });
  }
});


// 🚀 Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend escuchando en puerto ${PORT}`);
});

