export type PackageId = '99' | '349' | '699';

export type PropertyCategory = 'Haus' | 'Wohnung';

export interface FormData {
  paket: PackageId | '';
  kundeVorname: string;
  kundeNachname: string;
  kundeGeburtsdatum: string;
  kundeAdresseAbweichend: boolean;
  kundeStrasse: string;
  kundeHausnummer: string;
  kundePlz: string;
  kundeStadt: string;
  kategorie: PropertyCategory;
  untertyp: string;
  strasse: string;
  hausnummer: string;
  plz: string;
  stadt: string;
  bundesland: string;
  wohnflaeche: string;
  grundstueck: string;
  bodenwert: string;
  bodenwertStichtag: string;
  bodenwertNutzung: string;
  bodenwertQuelle: string;
  geoLat: string;
  geoLon: string;
  mea: string;
  baujahr: string;
  baujahrHeizung: string;
  befeuerung: string;
  pvAnlage: boolean;
  pvBaujahr: string;
  pvGroesse: string;
  kuecheVorhanden: boolean;
  kuecheBaujahr: string;
  fussboeden: string[];
  badAusstattung: string[];
  modernisierungFenster: string[];
  modernisierungElektrik: string[];
  modernisierungDaemmung: string[];
  rolle: string;
  agb: boolean;
  eigentuemerVersicherung: boolean;
  besonderheiten: string;
  miete: string;
  mieteQuelle: string;
  mieteStand: string;
  zustandElektrik: number;
  zustandDaemmung: number;
  zustandFenster: number;
  zustandLeitungen: number;
}

export interface ValuationResult {
  finalerMarktwert: number;
  ertragswert: number;
  sachwert: number;
  rnd: number;
  trend: string;
  miete: number;
  modernisierungsVorteil: number;
  ortsName: string;
  bodenwert: number;
  gebaeudesachwert: number;
  reinertrag: number;
  vV: number;
  regionFaktor: number;
  pvWert: number;
}

export interface IntegrationStatus {
  supabaseReady: boolean;
  aiReady: boolean;
  stripeLinksReady: boolean;
  stripeVerificationReady: boolean;
  usesStaticRegionalData: boolean;
}

export const createInitialFormData = (): FormData => ({
  paket: '',
  kundeVorname: '',
  kundeNachname: '',
  kundeGeburtsdatum: '',
  kundeAdresseAbweichend: false,
  kundeStrasse: '',
  kundeHausnummer: '',
  kundePlz: '',
  kundeStadt: '',
  kategorie: 'Haus',
  untertyp: 'Einfamilienhaus (freistehend)',
  strasse: '',
  hausnummer: '',
  plz: '',
  stadt: '',
  bundesland: '',
  wohnflaeche: '',
  grundstueck: '',
  bodenwert: '',
  bodenwertStichtag: '',
  bodenwertNutzung: '',
  bodenwertQuelle: '',
  geoLat: '',
  geoLon: '',
  mea: '',
  baujahr: '',
  baujahrHeizung: '',
  befeuerung: 'Gas-Zentralheizung',
  pvAnlage: false,
  pvBaujahr: '',
  pvGroesse: '',
  kuecheVorhanden: false,
  kuecheBaujahr: '',
  fussboeden: [],
  badAusstattung: [],
  modernisierungFenster: [],
  modernisierungElektrik: [],
  modernisierungDaemmung: [],
  rolle: '',
  agb: false,
  eigentuemerVersicherung: false,
  besonderheiten: '',
  miete: '',
  mieteQuelle: '',
  mieteStand: '',
  zustandElektrik: 3,
  zustandDaemmung: 3,
  zustandFenster: 3,
  zustandLeitungen: 3,
});
