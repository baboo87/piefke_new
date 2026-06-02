import React, { useEffect, useState } from 'react';
import {
  ensureGermanMetadata,
  getCitySuggestions,
  getGermanStates,
  lookupCitiesByPostalCode,
  lookupStateByCity,
} from './addressMetadata';
import { INTEGRATION_STATUS, LOCAL_STORAGE_KEY, STRIPE_LINKS } from './config';
import { PDFReport } from './pdfTemplates';
import { generateAiSummary } from './services/ai';
import { saveValuationToBackend } from './services/backend';
import { applySuccessParams, clearSuccessParams, persistCheckoutDraft } from './services/checkout';
import { lookupPropertyIntelligence, type PropertyIntelligenceResult } from './services/propertyIntelligence';
import { checkSupabaseConnection, isSupabaseConfigured, saveValuationToSupabase } from './services/supabase';
import { calculateMarketValue } from './valuationEngine';
import { createInitialFormData, type FormData, type PackageId } from './types';

const PETROL = '#1FBCB3';
const BG =
  'url("https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=80")';
const FONT = '"Avenir Light", Avenir, sans-serif';
const KREISEL_LOGO = '/assets/logo.jpg';
const PIEFKE_FUCHS = '/assets/piefke-fuchs.png';
const SHOW_PDF_DEBUG_PANELS = import.meta.env.VITE_SHOW_PDF_DEBUG_PANELS === 'true';

const BORIS_LINKS: Record<string, string> = {
  '01': 'https://www.boris.sachsen.de/',
  '10': 'https://www.berlin.de/gutachterausschuss/boris-berlin/',
  '20': 'https://www.geoportal-hamburg.de/boris-hh/',
  '30': 'https://www.immobilienmarkt.niedersachsen.de/',
  '31': 'https://www.immobilienmarkt.niedersachsen.de/',
  '40': 'https://www.boris.nrw.de/',
  '60': 'https://www.boris.hessen.de/',
  '70': 'https://www.gutachterausschuesse-bw.de/',
  '80': 'https://www.boris-bayern.de/',
};

const PACKAGE_CARDS: Array<{ id: PackageId; name: string; items: string[] }> = [
  {
    id: '99',
    name: 'KOMPAKT',
    items: ['PDF-Analyse nach ImmoWertV', 'Ertragswertberechnung', 'BORIS Bodenrichtwert-Check'],
  },
  {
    id: '349',
    name: 'PREMIUM',
    items: ['Alles aus KOMPAKT', '30 Min. Experten-Call', 'Modernisierungs-Check'],
  },
  {
    id: '699',
    name: 'PROFI',
    items: ['Vollständiges Wertermittlungs-Layout', 'Profi-Expose-Text', 'Eigentümer-Prüfung'],
  },
];

const createDemoFormData = (): FormData => ({
  ...createInitialFormData(),
  paket: '99',
  kundeVorname: 'Max',
  kundeNachname: 'Mustermann',
  kundeGeburtsdatum: '1984-06-15',
  kundeAdresseAbweichend: true,
  kundeStrasse: 'Kundenweg',
  kundeHausnummer: '3',
  kundePlz: '30161',
  kundeStadt: 'Hannover',
  strasse: 'Musterstraße',
  hausnummer: '12A',
  plz: '30159',
  stadt: 'Hannover',
  bundesland: 'Niedersachsen',
  wohnflaeche: '145',
  grundstueck: '520',
  mea: '520',
  bodenwert: '680',
  bodenwertStichtag: '2026-01-01',
  bodenwertNutzung: 'W MFH',
  bodenwertQuelle:
    'https://www.gis.nrw.de/arcgis/rest/services/immobilien/boris_nw_bodenrichtwerte_current/MapServer/5',
  miete: '12.70',
  mieteQuelle: 'Automatisches Mietniveau-Modell (Region + Lage + Bodenrichtwert)',
  mieteStand: '2026-01-01',
  geoLat: '52.3759',
  geoLon: '9.7320',
  baujahr: '2008',
  baujahrHeizung: '2022',
  befeuerung: 'Wärmepumpe',
  modernisierungFenster: ['3-fach Verglasung'],
  modernisierungElektrik: ['Smart Home', 'LAN-Verkabelung'],
  modernisierungDaemmung: ['WDVS', 'Oberste Geschossdecke'],
  pvAnlage: true,
  pvGroesse: '10.4',
  pvBaujahr: '2023',
  besonderheiten: 'Kamin, Terrasse, Gartenhaus',
  rolle: 'Eigentümer',
  agb: true,
  eigentuemerVersicherung: true,
});

const getBorisLink = (plz: string) =>
  BORIS_LINKS[plz.slice(0, 2)] || 'https://www.geoportal.de/themen/bodenrichtwerte.html';

const readStoredFormData = (): FormData | null => {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? ({ ...createInitialFormData(), ...JSON.parse(stored) } as FormData) : null;
  } catch {
    return null;
  }
};

const NoticeCard = ({
  title,
  text,
  tone = 'warning',
}: {
  title: string;
  text: string;
  tone?: 'warning' | 'info';
}) => (
  <div
    style={{
      padding: '16px 18px',
      borderRadius: '14px',
      border: `1px solid ${tone === 'warning' ? '#f0b15f' : PETROL}`,
      background: tone === 'warning' ? '#fff7eb' : '#f5fafa',
      color: '#333',
    }}
  >
    <strong style={{ display: 'block', marginBottom: '6px' }}>{title}</strong>
    <span style={{ fontSize: '13px', lineHeight: 1.5 }}>{text}</span>
  </div>
);

const PiefkeTip = ({ text }: { text: string }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      background: '#f5fafa',
      padding: '15px',
      borderRadius: '15px',
      border: `1px solid ${PETROL}`,
      marginBottom: '20px',
    }}
  >
    <img src={PIEFKE_FUCHS} style={{ height: '50px' }} alt="Piefke" />
    <span style={{ fontSize: '13px', fontStyle: 'italic', color: '#444' }}>
      <strong>Piefke-Profi-Tipp:</strong> {text}
    </span>
  </div>
);

const CheckBoxGroup = ({
  options,
  field,
  formData,
  setFormData,
}: {
  options: string[];
  field:
    | 'fussboeden'
    | 'badAusstattung'
    | 'modernisierungFenster'
    | 'modernisierungElektrik'
    | 'modernisierungDaemmung';
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
}) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
    {options.map((option) => (
      <label key={option} style={checkLabelS}>
        <input
          type="checkbox"
          checked={formData[field].includes(option)}
          onChange={(event) => {
            const nextValues = event.target.checked
              ? [...formData[field], option]
              : formData[field].filter((item) => item !== option);
            setFormData((current) => ({ ...current, [field]: nextValues }));
          }}
        />
        {option}
      </label>
    ))}
  </div>
);

export default function App() {
  const [view, setView] = useState<'landing' | 'config'>('landing');
  const [step, setStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMode, setSuccessMode] = useState<'simulated' | 'stripe_redirect'>('simulated');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [databaseMessage, setDatabaseMessage] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [addressDataReady, setAddressDataReady] = useState(false);
  const [addressHint, setAddressHint] = useState<string | null>(null);
  const [isAutoLoadingBodenwert, setIsAutoLoadingBodenwert] = useState(false);
  const [lastLookupKey, setLastLookupKey] = useState('');
  const [latestPropertyLookup, setLatestPropertyLookup] = useState<PropertyIntelligenceResult | null>(
    null,
  );
  const [formData, setFormData] = useState<FormData>(createInitialFormData);

  const persistSuccessRecord = async (
    nextFormData: FormData,
    checkoutMode: 'simulated' | 'stripe_redirect',
    nextAiSummary?: string | null,
  ) => {
    const result = calculateMarketValue(nextFormData);
    const statusMessages: string[] = [];

    try {
      const backendResult = await saveValuationToBackend({
        formData: nextFormData,
        result,
        checkoutMode,
        aiSummary: nextAiSummary,
        brwLookup: {
          lat: Number.parseFloat(nextFormData.geoLat || '0') || undefined,
          lon: Number.parseFloat(nextFormData.geoLon || '0') || undefined,
          bodenrichtwert: {
            bodenrichtwert: Number.parseFloat(nextFormData.bodenwert || '0') || 0,
            einheit: '€/m²',
            stichtag: nextFormData.bodenwertStichtag || '',
            nutzung: nextFormData.bodenwertNutzung || '',
            bundesland: nextFormData.bundesland || '',
            quelle: nextFormData.bodenwertQuelle || '',
          },
          mietniveau: {
            kaltmieteProM2: Number.parseFloat(nextFormData.miete || '0') || 0,
            bandbreiteVon: 0,
            bandbreiteBis: 0,
            ort: nextFormData.stadt || '',
            bundesland: nextFormData.bundesland || '',
            stand: nextFormData.mieteStand || '',
            quelle: nextFormData.mieteQuelle || '',
          },
          fetchedAt: latestPropertyLookup?.fetchedAt,
        },
      });
      statusMessages.push(
        backendResult.saved
          ? 'Bewertung wurde im lokalen Datenbank-Backend gespeichert.'
          : 'Backend-Speicherung wurde übersprungen.',
      );
    } catch (error) {
      statusMessages.push('Backend-Speicherung momentan nicht verfügbar.');
    }

    if (isSupabaseConfigured) {
      const saveResult = await saveValuationToSupabase({
        formData: nextFormData,
        result,
        checkoutMode,
        aiSummary: nextAiSummary,
      });
      statusMessages.push(
        saveResult.saved
          ? 'Bewertung wurde in Supabase gespeichert.'
          : `Supabase-Speicherung übersprungen: ${saveResult.reason}`,
      );
    }

    setDatabaseMessage(statusMessages.join(' '));
  };

  const showSuccessView = async (
    nextFormData: FormData,
    checkoutMode: 'simulated' | 'stripe_redirect',
  ) => {
    persistCheckoutDraft(nextFormData);
    applySuccessParams(checkoutMode === 'simulated' ? 'simulated' : 'stripe');
    setFormData(nextFormData);
    setAiSummary(null);
    setAiError(null);
    setSuccessMode(checkoutMode);
    setView('config');
    setIsSuccess(true);
    setStatusMessage(
      checkoutMode === 'simulated'
        ? 'Checkout erfolgreich simuliert. So sieht die PDF nach dem Success-Fall aus.'
        : 'Checkout-Rückkehr erkannt. Die PDF-Vorschau wurde geladen.',
    );

    await persistSuccessRecord(nextFormData, checkoutMode);
  };

  useEffect(() => {
    void ensureGermanMetadata().then(() => setAddressDataReady(true));
    if (!isSupabaseConfigured) {
      setDatabaseMessage('Lokales Datenbank-Backend aktiv.');
      return;
    }

    void checkSupabaseConnection().then((status) => {
      if (status.connected) {
        setDatabaseMessage('Supabase-Verbindung aktiv.');
      } else {
        setDatabaseMessage(`Supabase nicht erreichbar: ${status.reason}`);
      }
    });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') !== 'true') {
      return;
    }

    const saved = readStoredFormData();
    if (!saved) {
      setStatusMessage(
        'Checkout-Rückkehr erkannt, aber im Browser wurden keine Formulardaten gefunden.',
      );
      return;
    }

    const checkoutMode =
      params.get('mode') === 'simulated' ? 'simulated' : 'stripe_redirect';

    setFormData(saved);
    setView('config');
    setIsSuccess(true);
    setSuccessMode(checkoutMode);
    setAiSummary(null);
    setAiError(null);
    setStatusMessage('Checkout erfolgreich zurückgeleitet.');

    void persistSuccessRecord(saved, checkoutMode);
  }, []);

  useEffect(() => {
    if (view !== 'config' || step !== 1 || isSuccess) {
      return;
    }

    const lookupKey = [
      formData.strasse,
      formData.hausnummer,
      formData.plz,
      formData.stadt,
      formData.bundesland,
      formData.kategorie,
      formData.untertyp,
    ]
      .map((entry) => entry.trim().toLowerCase())
      .join('|');

    const hasRequiredAddress =
      formData.strasse.trim().length >= 2 &&
      formData.hausnummer.trim().length >= 1 &&
      formData.plz.replace(/\D/g, '').length === 5 &&
      formData.stadt.trim().length >= 2;

    if (!hasRequiredAddress || lookupKey === lastLookupKey) {
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      try {
        setIsAutoLoadingBodenwert(true);
        const lookup = await lookupPropertyIntelligence({
          strasse: formData.strasse,
          hausnummer: formData.hausnummer,
          plz: formData.plz,
          ort: formData.stadt,
          bundesland: formData.bundesland,
          wohnflaeche: Number.parseFloat(formData.wohnflaeche || '0') || 0,
          grundstuecksflaeche: Number.parseFloat(formData.grundstueck || formData.mea || '0') || 0,
          gebaeudetyp: formData.untertyp,
        });

        if (cancelled) {
          return;
        }

        setLastLookupKey(lookupKey);
        setLatestPropertyLookup(lookup);
        setFormData((current) => ({
          ...current,
          plz: lookup.address.plz || current.plz,
          stadt: lookup.address.ort || current.stadt,
          bundesland: lookup.address.bundesland || current.bundesland,
          bodenwert: Number.isFinite(lookup.bodenrichtwert.bodenrichtwert)
            ? String(lookup.bodenrichtwert.bodenrichtwert)
            : '',
          bodenwertStichtag: lookup.bodenrichtwert.stichtag || '',
          bodenwertNutzung: lookup.bodenrichtwert.nutzung || '',
          bodenwertQuelle: lookup.bodenrichtwert.quelle || '',
          miete:
            lookup.mietniveau && Number.isFinite(lookup.mietniveau.kaltmieteProM2)
              ? lookup.mietniveau.kaltmieteProM2.toFixed(2)
              : current.miete,
          mieteQuelle: lookup.mietniveau?.quelle || current.mieteQuelle,
          mieteStand: lookup.mietniveau?.stand || current.mieteStand,
          geoLat: lookup.geo.lat.toFixed(6),
          geoLon: lookup.geo.lon.toFixed(6),
        }));

        const mietniveauText =
          lookup.mietniveau && Number.isFinite(lookup.mietniveau.kaltmieteProM2)
            ? ` und Mietniveau ${lookup.mietniveau.kaltmieteProM2.toFixed(2)} EUR/m2`
            : '';
        setAddressHint(
          `Adresse erkannt. Bodenrichtwert ${lookup.bodenrichtwert.bodenrichtwert} ${lookup.bodenrichtwert.einheit}${mietniveauText} automatisch geladen.`,
        );
      } catch (error) {
        if (!cancelled) {
          setAddressHint(
            `Automatische Bodenrichtwert-Ermittlung momentan nicht verfügbar: ${
              error instanceof Error ? error.message : 'Unbekannter Fehler'
            }`,
          );
        }
      } finally {
        if (!cancelled) {
          setIsAutoLoadingBodenwert(false);
        }
      }
    }, 700);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [
    formData.strasse,
    formData.hausnummer,
    formData.plz,
    formData.stadt,
    formData.bundesland,
    formData.wohnflaeche,
    formData.grundstueck,
    formData.mea,
    formData.kategorie,
    formData.untertyp,
    isSuccess,
    lastLookupKey,
    step,
    view,
  ]);

  const updateFormData = (patch: Partial<FormData>) => {
    setFormData((current) => ({ ...current, ...patch }));
  };

  const resetAutoBodenwertFields = (): Partial<FormData> => ({
    bodenwert: '',
    bodenwertStichtag: '',
    bodenwertNutzung: '',
    bodenwertQuelle: '',
    miete: '',
    mieteQuelle: '',
    mieteStand: '',
    geoLat: '',
    geoLon: '',
  });

  const handlePostalCodeChange = (postalCode: string) => {
    const cleanedPostalCode = postalCode.replace(/\D/g, '').slice(0, 5);
    const matchedCities = lookupCitiesByPostalCode(cleanedPostalCode);
    setLastLookupKey('');
    setLatestPropertyLookup(null);

    if (matchedCities.length > 0) {
      const primaryCity = matchedCities[0];
      updateFormData({
        ...resetAutoBodenwertFields(),
        plz: cleanedPostalCode,
        stadt: primaryCity.name,
        bundesland: primaryCity.state,
      });

      setAddressHint(
        matchedCities.length > 1
          ? `PLZ erkannt. Es gibt ${matchedCities.length} mögliche Orte, aktuell ist ${primaryCity.name} vorausgefüllt.`
          : `PLZ erkannt: ${primaryCity.name}, ${primaryCity.state}.`,
      );
      return;
    }

    updateFormData({ ...resetAutoBodenwertFields(), plz: cleanedPostalCode });
    setAddressHint(
      cleanedPostalCode.length === 5
        ? 'Zu dieser PLZ wurde lokal kein Ort gefunden. Du kannst Ort und Bundesland manuell eintragen.'
        : null,
    );
  };

  const handleCityChange = (city: string) => {
    const detectedState = lookupStateByCity(city);
    setLastLookupKey('');
    setLatestPropertyLookup(null);
    updateFormData({
      ...resetAutoBodenwertFields(),
      stadt: city,
      bundesland: detectedState || formData.bundesland,
    });

    if (detectedState) {
      setAddressHint(`Ort erkannt: ${city} liegt in ${detectedState}.`);
    }
  };

  const handlePackageSelection = (paket: PackageId) => {
    updateFormData({ paket });
    setView('config');
  };

  const handleCheckout = () => {
    const stripeLink = STRIPE_LINKS[formData.paket || '99'];
    if (!stripeLink) {
      setStatusMessage('Kein Stripe-Link für dieses Paket konfiguriert.');
      return;
    }

    persistCheckoutDraft(formData);
    window.location.assign(stripeLink);
  };

  const handleSimulatedCheckout = async (sourceData = formData) => {
    await showSuccessView(sourceData, 'simulated');
  };

  const handleGenerateAi = async () => {
    try {
      setIsGeneratingAi(true);
      setAiError(null);
      const result = calculateMarketValue(formData);
      const text = await generateAiSummary({ formData, result });
      setAiSummary(text);
      await persistSuccessRecord(formData, successMode, text);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Die KI-Zusammenfassung konnte nicht erstellt werden.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const isCustomerDataComplete =
    formData.kundeVorname.trim().length >= 2 &&
    formData.kundeNachname.trim().length >= 2 &&
    formData.kundeGeburtsdatum.trim().length > 0;

  if (isSuccess) {
    const result = calculateMarketValue(formData);

    return (
      <div style={{ backgroundColor: '#555', minHeight: '100vh', padding: '20px' }}>
        <div
          className="pdf-non-print"
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 1000,
            display: 'flex',
            gap: '10px',
          }}
        >
          <button onClick={() => window.print()} style={{ ...btnS, width: 'auto', boxShadow: shadowS }}>
            Drucken / Als PDF speichern
          </button>
          <button
            onClick={() => {
              clearSuccessParams();
              setIsSuccess(false);
              setView('config');
            }}
            style={{ ...btnS, width: 'auto', background: '#666' }}
          >
            Zurück
          </button>
        </div>

        <div style={{ width: '210mm', margin: '0 auto', display: 'grid', gap: '16px' }}>
          {SHOW_PDF_DEBUG_PANELS && databaseMessage && (
            <div className="pdf-non-print">
              <NoticeCard title="Datenbankstatus" text={databaseMessage} tone="info" />
            </div>
          )}
          {SHOW_PDF_DEBUG_PANELS && aiError && (
            <div className="pdf-non-print">
              <NoticeCard title="KI-Fehler" text={aiError} />
            </div>
          )}
          {SHOW_PDF_DEBUG_PANELS && aiSummary && (
            <div className="pdf-non-print">
              <NoticeCard title="KI-Kurztext" text={aiSummary} tone="info" />
            </div>
          )}

          {SHOW_PDF_DEBUG_PANELS && (
            <div className="pdf-non-print" style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={() => void handleGenerateAi()}
                style={{ ...btnS, width: 'auto', minWidth: '260px' }}
                disabled={isGeneratingAi || !INTEGRATION_STATUS.aiReady}
              >
                {isGeneratingAi ? 'KI generiert...' : 'KI-Kurztext erzeugen'}
              </button>
            </div>
          )}

          <div
            className="pdf-preview-shell"
            style={{
              backgroundColor: 'white',
              boxShadow: '0 0 50px rgba(0,0,0,0.5)',
              borderRadius: '5px',
              overflow: 'hidden',
            }}
          >
            <PDFReport data={formData} result={result} />
          </div>
        </div>

        <style>{`
          @media print {
            button { display: none !important; }
            .pdf-non-print { display: none !important; }
            body { background: white !important; padding: 0 !important; }
            .pdf-preview-shell { box-shadow: none !important; border-radius: 0 !important; }
          }
        `}</style>
      </div>
    );
  }

  if (view === 'landing') {
    return (
      <div
        style={{
          backgroundImage: BG,
          backgroundSize: 'cover',
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          padding: '40px',
          fontFamily: FONT,
        }}
      >
        <div
          style={{
            background: 'white',
            borderRadius: '40px',
            padding: '60px',
            width: '100%',
            maxWidth: '1200px',
            textAlign: 'center',
          }}
        >
          <img src={KREISEL_LOGO} style={{ height: '80px', marginBottom: '20px' }} alt="Kreisel Immobilien" />
          <h1 style={{ fontWeight: 'lighter', letterSpacing: '2px', marginBottom: '16px' }}>
            Wählen Sie Ihr Analyse-Paket
          </h1>
          <p style={{ maxWidth: '760px', margin: '0 auto', color: '#5b6770', lineHeight: 1.6 }}>
            Professionelle Marktpreisermittlung mit strukturierter PDF-Ausgabe nach Ertragswertlogik,
            inklusive Standortdaten, Bodenwert und nachvollziehbaren Berechnungsschritten.
          </p>
          <div style={{ marginTop: '22px', display: 'flex', justifyContent: 'center' }}>
            <button onClick={() => void handleSimulatedCheckout(createDemoFormData())} style={{ ...btnS, width: 'auto' }}>
              DEMO-PDF OHNE ZAHLUNG ÖFFNEN
            </button>
          </div>

          {statusMessage && (
            <div style={{ marginTop: '24px' }}>
              <NoticeCard title="Status" text={statusMessage} />
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '30px',
              marginTop: '40px',
            }}
          >
            {PACKAGE_CARDS.map((paket) => (
              <div
                key={paket.id}
                style={{
                  border: `2px solid ${PETROL}`,
                  padding: '30px',
                  borderRadius: '25px',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <h3 style={{ color: PETROL, textAlign: 'center' }}>{paket.name}</h3>
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: '20px 0',
                    fontSize: '14px',
                    flexGrow: 1,
                    lineHeight: '2',
                  }}
                >
                  {paket.items.map((item) => (
                    <li key={item}>+ {item}</li>
                  ))}
                </ul>
                <div style={{ textAlign: 'center', fontSize: '28px', fontWeight: 'bold', margin: '20px 0' }}>
                  {paket.id} EUR
                </div>
                <button onClick={() => handlePackageSelection(paket.id)} style={btnS}>
                  PAKET WÄHLEN
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundImage: BG,
        backgroundSize: 'cover',
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '30px',
          padding: '40px',
          width: '100%',
          maxWidth: '760px',
          maxHeight: '92vh',
          overflowY: 'auto',
        }}
      >
        <img src={KREISEL_LOGO} style={{ height: '40px', marginBottom: '20px' }} alt="Kreisel Immobilien" />

        {statusMessage && (
          <div style={{ marginBottom: '20px' }}>
            <NoticeCard title="Status" text={statusMessage} />
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <PiefkeTip text="Eine vollständige Adresse macht die Wertermittlung sauberer und ist die Basis für spätere Adress- und Marktdaten-Integrationen." />
            <h3>1. Objekttyp und Lage</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              {(['Haus', 'Wohnung'] as const).map((category) => (
                <button
                  key={category}
                  onClick={() =>
                    updateFormData({
                      kategorie: category,
                      untertyp: category === 'Haus' ? 'Einfamilienhaus (freistehend)' : 'Etagenwohnung',
                    })
                  }
                  style={{
                    ...segmentedButtonS,
                    background: formData.kategorie === category ? PETROL : '#f0f0f0',
                    color: formData.kategorie === category ? 'white' : '#333',
                  }}
                >
                  {category}
                </button>
              ))}
            </div>

            <select
              style={inputS}
              value={formData.untertyp}
              onChange={(event) => updateFormData({ untertyp: event.target.value })}
            >
              {formData.kategorie === 'Haus' ? (
                <>
                  <option>Einfamilienhaus (freistehend)</option>
                  <option>Doppelhaushälfte</option>
                  <option>Reihenhaus</option>
                  <option>Mehrfamilienhaus</option>
                </>
              ) : (
                <>
                  <option>Etagenwohnung</option>
                  <option>Penthouse</option>
                  <option>Maisonette</option>
                  <option>Loft</option>
                  <option>Erdgeschosswohnung</option>
                </>
              )}
            </select>

            <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '5px 0 0' }}>Auftraggeber (Kunde)</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <input
                style={inputS}
                placeholder="Nachname"
                value={formData.kundeNachname}
                onChange={(event) => updateFormData({ kundeNachname: event.target.value })}
              />
              <input
                style={inputS}
                placeholder="Vorname"
                value={formData.kundeVorname}
                onChange={(event) => updateFormData({ kundeVorname: event.target.value })}
              />
            </div>

            <input
              style={inputS}
              type="date"
              value={formData.kundeGeburtsdatum}
              onChange={(event) => updateFormData({ kundeGeburtsdatum: event.target.value })}
            />

            <label style={{ ...consentLabelS, marginBottom: '0' }}>
              <input
                type="checkbox"
                checked={formData.kundeAdresseAbweichend}
                onChange={(event) => {
                  const checked = event.target.checked;
                  updateFormData({
                    kundeAdresseAbweichend: checked,
                    ...(checked
                      ? {}
                      : {
                          kundeStrasse: '',
                          kundeHausnummer: '',
                          kundePlz: '',
                          kundeStadt: '',
                        }),
                  });
                }}
              />
              Meine Anschrift als Auftraggeber weicht von der Objektadresse ab (optional).
            </label>

            {formData.kundeAdresseAbweichend && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 0.8fr', gap: '10px' }}>
                  <input
                    style={inputS}
                    placeholder="Kundenstraße"
                    value={formData.kundeStrasse}
                    onChange={(event) => updateFormData({ kundeStrasse: event.target.value })}
                  />
                  <input
                    style={inputS}
                    placeholder="Kunden-Hausnummer"
                    value={formData.kundeHausnummer}
                    onChange={(event) => updateFormData({ kundeHausnummer: event.target.value })}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: '10px' }}>
                  <input
                    style={inputS}
                    placeholder="Kunden-PLZ"
                    value={formData.kundePlz}
                    inputMode="numeric"
                    onChange={(event) =>
                      updateFormData({ kundePlz: event.target.value.replace(/\D/g, '').slice(0, 5) })
                    }
                  />
                  <input
                    style={inputS}
                    placeholder="Kunden-Ort / Stadt"
                    value={formData.kundeStadt}
                    onChange={(event) => updateFormData({ kundeStadt: event.target.value })}
                  />
                </div>
              </>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 0.8fr', gap: '10px' }}>
              <input
                style={inputS}
                placeholder="Strasse"
                value={formData.strasse}
                onChange={(event) => {
                  setLastLookupKey('');
                  setLatestPropertyLookup(null);
                  updateFormData({ ...resetAutoBodenwertFields(), strasse: event.target.value });
                }}
              />
              <input
                style={inputS}
                placeholder="Hausnummer"
                value={formData.hausnummer}
                onChange={(event) => {
                  setLastLookupKey('');
                  setLatestPropertyLookup(null);
                  updateFormData({ ...resetAutoBodenwertFields(), hausnummer: event.target.value });
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: '10px' }}>
              <input
                style={inputS}
                placeholder="PLZ"
                value={formData.plz}
                inputMode="numeric"
                onChange={(event) => handlePostalCodeChange(event.target.value)}
              />
              <div>
                <input
                  style={inputS}
                  list="city-suggestions"
                  placeholder="Ort / Stadt"
                  value={formData.stadt}
                  onChange={(event) => handleCityChange(event.target.value)}
                />
                <datalist id="city-suggestions">
                  {getCitySuggestions(formData.stadt).map((city) => (
                    <option key={city} value={city} />
                  ))}
                </datalist>
              </div>
            </div>

            <select
              style={inputS}
              value={formData.bundesland}
              onChange={(event) => {
                setLastLookupKey('');
                setLatestPropertyLookup(null);
                updateFormData({ ...resetAutoBodenwertFields(), bundesland: event.target.value });
              }}
            >
              <option value="">Bundesland wählen</option>
              {getGermanStates().map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>

            <div style={{ padding: '15px', background: '#f5fafa', borderRadius: '15px', border: `1px solid ${PETROL}` }}>
              <a
                href={getBorisLink(formData.plz)}
                target="_blank"
                rel="noreferrer"
                style={{ color: PETROL, fontSize: '12px', fontWeight: 'bold', textDecoration: 'none' }}
              >
                BORIS Bodenrichtwert öffnen
              </a>
              <input
                style={{ ...inputS, marginTop: '10px' }}
                placeholder="Bodenwert (EUR/m2)"
                type="number"
                value={formData.bodenwert}
                readOnly
              />
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#4b5563', lineHeight: 1.5 }}>
                {formData.bodenwertStichtag
                  ? `Stichtag: ${formData.bodenwertStichtag}${formData.bodenwertNutzung ? ` | Nutzung: ${formData.bodenwertNutzung}` : ''}`
                  : 'Bodenrichtwert wird automatisch aus BORIS-Daten geladen, sobald die Adresse vollständig ist.'}
                <br />
                {formData.miete
                  ? `Mietniveau: ${formData.miete} EUR/m2${formData.mieteStand ? ` | Stand: ${formData.mieteStand}` : ''}`
                  : 'Mietniveau wird nach vollständiger Adresse automatisch ermittelt.'}
              </div>
            </div>

            {!addressDataReady && (
              <NoticeCard
                title="Adressdaten laden"
                text="Die deutsche PLZ-/Ortsliste wird gerade geladen. Danach funktionieren Autofill und Ortsvorschläge."
                tone="info"
              />
            )}
            {isAutoLoadingBodenwert && (
              <NoticeCard
                title="Bodenrichtwert wird geladen"
                text="Adresse wird geokodiert und passender BORIS-Datensatz automatisch abgerufen."
                tone="info"
              />
            )}
            {addressHint && <NoticeCard title="Adresshilfe" text={addressHint} tone="info" />}
            <NoticeCard
              title="Straßenvorschläge"
              text="PLZ, Ort und Bundesland werden lokal unterstützt. Für den Bodenrichtwert wird zusätzlich ein Geocoding- und BORIS-Abruf im Hintergrund verwendet."
              tone="info"
            />

            <input
              style={inputS}
              placeholder="Wohnfläche m2"
              type="number"
              value={formData.wohnflaeche}
              onChange={(event) => updateFormData({ wohnflaeche: event.target.value })}
            />
            <input
              style={inputS}
              placeholder={formData.kategorie === 'Haus' ? 'Grundstück m2' : 'MEA / Anteil'}
              type="number"
              value={formData.grundstueck}
              onChange={(event) => updateFormData({ grundstueck: event.target.value, mea: event.target.value })}
            />

            <input
              style={inputS}
              placeholder="Baujahr Gebäude"
              type="number"
              value={formData.baujahr}
              onChange={(event) => updateFormData({ baujahr: event.target.value })}
            />

            <button
              onClick={() => setStep(2)}
              style={{ ...btnS, opacity: isCustomerDataComplete ? 1 : 0.6 }}
              disabled={!isCustomerDataComplete}
            >
              WEITER
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <PiefkeTip text="Ausstattungsmerkmale beeinflussen den Ertrags- und Sachwert deutlich." />
            <h3>2. Ausstattung und Innenräume</h3>
            <p style={{ fontSize: '14px', fontWeight: 'bold' }}>Bodenbeläge</p>
            <CheckBoxGroup
              field="fussboeden"
              options={['Echtparkett', 'Laminat', 'Fliesen', 'Vinyl', 'Teppich', 'Steinboden']}
              formData={formData}
              setFormData={setFormData}
            />
            <p style={{ fontSize: '14px', fontWeight: 'bold' }}>Bad und Sanitär</p>
            <CheckBoxGroup
              field="badAusstattung"
              options={['Gäste-WC', 'Master-Bad', 'Tageslichtbad', 'Dusche', 'Badewanne', 'Sauna/Wellness']}
              formData={formData}
              setFormData={setFormData}
            />
            <button onClick={() => setStep(3)} style={btnS}>
              WEITER
            </button>
            <button onClick={() => setStep(1)} style={backS}>
              ZURÜCK
            </button>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <PiefkeTip text="Technik, Fenster und Dämmung wirken direkt auf Restnutzungsdauer und Energiebonus." />
            <h3>3. Technik und Modernisierung</h3>

            <p style={{ fontSize: '14px', fontWeight: 'bold' }}>Fenster</p>
            <CheckBoxGroup
              field="modernisierungFenster"
              options={['2-fach Verglasung', '3-fach Verglasung', 'Schallschutzfenster', 'Dachfenster neu']}
              formData={formData}
              setFormData={setFormData}
            />

            <p style={{ fontSize: '14px', fontWeight: 'bold' }}>Elektrik</p>
            <CheckBoxGroup
              field="modernisierungElektrik"
              options={['Leitungen erneuert', 'Sicherungskasten FI-Schalter', 'LAN-Verkabelung', 'Smart Home']}
              formData={formData}
              setFormData={setFormData}
            />

            <p style={{ fontSize: '14px', fontWeight: 'bold' }}>Dämmung</p>
            <CheckBoxGroup
              field="modernisierungDaemmung"
              options={['Kellerdeckendämmung', 'WDVS', 'Oberste Geschossdecke', 'Dachflächen']}
              formData={formData}
              setFormData={setFormData}
            />

            <input
              style={inputS}
              placeholder="Baujahr Heizung"
              type="number"
              value={formData.baujahrHeizung}
              onChange={(event) => updateFormData({ baujahrHeizung: event.target.value })}
            />
            <select
              style={inputS}
              value={formData.befeuerung}
              onChange={(event) => updateFormData({ befeuerung: event.target.value })}
            >
              <option>Gas-Zentralheizung</option>
              <option>Öl-Zentralheizung</option>
              <option>Wärmepumpe</option>
              <option>Pellets</option>
              <option>Fernwärme</option>
            </select>

            <div style={{ background: '#f5fafa', padding: '15px', borderRadius: '15px', border: `1px solid ${PETROL}` }}>
              <label>
                <input
                  type="checkbox"
                  checked={formData.pvAnlage}
                  onChange={(event) => updateFormData({ pvAnlage: event.target.checked })}
                />
                {' '}PV-Anlage vorhanden?
              </label>

              {formData.pvAnlage && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                  <input
                    style={inputS}
                    placeholder="Leistung in kWp"
                    type="number"
                    value={formData.pvGroesse}
                    onChange={(event) => updateFormData({ pvGroesse: event.target.value })}
                  />
                  <input
                    style={inputS}
                    placeholder="Baujahr PV"
                    type="number"
                    value={formData.pvBaujahr}
                    onChange={(event) => updateFormData({ pvBaujahr: event.target.value })}
                  />
                </div>
              )}
            </div>

            <textarea
              style={{ ...inputS, height: '90px' }}
              placeholder="Besonderheiten (Pool, Kamin, Gartenhaus, etc.)"
              value={formData.besonderheiten}
              onChange={(event) => updateFormData({ besonderheiten: event.target.value })}
            />

            <button onClick={() => setStep(4)} style={btnS}>
              WEITER
            </button>
            <button onClick={() => setStep(2)} style={backS}>
              ZURÜCK
            </button>
          </div>
        )}

        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <PiefkeTip text="Nach erfolgreichem Checkout werden Bewertungsdaten, Connector-Metadaten und PDF-Referenz serverseitig gespeichert." />
            <h3>4. Abschluss und Checkout</h3>

            <select
              style={{ ...inputS, border: !formData.rolle ? '2px solid orange' : '1px solid #ddd' }}
              value={formData.rolle}
              onChange={(event) => updateFormData({ rolle: event.target.value })}
            >
              <option value="">Ihre Rolle wählen *</option>
              <option value="Eigentümer">Eigentümer</option>
              <option value="Bevollmächtigter">Bevollmächtigter</option>
              <option value="Interessent">Kaufinteressent</option>
            </select>

            <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '15px', border: '1px solid #eee' }}>
              <label style={consentLabelS}>
                <input
                  type="checkbox"
                  checked={formData.eigentuemerVersicherung}
                  onChange={(event) => updateFormData({ eigentuemerVersicherung: event.target.checked })}
                />
                <span>Ich bestätige, dass ich Eigentümer bin oder über einen entsprechenden Nachweis verfüge.</span>
              </label>
              <label style={{ ...consentLabelS, marginBottom: 0 }}>
                <input
                  type="checkbox"
                  checked={formData.agb}
                  onChange={(event) => updateFormData({ agb: event.target.checked })}
                />
                <span>Ich akzeptiere die AGB und die Datenschutzerklärung.</span>
              </label>
            </div>

            <button
              onClick={handleCheckout}
              disabled={!formData.agb || !formData.eigentuemerVersicherung || !formData.rolle}
              style={{
                ...btnS,
                opacity: !formData.agb || !formData.eigentuemerVersicherung || !formData.rolle ? 0.5 : 1,
              }}
            >
              JETZT ZAHLUNGSPFLICHTIG BESTELLEN
            </button>
            <button onClick={() => void handleSimulatedCheckout()} style={{ ...btnS, background: '#2c3e50' }}>
              CHECKOUT ERFOLG SIMULIEREN UND PDF TESTEN
            </button>
            <button onClick={() => setStep(3)} style={backS}>
              ZURUECK
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const inputS = {
  width: '100%',
  padding: '15px',
  borderRadius: '12px',
  border: '1px solid #ddd',
  boxSizing: 'border-box' as const,
};

const btnS = {
  padding: '18px',
  background: PETROL,
  color: 'white',
  border: 'none',
  borderRadius: '10px',
  fontWeight: 'bold' as const,
  cursor: 'pointer',
  width: '100%',
};

const backS = {
  background: 'none',
  border: 'none',
  color: '#888',
  cursor: 'pointer',
  marginTop: '10px',
  width: '100%',
};

const segmentedButtonS = {
  flex: 1,
  padding: '15px',
  borderRadius: '12px',
  border: 'none',
  cursor: 'pointer',
};

const checkLabelS = {
  background: '#f9f9f9',
  padding: '12px',
  borderRadius: '10px',
  fontSize: '12px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const consentLabelS = {
  display: 'flex',
  gap: '10px',
  fontSize: '13px',
  marginBottom: '15px',
  cursor: 'pointer',
  lineHeight: 1.5,
};

const shadowS = '0 4px 15px rgba(0,0,0,0.3)';
