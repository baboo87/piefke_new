import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CHECKOUT_TABLE } from '../config';
import type { FormData, ValuationResult } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

const toNumber = (value: string) => Number.parseFloat(value.replace(',', '.')) || 0;

export const isSupabaseConfigured = Boolean(supabase);

export const checkSupabaseConnection = async () => {
  if (!supabase) {
    return { connected: false as const, reason: 'Supabase ist nicht konfiguriert.' };
  }

  const { error } = await supabase
    .from(SUPABASE_CHECKOUT_TABLE)
    .select('id', { count: 'exact', head: true })
    .limit(1);

  if (error) {
    return { connected: false as const, reason: error.message };
  }

  return { connected: true as const };
};

export const saveValuationToSupabase = async ({
  formData,
  result,
  checkoutMode,
  aiSummary,
}: {
  formData: FormData;
  result: ValuationResult;
  checkoutMode: 'simulated' | 'stripe_redirect';
  aiSummary?: string | null;
}) => {
  if (!supabase) {
    return { saved: false as const, reason: 'Supabase ist nicht konfiguriert.' };
  }

  const basePayload = {
    paket: formData.paket || null,
    rolle: formData.rolle || null,
    plz: formData.plz || null,
    checkout_mode: checkoutMode,
    checkout_status: 'success_return',
    market_value: result.finalerMarktwert,
    ai_summary: aiSummary || null,
    form_data: formData,
    result_data: result,
  };

  const objectAddress = [formData.strasse, formData.hausnummer].filter(Boolean).join(' ').trim();

  const enhancedPayload = {
    ...basePayload,
    object_address: objectAddress || null,
    city: formData.stadt || null,
    state: formData.bundesland || null,
    property_category: formData.kategorie || null,
    property_subtype: formData.untertyp || null,
    living_area: toNumber(formData.wohnflaeche) || null,
    lot_area_share: toNumber(formData.grundstueck || formData.mea) || null,
    land_value_rate: toNumber(formData.bodenwert) || null,
    valuation_method: 'ertragswert',
    report_version: 'reference_v1',
    metadata: {
      generated_at: new Date().toISOString(),
      source: 'web-app',
    },
  };

  let { data, error } = await supabase
    .from(SUPABASE_CHECKOUT_TABLE)
    .insert(enhancedPayload)
    .select('id, created_at')
    .single();

  if (error) {
    const lowerError = error.message.toLowerCase();
    const canFallback = lowerError.includes('column') || lowerError.includes('schema cache');

    if (canFallback) {
      const fallbackInsert = await supabase
        .from(SUPABASE_CHECKOUT_TABLE)
        .insert(basePayload)
        .select('id, created_at')
        .single();
      data = fallbackInsert.data;
      error = fallbackInsert.error;
    }
  }

  if (error) {
    return { saved: false as const, reason: error.message };
  }

  return { saved: true as const, record: data };
};
