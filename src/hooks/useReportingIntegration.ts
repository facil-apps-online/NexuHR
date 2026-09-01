import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface ReportingIntegration {
  apiUrl: string;
  apiKey: string;
  isConfigured: boolean;
}

/**
 * Hook to read the Reporting API integration from tenant_integrations
 * The integration must be configured by the admin in Settings → Integrations
 */
export function useReportingIntegration(): { data: ReportingIntegration | null; isLoading: boolean; error: Error | null } {
  const { profile } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["reporting-integration", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) {
        return null;
      }

      // Read from tenant_integrations where provider = 'reporting_api'
      const { data: integration, error: fetchError } = await supabase
        .from("tenant_integrations")
        .select("encrypted_credentials, nonce, is_active")
        .eq("tenant_id", profile.tenant_id)
        .eq("provider", "reporting_api")
        .eq("is_active", true)
        .single();

      if (fetchError || !integration) {
        return null;
      }

      // Decrypt the credentials using the encrypt-secret edge function
      // The encrypted_credentials contains: { apiUrl, apiKey }
      try {
        const { data: decryptedData, error: decryptError } = await supabase.functions.invoke(
          "decrypt-secret",
          {
            body: {
              encrypted: integration.encrypted_credentials,
              nonce: integration.nonce,
            },
          }
        );

        if (decryptError || !decryptedData?.decryptedText) {
          return null;
        }

        const credentials = JSON.parse(decryptedData.decryptedText);

        return {
          apiUrl: credentials.apiUrl || "",
          apiKey: credentials.apiKey || "",
          isConfigured: true,
        };
      } catch {
        return null;
      }
    },
    enabled: !!profile?.tenant_id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return {
    data: data ?? null,
    isLoading,
    error: error as Error | null,
  };
}

/**
 * Helper to save the Reporting API integration
 * This should be called from the admin settings page
 */
export async function saveReportingIntegration(
  tenantId: string,
  apiUrl: string,
  apiKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Encrypt the credentials
    const { data: encryptedData, error: encryptError } = await supabase.functions.invoke(
      "encrypt-secret",
      {
        body: {
          data: JSON.stringify({ apiUrl, apiKey }),
        },
      }
    );

    if (encryptError || !encryptedData) {
      return { success: false, error: "Failed to encrypt credentials" };
    }

    // Upsert into tenant_integrations
    const { error: upsertError } = await supabase
      .from("tenant_integrations")
      .upsert(
        {
          tenant_id: tenantId,
          platform_id: "00000000-0000-0000-0000-000000000000", // Will be set by RLS or trigger
          provider: "reporting_api",
          encrypted_credentials: encryptedData.encryptedData,
          nonce: encryptedData.nonce,
          is_active: true,
          environment: "production",
        },
        {
          onConflict: "tenant_id,provider,environment",
        }
      );

    if (upsertError) {
      return { success: false, error: upsertError.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
