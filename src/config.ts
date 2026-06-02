import type { IntegrationStatus, PackageId } from './types';

const DEFAULT_STRIPE_LINKS: Record<PackageId, string> = {
  '99': 'https://buy.stripe.com/fZufZ90I09cg8n1apO2ZO00',
  '349': 'https://buy.stripe.com/3cI3cn2Q89cg7iX2Xm2ZO01',
  '699': 'https://buy.stripe.com/4gM7sDaiA7487iX1Ti2ZO02',
};

const withSuccessUrl = (baseUrl: string) => {
  const url = new URL(baseUrl);
  url.searchParams.set('success_url', `${window.location.origin}/?success=true`);
  return url.toString();
};

export const STRIPE_LINKS: Record<PackageId, string> = {
  '99': withSuccessUrl(import.meta.env.VITE_STRIPE_LINK_99 || DEFAULT_STRIPE_LINKS['99']),
  '349': withSuccessUrl(import.meta.env.VITE_STRIPE_LINK_349 || DEFAULT_STRIPE_LINKS['349']),
  '699': withSuccessUrl(import.meta.env.VITE_STRIPE_LINK_699 || DEFAULT_STRIPE_LINKS['699']),
};

export const LOCAL_STORAGE_KEY = 'kreisel_master_data';
export const SUPABASE_CHECKOUT_TABLE =
  import.meta.env.VITE_SUPABASE_CHECKOUT_TABLE || 'valuation_requests';
export const AI_ENDPOINT = import.meta.env.VITE_AI_API_URL || '/api/ai';
export const HAS_LOCAL_AI_ENDPOINT = import.meta.env.VITE_USE_LOCAL_AI_ENDPOINT === 'true';

export const INTEGRATION_STATUS: IntegrationStatus = {
  supabaseReady: Boolean(
    import.meta.env.VITE_SUPABASE_URL &&
      import.meta.env.VITE_SUPABASE_ANON_KEY &&
      SUPABASE_CHECKOUT_TABLE,
  ),
  aiReady: Boolean(import.meta.env.VITE_AI_API_URL || HAS_LOCAL_AI_ENDPOINT),
  stripeLinksReady: Object.values(STRIPE_LINKS).every(Boolean),
  stripeVerificationReady: Boolean(import.meta.env.VITE_STRIPE_SESSION_STATUS_ENDPOINT),
  usesStaticRegionalData: false,
};
