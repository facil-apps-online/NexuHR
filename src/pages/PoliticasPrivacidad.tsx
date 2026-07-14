import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};

export default function PoliticasPrivacidad() {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8"
    >
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden p-8 sm:p-12">
        <div className="flex items-center mb-8">
          <Button variant="ghost" asChild className="mr-4">
            <Link to="/">
              <ChevronLeft className="w-5 h-5 mr-2" />
              Volver
            </Link>
          </Button>
          <h1 className="text-3xl font-bold text-slate-900">Políticas de Privacidad</h1>
        </div>

        <div className="prose prose-slate max-w-none">
          <p className="text-sm text-slate-500 mb-8">Última actualización: Julio de 2026</p>
          
          <h2>1. Información General</h2>
          <p>
            En <strong>Facil Apps Online</strong>, operando el servicio <strong>NexuHR</strong>, respetamos su privacidad y nos comprometemos a proteger sus datos personales. Esta política explica cómo recopilamos, usamos y salvaguardamos su información cuando utiliza nuestra plataforma.
          </p>

          <h2>2. Datos Recopilados</h2>
          <p>
            Recopilamos información que usted nos proporciona directamente (como nombre, correo electrónico, datos de su empresa y empleados) y datos recopilados automáticamente (como dirección IP, tipo de navegador y patrones de uso mediante cookies).
          </p>

          <h2>3. Uso de la Información</h2>
          <p>
            Utilizamos sus datos personales exclusivamente para:
          </p>
          <ul>
            <li>Proveer y mantener el servicio de NexuHR.</li>
            <li>Gestionar su cuenta y brindarle soporte técnico.</li>
            <li>Mejorar nuestra plataforma y desarrollar nuevas funcionalidades.</li>
            <li>Enviarle notificaciones importantes sobre el servicio.</li>
          </ul>

          <h2>4. Compartición de Datos</h2>
          <p>
            <strong>Facil Apps Online</strong> no vende ni alquila sus datos personales a terceros. Solo compartimos información con proveedores de servicios de confianza (como servicios de hosting y envío de correos) que nos asisten en la operación de la plataforma, bajo estrictos acuerdos de confidencialidad.
          </p>

          <h2>5. Seguridad</h2>
          <p>
            Implementamos medidas de seguridad técnicas y organizativas líderes en la industria para proteger sus datos contra acceso no autorizado, alteración, divulgación o destrucción.
          </p>

          <h2>6. Sus Derechos</h2>
          <p>
            Usted tiene derecho a acceder, corregir, actualizar o eliminar su información personal en cualquier momento a través de la configuración de su cuenta o contactándonos directamente.
          </p>

          <h2>7. Contacto</h2>
          <p>
            Si tiene alguna pregunta sobre esta Política de Privacidad, por favor contáctenos en: <strong>admin@facil-apps.online</strong>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
