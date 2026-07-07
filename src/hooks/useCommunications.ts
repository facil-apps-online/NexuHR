import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Communication = {
  id: string;
  subject: string;
  content: string;
  communication_type: string;
  status: "borrador" | "enviado" | "leido";
  priority: string;
  created_at: string;
  sent_at?: string;
  recipients: string[] | null;
  reads_count?: number;
};

export function useCommunications() {
  return useQuery({
    queryKey: ["communications"],
    queryFn: async () => {
      // Get the communications and also fetch the count of reads using a subquery
      const { data, error } = await supabase
        .from("communications")
        .select(`
          id,
          subject,
          content,
          communication_type,
          status,
          priority,
          created_at,
          sent_at,
          recipients,
          communication_reads (count)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching communications:", error);
        throw error;
      }

      // Map the data to our type, extracting the reads count properly
      return (data as any[]).map((item) => ({
        ...item,
        reads_count: item.communication_reads?.[0]?.count ?? 0,
      })) as Communication[];
    },
  });
}
