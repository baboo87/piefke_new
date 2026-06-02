import { LOCAL_STORAGE_KEY } from '../config';
import type { FormData } from '../types';

export const persistCheckoutDraft = (formData: FormData) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(formData));
};

export const applySuccessParams = (mode: 'simulated' | 'stripe') => {
  const url = new URL(window.location.href);
  url.searchParams.set('success', 'true');
  url.searchParams.set('mode', mode);
  window.history.replaceState({}, '', url.toString());
};

export const clearSuccessParams = () => {
  const url = new URL(window.location.href);
  url.searchParams.delete('success');
  url.searchParams.delete('mode');
  window.history.replaceState({}, '', url.toString());
};
