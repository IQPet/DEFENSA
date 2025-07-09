import dotenv from 'dotenv';
import path from 'path';
import pkg from 'pg';
import dns from 'dns/promises';

const { Pool } = pkg;

// Cargar variables desde .env
dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });

console.log('📍 Ruta del .env cargado:', path.resolve(process.cwd(), 'backend', '.env'));
console.log('🛠️ Conectando a DB con URL:', process.env.DATABASE_URL);

if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: La variable DATABASE_URL NO está definida en .env');
  process.exit(1);
}

// Detectar si es conexión local
const isLocal = process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1');

// 👉 Obtener IP IPv4 del host Supabase
let finalConnectionString = process.env.DATABASE_URL;
if (!isLocal) {
  try {
    const resolved = await dns.lookup('db.hfmfwrgnaxknywfbocrl.supabase.co', { family: 4 });
    const ipv4 = resolved.address;
    console.log('🌐 IP IPv4 resuelta para Supabase:', ipv4);

    // Reemplazar dominio con IP y mantener parámetros
    finalConnectionString = process.env.DATABASE_URL.replace(
      'db.hfmfwrgnaxknywfbocrl.supabase.co',
      ipv4
    );
  } catch (err) {
    console.error('❌ Error resolviendo IPv4:', err.message);
    process.exit(1);
  }
}

// Crear pool con la nueva cadena de conexión
const pool = new Pool({
  connectionString: finalConnectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

// Probar conexión
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
