import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { CheckCircle, Users, Activity, FileText, Stethoscope, LogIn, UserPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePublicRegistrationData } from '@/hooks/usePublicRegistrationData';
import { usePublicSubscriptionPlans } from '@/hooks/usePublicSubscriptionPlans';
import nexurhIcon from '@/assets/nexurh-icon.svg';

// We format price natively to avoid bringing over complex hooks
const formatPrice = (price: number, currencyCode: string) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: currencyCode || 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
};

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};

const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.5,
};

const FeatureCard = ({ icon, title, description }: { icon: any, title: string, description: string }) => (
  <div className="flex flex-col items-center text-center p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
    {React.createElement(icon, { className: "w-12 h-12 text-primary mb-4" })}
    <h3 className="text-xl font-semibold text-gray-800 mb-2">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
);

export default function LandingPage() {
  const [selectedCountryId, setSelectedCountryId] = useState('');
  const platformId = import.meta.env.VITE_PLATFORM_ID;
  const { data: publicData, isLoading: isLoadingCountries } = usePublicRegistrationData(platformId);
  const { data: plans, isLoading: isLoadingPlans } = usePublicSubscriptionPlans(selectedCountryId, platformId);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -340, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 340, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (publicData?.countries && publicData.countries.length > 0) {
      fetch('https://ipapi.co/json/')
        .then((res) => res.json())
        .then((data) => {
          const userCountry = publicData.countries.find(c => c.iso_code === data.country_code);
          if (userCountry) {
            setSelectedCountryId(userCountry.id);
          } else {
            setSelectedCountryId(publicData.countries[0].id);
          }
        })
        .catch(() => {
          setSelectedCountryId(publicData.countries[0].id);
        });
    }
  }, [publicData?.countries]);

  const sortedPlans = useMemo(() => {
    return plans?.sort((a, b) => a.calculated_price - b.calculated_price) || [];
  }, [plans]);

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="min-h-screen bg-gray-50 text-gray-800"
    >
      {/* Header */}
      <header className="w-full bg-white shadow-sm p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <img src={nexurhIcon} alt="NexuHR Logo" className="w-8 h-8" />
          <span className="text-2xl font-bold text-primary">NexuHR</span>
        </div>
        <nav className="flex items-center space-x-2 text-sm md:space-x-4 md:text-base">
          <span className="hidden sm:block">
            <Link to="/auth" className="text-gray-600 hover:text-primary whitespace-nowrap">Iniciar Sesión</Link>
          </span>
          <span className="hidden sm:block">
            <Link to="/register-tenant">
              <Button className="whitespace-nowrap bg-primary hover:bg-primary/90 text-primary-foreground">Regístrate</Button>
            </Link>
          </span>
          {/* Mobile Navigation */}
          <span className="sm:hidden">
            <Link to="/auth" aria-label="Iniciar Sesión">
              <Button variant="ghost" size="icon"><LogIn className="h-5 w-5" /></Button>
            </Link>
          </span>
          <span className="sm:hidden">
            <Link to="/register-tenant" aria-label="Regístrate">
              <Button variant="ghost" size="icon"><UserPlus className="h-5 w-5" /></Button>
            </Link>
          </span>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary to-teal-900 text-white pt-20 pb-16 md:pb-24 px-4 text-center overflow-hidden">
        <div className="relative z-10 max-w-4xl mx-auto">
          <h1 className="text-5xl font-extrabold mb-6 leading-tight">Potencia el Talento de tu Empresa con <span className="text-accent">NexuHR</span></h1>
          <p className="text-xl mb-8 opacity-90">La plataforma integral de Recursos Humanos diseñada para simplificar tu gestión, centralizar la nómina y mantener a tu equipo conectado y feliz.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-16">
            <Link to="/register-tenant">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-lg px-8 py-3 rounded-full shadow-lg">Comienza Ahora</Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="text-accent border-accent hover:bg-accent hover:text-accent-foreground font-bold text-lg px-8 py-3 rounded-full">Iniciar Sesión</Button>
            </Link>
          </div>
        </div>
        
        {/* Mockups Showcase */}
        <div className="relative z-20 max-w-5xl mx-auto flex justify-center items-end gap-6 -mb-24 md:-mb-40 px-4">
          {/* Desktop Mockup */}
          <div className="relative hidden md:block rounded-xl overflow-hidden shadow-2xl border border-white/20 w-[800px]">
            <img src="/nexuhr-desktop.jpg" alt="NexuHR Desktop Dashboard" className="w-full h-auto object-cover" />
          </div>
          {/* Mobile Mockup */}
          <div className="relative md:absolute md:-right-8 md:-bottom-12 rounded-[2rem] overflow-hidden shadow-2xl border-[6px] border-gray-900 w-[240px] bg-black mx-auto">
            <img src="/nexuhr-mobile.jpg" alt="NexuHR Mobile App" className="w-full h-auto object-cover" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="pt-32 md:pt-48 pb-20 px-4 bg-gray-50 relative z-10">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12 text-primary">Herramientas que Revolucionan tu Gestión</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={Users} 
              title="Gestión de Empleados" 
              description="Centraliza la información de tu equipo, contratos, documentos y datos personales en un solo lugar seguro."
            />
            <FeatureCard 
              icon={Activity} 
              title="Nómina e Incapacidades" 
              description="Administra los desprendibles de pago y lleva un control riguroso de ausencias y descansos médicos."
            />
            <FeatureCard 
              icon={FileText} 
              title="Evaluaciones de Desempeño" 
              description="Configura y aplica evaluaciones periódicas para medir y potenciar el rendimiento de tus colaboradores."
            />
            <FeatureCard 
              icon={Stethoscope} 
              title="SST y Exámenes" 
              description="Mantén al día el Sistema de Seguridad y Salud en el Trabajo, con registro de exámenes médicos y vigilancias."
            />
            <FeatureCard 
              icon={CheckCircle} 
              title="Portal del Empleado" 
              description="Tus colaboradores pueden autogestionar la firma de documentos, consultar sus pagos y realizar capacitaciones."
            />
            <FeatureCard 
              icon={FileText} 
              title="Control de Dotaciones" 
              description="Gestiona la entrega de uniformes, herramientas y elementos de protección personal fácilmente."
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 bg-gray-100">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12 text-primary">Planes Simples y Transparentes</h2>
          
          <div className="flex justify-center mb-8 space-x-4">
            {isLoadingCountries ? (
              <p>Cargando países...</p>
            ) : (
              publicData?.countries
                .slice()
                .sort((a, b) => a.iso_code.localeCompare(b.iso_code))
                .map(country => (
                  <button 
                    key={country.id} 
                    onClick={() => setSelectedCountryId(country.id)}
                    className={`rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${selectedCountryId === country.id ? 'ring-2 ring-primary' : ''}`}
                    title={country.name}
                  >
                    <img 
                      src={`https://flagcdn.com/w40/${country.iso_code.toLowerCase()}.png`} 
                      alt={`Bandera de ${country.name}`}
                      className="w-10 h-auto rounded-full shadow-sm"
                    />
                  </button>
                ))
            )}
          </div>

          {isLoadingPlans ? (
            <div className="text-center py-10">
              <p>Cargando planes...</p>
            </div>
          ) : selectedCountryId && sortedPlans.length > 0 ? (
            <div className="relative group">
              {/* Left Arrow */}
              <button 
                onClick={scrollLeft}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-12 z-10 bg-white/90 border border-gray-200 text-gray-700 hover:text-primary hover:bg-white shadow-xl rounded-full p-3 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0 focus:outline-none"
                aria-label="Anterior"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              {/* Right Arrow */}
              <button 
                onClick={scrollRight}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-12 z-10 bg-white/90 border border-gray-200 text-gray-700 hover:text-primary hover:bg-white shadow-xl rounded-full p-3 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0 focus:outline-none"
                aria-label="Siguiente"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              <div 
                ref={scrollRef}
                className="flex overflow-x-auto pb-8 -mx-4 px-4 md:mx-0 md:px-0 gap-6 snap-x snap-mandatory scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              >
                {sortedPlans.map(plan => (
                  <div key={plan.plan_id} className="bg-white rounded-xl shadow-lg p-8 text-center flex flex-col flex-none w-[85vw] max-w-[320px] snap-center shrink-0">
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">{plan.plan_name}</h3>
                  <p className="text-gray-600 mb-6 flex-grow">{plan.plan_description}</p>
                  <div className="text-5xl font-extrabold text-primary mb-2">
                    {formatPrice(plan.calculated_price, plan.currency_code)}
                  </div>
                  {plan.billing_frequency_months > 1 ? (
                    <p className="text-gray-500 text-sm mb-6">Equivale a {formatPrice(plan.calculated_price / plan.billing_frequency_months, plan.currency_code)}/mes</p>
                  ) : (
                    <div className="h-6 mb-6"></div>
                  )}
                  
                  <ul className="text-gray-700 space-y-3 mb-8 text-left">
                    {plan.plan_features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-primary mr-2 flex-shrink-0 mt-0.5" /> 
                        <span>{feature}</span>
                      </li>
                    ))}
                    {plan.included_einvoices > 0 && (
                      <li className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-primary mr-2 flex-shrink-0 mt-0.5" /> 
                        <span>{plan.included_einvoices} Documentos de Soporte</span>
                      </li>
                    )}
                  </ul>
                  <div className="mt-auto">
                    <Link to="/register-tenant">
                      <Button size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">Elegir Plan</Button>
                    </Link>
                  </div>
                </div>
              ))}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-600 py-10">
              <p>Selecciona un país para ver los planes y precios disponibles.</p>
            </div>
          )}
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="bg-primary text-primary-foreground py-20 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold mb-6">Moderniza la Gestión de tu Empresa Hoy</h2>
          <p className="text-xl mb-8 opacity-90">Mejora la experiencia de tus empleados y ahorra tiempo en procesos administrativos con NexuHR.</p>
          <Link to="/register-tenant">
            <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-lg px-10 py-4 rounded-full shadow-lg">Crear mi Cuenta</Button>
          </Link>
        </div>
      </section>

      {/* Contact Section */}
      <section className="bg-slate-50 py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center text-slate-900">Contáctanos</h2>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <form action="https://api.web3forms.com/submit" method="POST" className="space-y-6">
              {/* Token de Web3Forms */}
              <input type="hidden" name="access_key" value="f53316b4-ff08-4977-91cf-319f79dea200" />
              <input type="hidden" name="subject" value="Nuevo contacto desde NexuHR" />
              <input type="hidden" name="from_name" value="NexuHR Contacto" />
              <input type="checkbox" name="botcheck" className="hidden" style={{ display: 'none' }} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">Nombre Completo</label>
                  <input type="text" id="name" name="name" required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary" />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">Correo Electrónico</label>
                  <input type="email" id="email" name="email" required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary" />
                </div>
              </div>
              
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-slate-700 mb-2">Empresa</label>
                <input type="text" id="company" name="company" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary" />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-2">Mensaje</label>
                <textarea id="message" name="message" rows={4} required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary"></textarea>
              </div>

              <div className="text-center">
                <Button type="submit" size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-10">
                  Enviar Mensaje
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-4 text-center text-sm">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <p>&copy; {new Date().getFullYear()} Facil Apps Online - NexuHR. Todos los derechos reservados.</p>
          <nav className="space-x-4">
            <Link to="/politicas-privacidad" className="hover:text-white cursor-pointer">Política de Privacidad</Link>
            <Link to="/terminos-servicio" className="hover:text-white cursor-pointer">Términos de Servicio</Link>
          </nav>
        </div>
      </footer>

      {/* WhatsApp Floating Button */}
      <a 
        href="https://wa.me/573117208085?text=Hola,%20quisiera%20m%C3%A1s%20informaci%C3%B3n%20sobre%20NexuHR" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 bg-[#25D366] text-white p-4 rounded-full shadow-lg hover:scale-110 transition-transform z-50 flex items-center justify-center"
        aria-label="Contactar por WhatsApp"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 16 16">
          <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
        </svg>
      </a>
    </motion.div>
  );
};
