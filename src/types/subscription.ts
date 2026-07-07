export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  billing_frequency_months: number;
  display_order: number;
}

export interface PlanPricing {
  plan_id: string;
  country_id: string;
  price: number;
  currency_code: string;
  currency_symbol: string;
  billing_frequency_months: number;
  plan_name: string;
  plan_description: string;
}

export interface PublicSubscriptionPlan {
  plan_id: string;
  plan_name: string;
  plan_description: string;
  plan_features: string[];
  billing_frequency_months: number;
  price_id: string;
  calculated_price: number;
  calculated_extra_branch_price: number;
  calculated_promotional_price: number;
  currency_code: string;
  currency_symbol: string;
  base_price: number;
  active_branches_count: number;
  included_einvoices: number;
  extra_einvoice_price: number;
  extra_branch_bonus_einvoices: number;
}

export type SubscriptionStatus = 'activo' | 'gracia' | 'suspendido' | 'cancelado';

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  end_date: string | null;
  plan_name: string | null;
}

export interface UserSubscriptionPlan {
  plan_id: string;
  plan_name: string;
  plan_description: string;
  plan_features: string[];
  billing_frequency_months: number;
  price_id: string;
  calculated_price: number;
  calculated_extra_branch_price: number;
  calculated_promotional_price: number;
  currency_code: string;
  currency_symbol: string;
  base_price: number;
  active_branches_count: number;
}

export interface SubscriptionUsage {
  plan_name: string;
  billing_period_start: string;
  billing_period_end: string;
  usage: Array<{
    asset_name: string;
    asset_key: string;
    asset_description: string;
    asset_purpose_key?: string;
    used: number;
    limit: number;
    usedFormatted?: string;
    raw_used?: number;
  }>;
}
