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

export default function TerminosServicio() {
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
          <h1 className="text-3xl font-bold text-slate-900">Términos de Servicio</h1>
        </div>

        <div className="prose prose-slate max-w-none">
          <p className="text-sm text-slate-500 mb-8">Última actualización: Julio de 2026</p>
          
          <h2>1. Aceptación de los Términos</h2>
          <p>
            Al acceder y utilizar <strong>NexuHR</strong>, un servicio operado por <strong>Facil Apps Online</strong>, usted acepta estar sujeto a estos Términos de Servicio. Si no está de acuerdo con alguna parte de los términos, no podrá acceder al servicio.
          </p>

          <h2>2. Descripción del Servicio</h2>
          <p>
            NexuHR es una plataforma en la nube diseñada para la gestión de recursos humanos, portales de empleados, firmas electrónicas y evaluaciones corporativas. Nos reservamos el derecho de modificar o descontinuar el servicio en cualquier momento, con o sin previo aviso.
          </p>

          <h2>3. Cuentas de Usuario</h2>
          <p>
            Para utilizar NexuHR, debe crear una cuenta. Usted es responsable de mantener la confidencialidad de su cuenta y contraseña, así como de todas las actividades que ocurran bajo su cuenta.
          </p>

          <h2>4. Uso Aceptable</h2>
          <p>
            Usted se compromete a no utilizar NexuHR para ningún propósito ilegal o no autorizado. No debe transmitir gusanos, virus, ni ningún código de naturaleza destructiva.
          </p>

          <h2>5. Propiedad Intelectual</h2>
          <p>
            El servicio y su contenido original, características y funcionalidad son y seguirán siendo propiedad exclusiva de Facil Apps Online y sus licenciantes.
          </p>

          <h2>6. Limitación de Responsabilidad</h2>
          <p>
            En ningún caso Facil Apps Online, ni sus directores, empleados, socios o agentes, serán responsables de cualquier daño indirecto, incidental, especial, consecuente o punitivo resultante de su acceso o uso del servicio.
          </p>

          <h2>7. Contacto</h2>
          <p>
            Si tiene alguna duda sobre estos Términos de Servicio, por favor contáctenos a través de: <strong>admin@facil-apps.online</strong>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
