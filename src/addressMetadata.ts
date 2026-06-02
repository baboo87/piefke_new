type GermanCity = {
  name: string;
  postalCodes: string[];
  state: string;
};

type GermanMetadataModule = {
  ALL_STATES: string[];
  ALL_CITY_NAMES: string[];
  citiesByPostalCode: (postalCode: string) => GermanCity[];
  stateByCityName: (cityName: string) => string | null;
};

let metadataCache: GermanMetadataModule | null = null;

export const ensureGermanMetadata = async () => {
  if (metadataCache) {
    return metadataCache;
  }

  const importedModule = await import('german-metadata');
  metadataCache = (importedModule.default || importedModule) as unknown as GermanMetadataModule;
  return metadataCache;
};

export const getGermanStates = () => metadataCache?.ALL_STATES || [];

export const lookupCitiesByPostalCode = (postalCode: string) => {
  if (!metadataCache || postalCode.length !== 5) {
    return [];
  }

  return metadataCache.citiesByPostalCode(postalCode) || [];
};

export const lookupStateByCity = (cityName: string) => {
  if (!metadataCache || !cityName.trim()) {
    return null;
  }

  return metadataCache.stateByCityName(cityName) || null;
};

export const getCitySuggestions = (query: string, limit = 8) => {
  if (!metadataCache) {
    return [];
  }

  const normalized = query.trim().toLowerCase();
  if (normalized.length < 2) {
    return [];
  }

  return metadataCache.ALL_CITY_NAMES.filter((city) => city.toLowerCase().startsWith(normalized)).slice(0, limit);
};
