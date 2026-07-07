import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DistributionListType = "general" | "cargo" | "departamento" | "personalizada";

export type DistributionList = {
  id: string;
  name: string;
  description: string | null;
  list_type: DistributionListType;
  target_value: string | null;
  active: boolean;
  created_at: string;
  members_count?: number;
};

export function useDistributionLists() {
  const queryClient = useQueryClient();

  const listsQuery = useQuery({
    queryKey: ["distribution_lists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("distribution_lists")
        .select(`
          *,
          distribution_list_members (count)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data as any[]).map((item) => ({
        ...item,
        members_count: item.distribution_list_members?.[0]?.count ?? 0,
      })) as DistributionList[];
    },
  });

  const createList = useMutation({
    mutationFn: async (newList: Partial<DistributionList>) => {
      const { data, error } = await supabase
        .from("distribution_lists")
        .insert([
          {
            name: newList.name,
            description: newList.description,
            list_type: newList.list_type,
            target_value: newList.target_value,
            active: newList.active ?? true,
          }
        ])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distribution_lists"] });
    },
  });

  const updateList = useMutation({
    mutationFn: async (updatedList: Partial<DistributionList> & { id: string }) => {
      const { data, error } = await supabase
        .from("distribution_lists")
        .update({
          name: updatedList.name,
          description: updatedList.description,
          list_type: updatedList.list_type,
          target_value: updatedList.target_value,
          active: updatedList.active,
        })
        .eq("id", updatedList.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distribution_lists"] });
    },
  });

  const deleteList = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("distribution_lists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distribution_lists"] });
    },
  });

  return {
    lists: listsQuery.data ?? [],
    isLoading: listsQuery.isLoading,
    createList,
    updateList,
    deleteList,
  };
}
