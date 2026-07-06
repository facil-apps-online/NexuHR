import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';
import ReCAPTCHA from 'react-google-recaptcha';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { usePublicRegistrationData } from '@/hooks/usePublicRegistrationData';
import { supabase, coreSupabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, Link } from 'react-router-dom';
import { AddressAutocompleteInput } from '@/components/AddressAutocompleteInput';
import { MapDisplay } from '@/components/MapDisplay';
import { PhoneInput } from '@/components/PhoneInput';
import Logo from '@/assets/nexurh-icon.svg';
import { CheckCircle, XCircle } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

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

const passwordSchema = z.string()
  .min(8, "Debe tener al menos 8 caracteres")
  .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
  .regex(/[a-z]/, "Debe contener al menos una minúscula")
  .regex(/[0-9]/, "Debe contener al menos un número")
  .regex(/[!@#$%^&*]/, "Debe contener al menos un carácter especial (!@#$%^&*)");

const createFormSchema = (userExists: boolean) => {
  const baseSchema = z.object({
    name: z.string().min(2, "El nombre comercial es requerido."),
    formatted_address: z.string().optional(),
    country_id: z.string().min(1, "El país es requerido."),
    default_language_code: z.string().min(1, "El idioma es requerido."),
    default_currency_id: z.string().min(1, "La moneda es requerida."),
    default_timezone: z.string().min(1, "La zona horaria es requerida."),
    contact_phone: z.string().min(1, "El teléfono de contacto es requerido."),
    whatsapp_phone: z.string().min(1, "El WhatsApp es requerido."),
    commercial_email: z.string().email("Debe ser un email válido."),
    legal_name: z.string().min(1, "La razón social es requerida."),
    tax_id: z.string().min(1, "El ID fiscal es requerido."),
    billing_address: z.string().min(1, "La dirección de facturación es requerida."),
    einvoicing_email: z.string().email("El email para facturación electrónica es requerido."),
    physical_address_line1: z.string().min(1, "La dirección es requerida."),
    physical_address_line2: z.string().optional(),
    physical_city: z.string().min(1, "La ciudad es requerida."),
    physical_state: z.string().min(1, "El estado/provincia es requerido."),
    physical_postal_code: z.string().min(1, "El código postal es requerido."),
    website: z.string().optional(),
    latitude: z.number().min(-90).max(90).nullable().refine(val => val !== null, { message: "La ubicación en el mapa es requerida." }),
    longitude: z.number().min(-180).max(180).nullable().refine(val => val !== null, { message: "La ubicación en el mapa es requerida." }),
    admin_email: z.string().email("El email del administrador es requerido."),
    recaptcha_token: z.string().min(1, "Por favor, completa el CAPTCHA."),
  });

  if (userExists) {
    return baseSchema;
  } else {
    return baseSchema.extend({
      admin_password: passwordSchema,
      admin_confirm_password: passwordSchema,
    }).refine(data => data.admin_password === data.admin_confirm_password, {
      message: "Las contraseñas no coinciden",
      path: ["admin_confirm_password"],
    });
  }
};

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

const PasswordRequirement = ({ isValid, text }: { isValid: boolean; text: string }) => (
  <div className={`flex items-center text-sm ${isValid ? 'text-green-600' : 'text-muted-foreground'}`}>
    {isValid ? <CheckCircle className="w-4 h-4 mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
    {text}
  </div>
);

export default function RegisterTenant() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const platformId = import.meta.env.VITE_PLATFORM_ID;
  const { data: publicData, isLoading, isError } = usePublicRegistrationData(platformId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usePhysicalAsBilling, setUsePhysicalAsBilling] = useState(true);
  const [userExists, setUserExists] = useState(false);
  const [isCheckingUser, setIsCheckingUser] = useState(false);

  const formSchema = useMemo(() => createFormSchema(userExists), [userExists]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      country_id: '',
      default_language_code: '',
      default_currency_id: '',
      default_timezone: '',
      contact_phone: '',
      whatsapp_phone: '',
      commercial_email: '',
      legal_name: '',
      tax_id: '',
      billing_address: '',
      einvoicing_email: '',
      physical_address_line1: '',
      physical_address_line2: '',
      physical_city: '',
      physical_state: '',
      physical_postal_code: '',
      website: '',
      latitude: null,
      longitude: null,
      admin_email: '',
      admin_password: '',
      admin_confirm_password: '',
      recaptcha_token: '',
    },
    mode: 'onChange',
  });

  const watchedCountryId = form.watch('country_id');
  const watchedLat = form.watch('latitude');
  const watchedLng = form.watch('longitude');
  const physicalAddressLine1 = form.watch('physical_address_line1');
  const physicalCity = form.watch('physical_city');
  const physicalState = form.watch('physical_state');
  const physicalPostalCode = form.watch('physical_postal_code');
  const adminEmail = form.watch('admin_email');
  const adminPassword = form.watch('admin_password');

  const passwordChecks = {
    length: (adminPassword || '').length >= 8,
    uppercase: /[A-Z]/.test(adminPassword),
    lowercase: /[a-z]/.test(adminPassword),
    number: /[0-9]/.test(adminPassword),
    specialChar: /[!@#$%^&*]/.test(adminPassword),
  };

  const checkUserExists = useCallback(async (email: string) => {
    if (!email || !z.string().email().safeParse(email).success) {
      setUserExists(false);
      return;
    }
    setIsCheckingUser(true);
    try {
      const platformId = import.meta.env.VITE_PLATFORM_ID;
      if (!platformId) throw new Error("Platform ID no está configurado.");

      const { data, error } = await supabase.functions.invoke('user-actions', {
        body: {
          action: 'check_user_exists_in_auth',
          payload: { email, platformId },
        },
      });

      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data.message);
      setUserExists(data.exists);
      if (data.exists) {
        form.clearErrors('admin_password');
        form.clearErrors('admin_confirm_password');
      }
    } catch (error) {
      console.error("Error checking user existence:", error);
    } finally {
      setIsCheckingUser(false);
    }
  }, [form]);

  const debouncedAdminEmail = useDebounce(adminEmail, 500);

  useEffect(() => {
    // Llama a checkUserExists solo cuando el email "debounceado" cambia.
    // La propia función checkUserExists ya valida si el email es válido.
    checkUserExists(debouncedAdminEmail);
  }, [debouncedAdminEmail, checkUserExists]);

  useEffect(() => {
    if (usePhysicalAsBilling) {
      const fullAddress = [physicalAddressLine1, physicalCity, physicalState, physicalPostalCode]
        .filter(Boolean)
        .join(', ');
      form.setValue('billing_address', fullAddress);
    } else {
      form.setValue('billing_address', '');
    }
  }, [usePhysicalAsBilling, physicalAddressLine1, physicalCity, physicalState, physicalPostalCode, form]);

  const countryOptions = useMemo(() => publicData?.countries.map(c => ({ value: c.id, label: c.name })) || [], [publicData]);
  const languageOptions = useMemo(() => publicData?.languages.map(l => ({ value: l.iso_code, label: l.name })) || [], [publicData]);
  const currencyOptions = useMemo(() => publicData?.currencies.map(c => ({ value: c.id, label: `${c.name} (${c.symbol})` })) || [], [publicData]);
  const timezoneOptions = useMemo(() => {
    if (!watchedCountryId || !publicData?.countries) return [];
    const selectedCountry = publicData.countries.find(c => c.id === watchedCountryId);
    return selectedCountry?.timezones?.map(tz => ({ value: tz, label: tz })) || [];
  }, [watchedCountryId, publicData]);

  const countryRestriction = useMemo(() => {
    if (!watchedCountryId || !publicData?.countries) return '';
    return publicData.countries.find(c => c.id === watchedCountryId)?.iso_code || '';
  }, [watchedCountryId, publicData]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          form.setValue('latitude', position.coords.latitude);
          form.setValue('longitude', position.coords.longitude);
        },
        () => {
          toast({ title: 'Aviso', description: 'No se pudo obtener tu ubicación actual. Por favor, búscala en el mapa.', variant: 'default' });
        }
      );
    }
  }, [toast, form]);

  useEffect(() => {
    if (watchedCountryId && publicData) {
      const country = publicData.countries.find(c => c.id === watchedCountryId);
      if (country) {
        if (country.default_localization_id) {
            const lang = publicData.languages.find(l => l.id === country.default_localization_id);
            if(lang) form.setValue('default_language_code', lang.iso_code);
        }
        if (country.default_currency_id) {
          form.setValue('default_currency_id', country.default_currency_id);
        }
        if (country.timezone) {
          form.setValue('default_timezone', country.timezone);
        }
      }
    }
  }, [watchedCountryId, publicData, form]);

  const handlePlaceSelected = (place: google.maps.places.PlaceResult) => {
    const get = (type: string) => place.address_components?.find(c => c.types.includes(type))?.long_name || '';
    form.setValue('physical_address_line1', `${get('route')} ${get('street_number')}`.trim());
    form.setValue('physical_city', get('locality'));
    form.setValue('physical_state', get('administrative_area_level_1'));
    form.setValue('physical_postal_code', get('postal_code'));
    if (place.geometry?.location) {
      form.setValue('latitude', place.geometry.location.lat(), { shouldValidate: true, shouldDirty: true, shouldTouch: true });
      form.setValue('longitude', place.geometry.location.lng(), { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    }
    if (place.formatted_address) {
      form.setValue('formatted_address', place.formatted_address, { shouldValidate: true });
    }
    const countryIso = place.address_components?.find(c => c.types.includes('country'))?.short_name;
    if (countryIso && publicData?.countries) {
      const selectedCountry = publicData.countries.find(c => c.iso_code === countryIso);
      if (selectedCountry) form.setValue('country_id', selectedCountry.id);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const platformId = import.meta.env.VITE_PLATFORM_ID;
      if (!platformId) throw new Error("Platform ID no está configurado.");

      // Primera llamada: Registrar el tenant en la base de datos Core
      const coreTenantPayload = {
        name: values.name,
        country_id: values.country_id,
        default_language_code: values.default_language_code,
        default_currency_id: values.default_currency_id,
        default_timezone: values.default_timezone,
        contact_phone: values.contact_phone,
        whatsapp_phone: values.whatsapp_phone,
        commercial_email: values.commercial_email,
        legal_name: values.legal_name,
        tax_id: values.tax_id,
        billing_address: values.billing_address,
        einvoicing_email: values.einvoicing_email,
        physical_address_line1: values.physical_address_line1,
        physical_address_line2: values.physical_address_line2,
        physical_city: values.physical_city,
        physical_state: values.physical_state,
        physical_postal_code: values.physical_postal_code,
        website: values.website,
        latitude: values.latitude,
        longitude: values.longitude,
        recaptcha_token: values.recaptcha_token, // Recaptcha se valida en Core
        platform_id: platformId, // Asegurarse que platform_id esté incluido en el payload de Core
      };

      // 'coreSupabase' es el cliente para el backend de Core
      const { data: coreResponse, error: coreError } = await coreSupabase.functions.invoke('register-tenant', { body: coreTenantPayload });
      
      if (coreError) throw new Error(coreError.message);
      if (!coreResponse.success) throw new Error(coreResponse.message);
      
      const newTenantId = coreResponse.tenant_id;
      if (!newTenantId) throw new Error('No se recibió el ID del tenant desde Core.');
      
      // Segunda llamada: Crear o vincular el usuario administrador en Services
      // 'supabase' es el cliente para el backend de Services
      const servicesUserPayload = {
        action: 'invite_or_assign_user_to_tenant',
        payload: {
          email: values.admin_email,
          password: userExists ? undefined : values.admin_password,
          tenantId: newTenantId,
          platformId: platformId,
          roleName: 'tenant_super_admin',
          branchName: 'Sucursal Principal',
          firstName: values.admin_email.split('@')[0], // Basic default
          lastName: '',
          tenantData: {
            ...coreTenantPayload, // Enviar todos los datos recolectados para el Core
            tenantId: newTenantId, // Asegurar IDs correctos
            platformId: platformId,
            address: values.formatted_address || [values.physical_address_line1, values.physical_city, values.physical_state].filter(Boolean).join(', '),
          }
        },
      };

      const { data: servicesResponse, error: servicesError } = await supabase.functions.invoke('user-actions', { body: servicesUserPayload });
      
      if (servicesError) throw new Error(servicesError.message);
      if (!servicesResponse.success) throw new Error(servicesResponse.message);

      toast({
        title: '¡Registro Exitoso!',
        description: 'Tu negocio y cuenta de administrador han sido registrados. Revisa tu email para verificar tu cuenta y luego inicia sesión.',
        variant: 'success',
      });
      navigate('/auth');
    } catch (error: any) {
      toast({ title: 'Error en el Registro', description: error.message, variant: 'destructive' });
      const recaptchaComponent = form.control.getFieldState('recaptcha_token');
      // @ts-ignore
      if (recaptchaComponent.ref?.current) {
        // @ts-ignore
        recaptchaComponent.ref.current.reset();
      }
      form.setValue('recaptcha_token', '');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div>Cargando...</div>;
  if (isError) return <div>Error al cargar los datos necesarios para el registro. Por favor, intenta de nuevo más tarde.</div>;
  if (!RECAPTCHA_SITE_KEY) return <div>Error de configuración: La clave de reCAPTCHA no está disponible.</div>

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="min-h-screen w-full bg-gradient-to-br from-primary to-teal-900 lg:h-screen lg:grid lg:grid-cols-2 lg:overflow-hidden"
    >
      {/* Columna Izquierda - Panel de Bienvenida */}
      <div className="hidden lg:absolute lg:left-0 lg:top-0 lg:w-1/2 lg:h-full lg:flex lg:flex-col lg:items-center lg:justify-center p-10 text-white bg-gradient-to-br from-primary to-teal-900">
        <img src={Logo} alt="NexuHR Logo" className="w-48 h-48 mb-6" />
        <h1 className="text-4xl font-bold text-center">Crea tu Espacio en NexuHR</h1>
        <p className="mt-4 text-lg text-center text-gray-300">Únete a nuestra plataforma y lleva la gestión de recursos humanos al siguiente nivel.</p>
      </div>

      {/* Columna Derecha - Formulario */}
      <div className="w-full lg:absolute lg:left-1/2 lg:w-1/2 lg:top-0 lg:h-full lg:overflow-y-auto flex items-start justify-center p-6 sm:p-12 lg:bg-background">
        <div className="w-full max-w-4xl">
          <div className="lg:hidden flex justify-center mb-8">
            <img src={Logo} alt="NexuHR Logo" className="w-36 h-36" />
          </div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <Card className="border-none shadow-none lg:border lg:shadow-sm">
                <CardHeader>
                  <CardTitle className="text-2xl">Completa tu Registro</CardTitle>
                  <CardDescription>
                    {isCheckingUser ? 'Verificando email...' : userExists
                      ? 'Este email ya está registrado. Se vinculará la cuenta existente a este nuevo negocio.'
                      : 'Crea una nueva cuenta de administrador para tu negocio.'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  
                  <div className="p-4 border rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">Información Principal</h3>
                    <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nombre Comercial</FormLabel><FormControl><Input {...field} autoComplete="off" /></FormControl><FormMessage /></FormItem>)} />
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">Configuración Regional</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Controller name="country_id" control={form.control} render={({ field }) => (<FormItem><FormLabel>País</FormLabel><SearchableSelect options={countryOptions} value={countryOptions.find(c => c.value === field.value) || null} onChange={(option) => field.onChange(option?.value)} placeholder="Selecciona" /></FormItem>)} />
                      <Controller name="default_language_code" control={form.control} render={({ field }) => (<FormItem><FormLabel>Idioma</FormLabel><SearchableSelect options={languageOptions} value={languageOptions.find(l => l.value === field.value) || null} onChange={(option) => field.onChange(option?.value)} placeholder="Selecciona" /></FormItem>)} />
                      <Controller name="default_currency_id" control={form.control} render={({ field }) => (<FormItem><FormLabel>Moneda</FormLabel><SearchableSelect options={currencyOptions} value={currencyOptions.find(c => c.value === field.value) || null} onChange={(option) => field.onChange(option?.value)} placeholder="Selecciona" /></FormItem>)} />
                      <Controller name="default_timezone" control={form.control} render={({ field }) => (<FormItem><FormLabel>Zona Horaria</FormLabel><SearchableSelect options={timezoneOptions} value={timezoneOptions.find(t => t.value === field.value) || null} onChange={(option) => field.onChange(option?.value)} placeholder="Selecciona" /></FormItem>)} />
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">Dirección Física y Sitio Web</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <FormItem><FormLabel>Buscar Dirección</FormLabel><FormControl><AddressAutocompleteInput onPlaceSelected={handlePlaceSelected} countryRestriction={countryRestriction} /></FormControl><FormMessage /></FormItem>
                        <FormField control={form.control} name="physical_address_line1" render={({ field }) => (<FormItem><FormLabel>Dirección</FormLabel><FormControl><Input {...field} autoComplete="off" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="physical_address_line2" render={({ field }) => (<FormItem><FormLabel>Dirección (Línea 2, Opcional)</FormLabel><FormControl><Input {...field} autoComplete="off" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="physical_city" render={({ field }) => (<FormItem><FormLabel>Ciudad</FormLabel><FormControl><Input {...field} autoComplete="off" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="physical_state" render={({ field }) => (<FormItem><FormLabel>Estado/Provincia</FormLabel><FormControl><Input {...field} autoComplete="off" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="physical_postal_code" render={({ field }) => (<FormItem><FormLabel>Código Postal</FormLabel><FormControl><Input {...field} autoComplete="off" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="website" render={({ field }) => (<FormItem><FormLabel>Sitio Web (Opcional)</FormLabel><FormControl><Input {...field} autoComplete="off" /></FormControl><FormMessage /></FormItem>)} />
                      </div>
                      {watchedLat !== null && watchedLng !== null && (<div className="w-full h-full min-h-[300px] rounded-lg overflow-hidden"><MapDisplay latitude={watchedLat} longitude={watchedLng} /></div>)}
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">Información de Contacto y Fiscal</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="contact_phone" render={({ field }) => (<FormItem><FormLabel>Teléfono</FormLabel><FormControl><PhoneInput {...field} defaultCountryIsoCode={countryRestriction} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="whatsapp_phone" render={({ field }) => (<FormItem><FormLabel>WhatsApp</FormLabel><FormControl><PhoneInput {...field} defaultCountryIsoCode={countryRestriction} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="commercial_email" render={({ field }) => (<FormItem><FormLabel>Email Comercial</FormLabel><FormControl><Input type="email" {...field} autoComplete="off" /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="legal_name" render={({ field }) => (<FormItem><FormLabel>Razón Social</FormLabel><FormControl><Input {...field} autoComplete="off" /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="tax_id" render={({ field }) => (<FormItem><FormLabel>ID Fiscal</FormLabel><FormControl><Input {...field} autoComplete="off" /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="einvoicing_email" render={({ field }) => (<FormItem><FormLabel>Email Fact. Electrónica</FormLabel><FormControl><Input type="email" {...field} autoComplete="off" /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                    <div className="flex items-center space-x-2 mt-4">
                      <Checkbox id="use-physical-address" checked={usePhysicalAsBilling} onCheckedChange={(checked) => setUsePhysicalAsBilling(Boolean(checked))} />
                      <label htmlFor="use-physical-address" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Usar la dirección física como dirección de facturación
                      </label>
                    </div>
                    {!usePhysicalAsBilling && (
                      <div className="mt-4">
                        <FormField control={form.control} name="billing_address" render={({ field }) => (<FormItem><FormLabel>Dirección de Facturación</FormLabel><FormControl><Input {...field} autoComplete="off" /></FormControl><FormMessage /></FormItem>)} />
                      </div>
                    )}
                  </div>

                  <div className="p-4 border rounded-lg bg-primary/10 border-primary/20">
                    <h3 className="text-lg font-semibold mb-4 text-primary">Crea tu Cuenta de Administrador</h3>
                    <p className="text-sm text-muted-foreground mb-4">Estos serán tus datos para iniciar sesión en la plataforma.</p>
                    <div className="mb-6">
                        <FormField control={form.control} name="admin_email" render={({ field }) => (<FormItem><FormLabel>Email de Administrador</FormLabel><FormControl><Input type="email" {...field} autoComplete="off" /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                    {!userExists && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                              <FormField control={form.control} name="admin_password" render={({ field }) => (<FormItem><FormLabel>Contraseña</FormLabel><FormControl><Input type="password" {...field} autoComplete="new-password" /></FormControl><FormMessage /></FormItem>)} />
                              <FormField control={form.control} name="admin_confirm_password" render={({ field }) => (<FormItem><FormLabel>Confirmar Contraseña</FormLabel><FormControl><Input type="password" {...field} autoComplete="new-password" /></FormControl><FormMessage /></FormItem>)} />
                          </div>
                          <div className="space-y-2 pt-2 text-sm">
                              <p className="font-semibold mb-2">La contraseña debe contener:</p>
                              <PasswordRequirement isValid={passwordChecks.length} text="Al menos 8 caracteres" />
                              <PasswordRequirement isValid={passwordChecks.uppercase} text="Al menos una letra mayúscula" />
                              <PasswordRequirement isValid={passwordChecks.lowercase} text="Al menos una letra minúscula" />
                              <PasswordRequirement isValid={passwordChecks.number} text="Al menos un número" />
                              <PasswordRequirement isValid={passwordChecks.specialChar} text="Al menos un carácter especial (!@#$%^&*)" />
                          </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-center justify-center space-y-4 pt-4">
                    <div className="max-w-full overflow-hidden flex justify-center">
                      <div className="scale-[0.77] sm:scale-100 origin-center">
                        <Controller name="recaptcha_token" control={form.control} render={({ field }) => (<ReCAPTCHA sitekey={RECAPTCHA_SITE_KEY} onChange={(token) => field.onChange(token || '')} />)} />
                      </div>
                    </div>
                    <FormField control={form.control} name="recaptcha_token" render={() => <FormMessage />} />
                  </div>

                  <div className="text-center pt-4">
                    <Button type="submit" size="lg" disabled={isSubmitting || isCheckingUser}>
                      {isSubmitting ? 'Registrando...' : (userExists ? 'Vincular Cuenta Existente' : 'Finalizar Registro y Crear Cuenta')}
                    </Button>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-center text-sm mt-6">
                  <p>¿Ya tienes una cuenta?&nbsp;
                    <Link to="/auth" className="font-semibold text-primary hover:underline">
                      Inicia Sesión Aquí
                    </Link>
                  </p>
                </CardFooter>
              </Card>
            </form>
          </Form>
        </div>
      </div>
    </motion.div>
  );
}