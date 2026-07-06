import { useRef, useMemo } from "react";
import { useTenantSubscriptionPlans } from "@/hooks/useTenantSubscriptionPlans";
import { useAuth } from "@/hooks/useAuth";
import { useWompiCheckout } from "@/hooks/useWompiCheckout";
import { useSubscriptionUsage } from "@/hooks/useSubscriptionUsage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, AlertTriangle, Info, Users, Archive, HardDrive, FileText, Building2, ChevronLeft, ChevronRight } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

const formatPrice = (price: number, currencyCode: string) => {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: currencyCode || "COP",
    maximumFractionDigits: 0,
  }).format(price);
};

const formatStorage = (value: number) => `${value} GB`;

const assetIconByPurpose: Record<string, React.ElementType> = {
  storage: HardDrive,
  extra_branch: Building2,
  e_invoice: FileText,
};

const AssetIcon = ({ purposeKey, className = "h-5 w-5" }: { purposeKey?: string; className?: string }) => {
  const Icon = purposeKey ? assetIconByPurpose[purposeKey] : undefined;
  if (Icon) return <Icon className={className} />;
  return <Archive className={className} />;
};

const extractEmployeeLimit = (plan: any): number => {
  const featureStr = (plan.plan_features || []).join(" ").toLowerCase();
  const match = featureStr.match(/hasta\s*(\d+)\s*empleados?/);
  if (match) return parseInt(match[1], 10);
  const match2 = featureStr.match(/(\d+)\s*empleados?/);
  if (match2) return parseInt(match2[1], 10);
  const nameMatch = (plan.plan_name || "").match(/(\d+)/);
  if (nameMatch) return parseInt(nameMatch[1], 10);
  return plan.base_price || plan.calculated_price || 999999;
};

const CurrentSubscriptionStatus = () => {
  const { currentAssignment } = useAuth();
  const { data: subscription, isLoading } = useSubscriptionUsage(currentAssignment?.tenant_id, currentAssignment?.platform_id);

  if (isLoading) {
    return <Skeleton className="h-40 w-full mb-8" />;
  }

  if (!subscription || !subscription.plan_name) {
    return (
      <Card className="mb-8 bg-yellow-50 border-yellow-200">
        <CardHeader className="flex flex-row items-center gap-4">
          <AlertTriangle className="h-8 w-8 text-yellow-500" />
          <div>
            <CardTitle className="text-yellow-800">Sin Suscripción Activa</CardTitle>
            <CardDescription className="text-yellow-700">
              Por favor, elige uno de los siguientes planes para activar tu cuenta.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>
    );
  }

  const daysRemaining = subscription.billing_period_end ? differenceInDays(new Date(subscription.billing_period_end), new Date()) : null;

  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row items-center gap-4 bg-slate-50 rounded-t-lg">
        <Info className="h-8 w-8 text-slate-500" />
        <div>
          <CardTitle className="text-slate-800">Tu Plan Actual: {subscription.plan_name}</CardTitle>
          <CardDescription className="text-slate-700">
            {daysRemaining !== null
              ? `Tu ciclo de facturación termina en ${daysRemaining} días, el ${format(new Date(subscription.billing_period_end!), "d 'de' MMMM 'de' yyyy", { locale: es })}.`
              : "Ciclo de facturación activo."}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <h3 className="text-lg font-semibold mb-4 text-slate-700">Consumo del Periodo Actual</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subscription.usage.map(item => {
            const isStorage = item.asset_purpose_key === "storage";
            const displayValue = isStorage
              ? `${formatStorage(item.used)} / ${formatStorage(item.limit)}`
              : `${item.used}${item.limit > 0 ? ` / ${item.limit}` : ""}`;

            return (
              <Card key={item.asset_key}>
                <CardHeader className="flex flex-row items-center gap-2 py-3">
                  <AssetIcon purposeKey={item.asset_purpose_key} />
                  <CardTitle className="text-sm">{item.asset_name}</CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <p className="text-2xl font-bold">{displayValue}</p>
                  <p className="text-xs text-muted-foreground">{item.asset_description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export function SubscriptionSettings() {
  const { profile, currentAssignment } = useAuth();
  const { data: plans, isLoading: arePlansLoading } = useTenantSubscriptionPlans();
  const { toast } = useToast();
  const wompiCheckoutMutation = useWompiCheckout();
  const formRef = useRef<HTMLFormElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -360, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 360, behavior: "smooth" });
    }
  };

  const sortedPlans = useMemo(() => {
    return [...(plans || [])].sort((a, b) => extractEmployeeLimit(a) - extractEmployeeLimit(b));
  }, [plans]);

  const handleSelectPlan = async (plan: any) => {
    if (!currentAssignment?.tenant_id || !profile?.id) {
      toast({
        title: "Error de Contexto",
        description: "No se pudo obtener la información del usuario o del negocio. Recarga la página.",
        variant: "destructive",
      });
      return;
    }

    const checkoutRequest = {
      tenantId: currentAssignment.tenant_id,
      userId: profile.id,
      planId: plan.plan_id,
      redirectUrl: `${window.location.origin}/suscripcion?payment_status=success&plan_id=${plan.plan_id}`,
      currency: "COP",
    };

    wompiCheckoutMutation.mutate(checkoutRequest, {
      onSuccess: (checkoutData) => {
        if (formRef.current) {
          while (formRef.current.firstChild) {
            formRef.current.removeChild(formRef.current.firstChild);
          }
          Object.keys(checkoutData).forEach(key => {
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = key;
            input.value = checkoutData[key];
            formRef.current?.appendChild(input);
          });
          formRef.current.submit();
        }
      },
      onError: (error) => {
        toast({
          title: "Error al Iniciar Pago",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  if (arePlansLoading) {
    return (
      <div className="mt-4 flex gap-6 overflow-hidden">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="flex-none w-[85vw] max-w-[320px]">
            <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
            <CardContent><Skeleton className="h-10 w-1/3 mb-4" /></CardContent>
            <CardContent><Skeleton className="h-10 w-full" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <CurrentSubscriptionStatus />

      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-primary">Planes Disponibles</h2>
        <p className="text-muted-foreground">
          Actualiza o cambia tu plan para acceder a nuevas funcionalidades.
        </p>
      </div>

      {sortedPlans.length > 0 ? (
        <div className="relative group">
          <button
            onClick={scrollLeft}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-white/90 border border-gray-200 text-gray-700 hover:text-primary hover:bg-white shadow-xl rounded-full p-3 opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={scrollRight}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-white/90 border border-gray-200 text-gray-700 hover:text-primary hover:bg-white shadow-xl rounded-full p-3 opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none"
            aria-label="Siguiente"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          <div
            ref={scrollRef}
            className="flex overflow-x-auto pb-4 -mx-4 px-4 gap-6 snap-x snap-mandatory scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {sortedPlans.map(plan => (
              <div
                key={plan.plan_id}
                className="bg-white rounded-xl shadow-lg p-8 text-center flex flex-col flex-none w-[85vw] max-w-[320px] snap-center shrink-0"
              >
                <h3 className="text-2xl font-bold text-gray-800 mb-4">{plan.plan_name}</h3>
                <p className="text-gray-600 mb-6 flex-grow">{plan.plan_description}</p>
                <div className="text-5xl font-extrabold text-primary mb-2">
                  {formatPrice(plan.calculated_price, plan.currency_code)}
                </div>
                {plan.billing_frequency_months > 1 ? (
                  <p className="text-gray-500 text-sm mb-6">
                    Equivale a {formatPrice(plan.calculated_price / plan.billing_frequency_months, plan.currency_code)}/mes
                  </p>
                ) : (
                  <div className="h-6 mb-6" />
                )}

                <ul className="text-gray-700 space-y-3 mb-8 text-left">
                  {(plan.plan_features || []).map((feature: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto">
                  <Button
                    size="lg"
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={() => handleSelectPlan(plan)}
                    disabled={wompiCheckoutMutation.isPending}
                  >
                    {wompiCheckoutMutation.isPending ? "Procesando..." : "Seleccionar Plan"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-600 py-10">
          <p>No hay planes disponibles para tu país.</p>
        </div>
      )}

      {wompiCheckoutMutation.error && (
        <p className="text-sm text-red-500 text-center mt-4">{wompiCheckoutMutation.error.message}</p>
      )}

      <form ref={formRef} action="https://checkout.wompi.co/p/" method="GET" style={{ display: "none" }} />
    </>
  );
}
