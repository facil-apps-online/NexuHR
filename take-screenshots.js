import puppeteer, { KnownDevices } from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  console.log('🚀 Iniciando Puppeteer...');
  const browser = await puppeteer.launch({
    headless: false, // ¡Para que puedas ver e iniciar sesión tú mismo!
    defaultViewport: null,
    args: ['--start-maximized']
  });

  const page = await browser.newPage();
  
  console.log('🌐 Navegando a http://localhost:8080/auth...');
  await page.goto('http://localhost:8080/auth', { timeout: 0 });

  // === AUTENTICACIÓN AUTOMÁTICA ===
  // PON AQUÍ TUS CREDENCIALES
  const EMAIL = 'admin@nexuhr.pro'; 
  const PASSWORD = '3nt3patatA*.*'; 
  
  if (EMAIL !== 'TU_EMAIL_AQUI') {
    console.log(`🤖 Iniciando sesión automáticamente con ${EMAIL}...`);
    await page.waitForSelector('#login-email');
    await page.type('#login-email', EMAIL);
    await page.type('#login-password', PASSWORD);
    
    // Hacemos click en el botón de submit del formulario de login
    // En auth.tsx el botón es simplemente type="submit"
    await page.click('button[type="submit"]');
  } else {
    console.log('⏳ Por favor, inicia sesión en la ventana del navegador que se acaba de abrir.');
  }

  console.log('⏳ El script está esperando a que llegues al Dashboard (/)...');

  // Wait until the URL changes to the dashboard route (assuming it's '/')
  await page.waitForFunction(() => {
    return window.location.pathname === '/' || window.location.pathname === '/dashboard';
  }, { timeout: 0 }); // No timeout, wait as long as the user needs to login

  console.log('✅ ¡Sesión iniciada detectada! Preparando pantallazos...');
  
  // --- 1. Desktop Screenshot ---
  console.log('📸 Configurando resolución Desktop...');
  await page.setViewport({ width: 1440, height: 900 });
  console.log('🔄 Recargando la página para asegurar que todo renderice correctamente...');
  await page.reload({ waitUntil: 'networkidle0', timeout: 0 });
  console.log('⏳ Esperando 20 segundos para asegurar carga completa en PC antiguo...');
  await new Promise(resolve => setTimeout(resolve, 20000));
  
  console.log('📸 Tomando pantallazo versión Desktop...');
  await page.screenshot({ 
    path: path.join(__dirname, 'public', 'nexuhr-desktop.jpg'),
    type: 'jpeg',
    quality: 95
  });

  // --- 2. Mobile Screenshot ---
  console.log('📸 Configurando Emulación de iPhone 13 Pro...');
  const iPhone = KnownDevices['iPhone 13 Pro'];
  await page.emulate(iPhone);
  
  console.log('🔄 Recargando la página con la configuración de móvil...');
  await page.reload({ waitUntil: 'networkidle0', timeout: 0 });
  console.log('⏳ Esperando 20 segundos a que carguen los gráficos...');
  await new Promise(resolve => setTimeout(resolve, 20000));
  
  console.log('📸 Tomando pantallazo versión Mobile...');
  await page.screenshot({ 
    path: path.join(__dirname, 'public', 'nexuhr-mobile.jpg'),
    type: 'jpeg',
    quality: 95
  });

  console.log('🎉 ¡Pantallazos generados con éxito!');
  console.log('Puedes revisar public/nexuhr-desktop.jpg y public/nexuhr-mobile.jpg');
  
  await browser.close();
})();
