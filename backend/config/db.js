import dotenv from 'dotenv';
import path from 'path';
import pkg from 'pg';

const { Pool } = pkg;

// Cargar variables de entorno desde la carpeta backend
dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });

console.log('📍 Ruta del .env cargado:', path.resolve(process.cwd(), 'backend', '.env'));
console.log('🛠️ Conectando a DB con URL:', process.env.DATABASE_URL);

if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: La variable DATABASE_URL NO está definida en .env');
  process.exit(1);
}

// Detectar si la conexión es local (localhost o 127.0.0.1)
const isLocal = process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1');

// Configurar Pool de pg con opción ssl adecuada
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal
    ? false                       // Sin SSL si es local
    : { rejectUnauthorized: false }, // Aceptar certificado autofirmado en producción/supabase
});

// Test rápido de conexión al iniciar el servidor
(async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Conexión a la base de datos establecida correctamente.');
    client.release();
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error.message);
    process.exit(1);
  }
})();

export default pool;
