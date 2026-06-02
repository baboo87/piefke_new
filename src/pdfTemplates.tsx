import React from 'react';
import { GEWICHTUNG, NHK_TABELLE } from './calculationData';
import type { FormData, ValuationResult } from './types';

const ACCENT = '#1FBCB3';
const TEXT = '#1f2933';
const MUTED = '#667085';
const BORDER = '#d5dbe1';
const LIEGENSCHAFTSZINS = 0.0325;
const PIEFKE_FUCHS = '/assets/piefke-fuchs.png';

const CONTACT = {
  company: 'Kreisel Immobilien',
  person: 'Linda Kreisel',
  street: 'Ahornweg 20',
  city: '31848 Bad Münder',
  phone: '05042 50 91 109',
  email: 'info@kreiselimmobilien.de',
  website: 'www.kreiselimmobilien.de',
};

const formatCurrency = (value: number, fractionDigits = 2) =>
  value.toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

const formatNumber = (value: number, fractionDigits = 2) =>
  value.toLocaleString('de-DE', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

const formatPercent = (value: number, fractionDigits = 2) => `${formatNumber(value * 100, fractionDigits)} %`;

const toNumber = (value: string) => Number.parseFloat(value.replace(',', '.')) || 0;
const yesNo = (value: boolean) => (value ? 'Ja' : 'Nein');
const formatIsoDate = (value: string) => {
  if (!value) {
    return 'nicht angegeben';
  }
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }
  return parsedDate.toLocaleDateString('de-DE');
};

const PrintStyles = () => (
  <style
    dangerouslySetInnerHTML={{
      __html: `
        @page {
          size: A4;
          margin: 0;
        }
        @media print {
          html, body {
            background: white !important;
          }
          #pdf-export-container {
            margin: 0 !important;
            padding: 0 !important;
          }
          .pdf-page {
            box-shadow: none !important;
            margin: 0 !important;
            page-break-after: always;
          }
        }
      `,
    }}
  />
);

const Header = ({ rightTitle }: { rightTitle: string }) => (
  <header style={{ marginBottom: '8mm' }}>
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '12px',
        color: '#252b33',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
        <img
          src={PIEFKE_FUCHS}
          alt="Piefke"
          style={{ width: '10mm', height: '10mm', objectFit: 'contain' }}
        />
        <span>Kurzbewertung</span>
      </span>
      <span>{rightTitle}</span>
    </div>
    <div style={{ marginTop: '2mm', borderBottom: `1px solid ${BORDER}` }} />
  </header>
);

const Footer = ({ pageNum }: { pageNum: number }) => (
  <footer style={{ marginTop: '8mm' }}>
    <div style={{ borderTop: `1px solid ${BORDER}`, marginBottom: '2.5mm' }} />
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '12px',
        color: '#252b33',
      }}
    >
      <span>{new Date().toLocaleDateString('de-DE')}</span>
      <span>Seite {pageNum}</span>
    </div>
  </footer>
);

const Page = ({
  pageNum,
  totalPages,
  headerRightTitle,
  showHeader = true,
  showFooter = true,
  children,
}: {
  pageNum: number;
  totalPages: number;
  headerRightTitle: string;
  showHeader?: boolean;
  showFooter?: boolean;
  children: React.ReactNode;
}) => (
  <section
    className="pdf-page"
    style={{
      width: '210mm',
      height: '297mm',
      boxSizing: 'border-box',
      padding: '12mm 15mm',
      position: 'relative',
      background: 'white',
      color: TEXT,
      fontFamily: 'Avenir, Helvetica, Arial, sans-serif',
      pageBreakAfter: pageNum === totalPages ? 'auto' : 'always',
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    {!showHeader ? (
      <img
        src={PIEFKE_FUCHS}
        alt="Piefke"
        style={{
          position: 'absolute',
          top: '1.5mm',
          right: '15mm',
          width: '8mm',
          height: '8mm',
          objectFit: 'contain',
        }}
      />
    ) : null}
    {showHeader ? <Header rightTitle={headerRightTitle} /> : null}
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</div>
    {showFooter ? <Footer pageNum={pageNum} /> : null}
  </section>
);

const SectionTitle = ({ children }: { children: string }) => (
  <h2
    style={{
      fontSize: '34px',
      fontWeight: 500,
      marginTop: 0,
      marginBottom: '6mm',
      color: '#111827',
    }}
  >
    {children}
  </h2>
);

const MajorHeading = ({ children }: { children: string }) => (
  <h3
    style={{
      margin: '0 0 4mm',
      color: ACCENT,
      fontSize: '31px',
      fontWeight: 700,
    }}
  >
    {children}
  </h3>
);

const SubHeading = ({ children }: { children: string }) => (
  <h4 style={{ margin: '0 0 3mm', color: ACCENT, fontSize: '24px', fontWeight: 700 }}>{children}</h4>
);

const Paragraph = ({ children }: { children: React.ReactNode }) => (
  <p
    style={{
      margin: '0 0 4mm',
      fontSize: '13px',
      lineHeight: 1.55,
      color: '#2a3139',
    }}
  >
    {children}
  </p>
);

const KeyValueRows = ({ rows }: { rows: Array<{ label: string; value: string }> }) => (
  <div style={{ display: 'grid', gap: '2.2mm' }}>
    {rows.map((row) => (
      <div
        key={row.label}
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1.4fr)',
          gap: '8mm',
          alignItems: 'start',
          borderBottom: `1px solid ${BORDER}`,
          paddingBottom: '2mm',
        }}
      >
        <span style={{ fontSize: '13px', color: '#3e4550', minWidth: 0 }}>{row.label}</span>
        <span
          style={{
            fontSize: '13px',
            textAlign: 'right',
            color: '#0f1720',
            fontWeight: 600,
            minWidth: 0,
            whiteSpace: 'normal',
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
            maxWidth: '100%',
          }}
        >
          {row.value}
        </span>
      </div>
    ))}
  </div>
);

const ContactStrip = () => (
  <div
    style={{
      marginTop: 'auto',
      border: `1px solid ${BORDER}`,
      padding: '4mm',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: '5mm',
      fontSize: '12px',
      lineHeight: 1.4,
    }}
  >
    <div>
      <strong style={{ display: 'block', marginBottom: '2mm' }}>Ihr Ansprechpartner</strong>
      {CONTACT.company}
      <br />
      {CONTACT.person}
    </div>
    <div>
      {CONTACT.street}
      <br />
      {CONTACT.city}
    </div>
    <div>
      Telefon: {CONTACT.phone}
      <br />
      {CONTACT.email}
    </div>
  </div>
);

const ModernizationRows = ({ data }: { data: FormData }) => (
  <KeyValueRows
    rows={[
      {
        label: 'Fenster und Außentüren',
        value: data.modernisierungFenster.length ? data.modernisierungFenster.join(', ') : 'keine Modernisierung erfasst',
      },
      {
        label: 'Leitungssysteme / Elektrik',
        value: data.modernisierungElektrik.length ? data.modernisierungElektrik.join(', ') : 'keine Modernisierung erfasst',
      },
      {
        label: 'Wärmedämmung',
        value: data.modernisierungDaemmung.length ? data.modernisierungDaemmung.join(', ') : 'keine Modernisierung erfasst',
      },
      { label: 'PV-Anlage', value: yesNo(data.pvAnlage) },
      { label: 'PV-Leistung', value: data.pvGroesse ? `${data.pvGroesse} kWp` : '-' },
      { label: 'Baujahr Heizung', value: data.baujahrHeizung || '-' },
    ]}
  />
);

const FormulaExampleRows = ({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; formula: string; value: string }>;
}) => (
  <div
    style={{
      border: `1px solid ${BORDER}`,
      borderRadius: '3mm',
      padding: '4mm',
      background: '#fbfdfd',
    }}
  >
    <strong style={{ display: 'block', color: ACCENT, fontSize: '15px', marginBottom: '2.5mm' }}>{title}</strong>
    <div style={{ display: 'grid', gap: '2.2mm' }}>
      {rows.map((row) => (
        <div key={row.label} style={{ borderBottom: `1px solid ${BORDER}`, paddingBottom: '2mm' }}>
          <div style={{ fontSize: '12px', color: '#4b5563', marginBottom: '0.8mm' }}>{row.label}</div>
          <div
            style={{
              fontFamily: '"Courier New", monospace',
              fontSize: '11px',
              lineHeight: 1.45,
              color: '#111827',
            }}
          >
            {row.formula}
          </div>
          <div style={{ marginTop: '0.8mm', textAlign: 'right', fontSize: '12px', fontWeight: 600 }}>{row.value}</div>
        </div>
      ))}
    </div>
  </div>
);

export const PDFReport = ({
  data,
  result,
}: {
  data: FormData;
  result: ValuationResult;
}) => {
  const addressLine = [data.strasse, data.hausnummer].filter(Boolean).join(' ');
  const cityLine = [data.plz, data.stadt].filter(Boolean).join(' ');
  const headlineAddress = [addressLine, cityLine].filter(Boolean).join(', ') || 'Adresse wird nachgereicht';
  const customerName =
    [data.kundeVorname?.trim(), data.kundeNachname?.trim()].filter(Boolean).join(' ') || 'nicht angegeben';
  const hasDifferentCustomerAddress =
    data.kundeAdresseAbweichend &&
    [data.kundeStrasse, data.kundeHausnummer, data.kundePlz, data.kundeStadt].some((entry) => entry.trim().length > 0);
  const customerStreetLine = hasDifferentCustomerAddress
    ? [data.kundeStrasse, data.kundeHausnummer].filter(Boolean).join(' ')
    : addressLine;
  const customerCityLine = hasDifferentCustomerAddress
    ? [data.kundePlz, data.kundeStadt].filter(Boolean).join(' ')
    : cityLine;
  const customerBirthDate = formatIsoDate(data.kundeGeburtsdatum);
  const headerTitle = headlineAddress.length > 46 ? `${headlineAddress.slice(0, 43)}...` : headlineAddress;

  const livingArea = toNumber(data.wohnflaeche);
  const lotAreaShare = toNumber(data.grundstueck || data.mea);
  const landRate = toNumber(data.bodenwert);
  const totalLandArea = data.kategorie === 'Wohnung' ? lotAreaShare / 0.704 : lotAreaShare;
  const landValue = result.bodenwert;
  const buildingYear = Number.parseInt(data.baujahr, 10) || 1980;
  const age = new Date().getFullYear() - buildingYear;
  const annualGrossIncome = result.miete * livingArea * 12;
  const operatingCosts = annualGrossIncome * 0.27;
  const netIncome = annualGrossIncome - operatingCosts;
  const landInterest = landValue * LIEGENSCHAFTSZINS;
  const buildingIncome = result.reinertrag;
  const q = 1 + LIEGENSCHAFTSZINS;
  const multiplier = (Math.pow(q, result.rnd) - 1) / (LIEGENSCHAFTSZINS * Math.pow(q, result.rnd));
  const buildingErtragswert = buildingIncome * multiplier;
  const nhkBase = NHK_TABELLE[data.untertyp] || 1100;
  const grossFloorArea = livingArea * 1.35;
  const replacementCostNew = grossFloorArea * nhkBase * result.regionFaktor;
  const ageDeductionRate = Math.min(age / 80, 1);
  const ageDeduction = replacementCostNew * ageDeductionRate;
  const windowBonusRate = data.modernisierungFenster.length * 0.03;
  const electricalBonusRate = data.modernisierungElektrik.length * 0.02;
  const insulationBonusRate = data.modernisierungDaemmung.length * 0.05;
  const conditionBonusRate = windowBonusRate + electricalBonusRate + insulationBonusRate;
  const conditionFactor = 1 + conditionBonusRate;
  const weightKey = data.untertyp === 'Mehrfamilienhaus' ? 'Mehrfamilienhaus' : data.kategorie;
  const weights = GEWICHTUNG[weightKey] || GEWICHTUNG.Haus;
  const weightedErtragswert = result.ertragswert * weights.ertragswert;
  const weightedSachwert = result.sachwert * weights.sachwert;
  const finalEstimate = result.finalerMarktwert;
  const rangeFromErtragswert = result.ertragswert;
  const rangeToSachwert = result.sachwert;
  const recommendedMarketPrice = (rangeFromErtragswert + rangeToSachwert) / 2;
  const templateDate = new Date().toLocaleDateString('de-DE');
  const brwStichtag = data.bodenwertStichtag || 'nicht verfügbar';
  const selectedNutzungsart = (() => {
    const selectedSubtype = String(data.untertyp || '').trim();
    if (data.kategorie === 'Wohnung') {
      if (!selectedSubtype) {
        return 'Wohnung';
      }
      return selectedSubtype.toLowerCase().includes('wohnung')
        ? selectedSubtype
        : `Wohnung ${selectedSubtype}`;
    }
    return selectedSubtype || data.kategorie || 'nicht verfügbar';
  })();
  const brwQuelle = data.bodenwertQuelle || 'nicht verfügbar';
  const totalPages = 12;

  const contentRows: Array<{ label: string; page: number }> = [
    { label: '1. Einleitung', page: 3 },
    { label: '1.1 Auftrag', page: 3 },
    { label: '1.2 Erläuterungen zum Umfang', page: 3 },
    { label: '2. Lage', page: 4 },
    { label: '3. Wertermittlungsobjekt', page: 4 },
    { label: '4. Verfahrenswahl und Begründung', page: 5 },
    { label: '5. Bodenwert', page: 6 },
    { label: '5.1 Grundlagen der Bodenwertermittlung', page: 6 },
    { label: '5.2 Ermittlung des Bodenwerts', page: 6 },
    { label: '6. Ertragswertverfahren', page: 7 },
    { label: '6.1 Flächen und Erträge', page: 7 },
    { label: '6.2 Restnutzungsdauer und Vervielfältiger', page: 8 },
    { label: '6.3 Ermittlung des vorläufigen Ertragswerts', page: 8 },
    { label: '7. Besondere objektspezifische Merkmale', page: 9 },
    { label: '8. Verkehrswert', page: 9 },
    { label: '9. Formeln und Beispielrechnungen', page: 10 },
    { label: '9.1 Ertragswertverfahren', page: 10 },
    { label: '9.2 Sachwertverfahren', page: 11 },
    { label: '10. Exklusive Immobilien-Wertanalyse', page: 12 },
  ];

  return (
    <div id="pdf-export-container">
      <PrintStyles />

      <Page pageNum={1} totalPages={totalPages} headerRightTitle={headerTitle} showHeader={false} showFooter={false}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '5mm' }}>
          <img src="/assets/logo.jpg" alt="Kreisel Immobilien" style={{ height: '34mm', objectFit: 'contain' }} />
          <div style={{ textAlign: 'right', fontSize: '13px', lineHeight: 1.6 }}>
            <strong style={{ fontSize: '14px' }}>{CONTACT.company}</strong>
            <br />
            {CONTACT.street}, {CONTACT.city}
            <br />
            Tel: {CONTACT.phone}
            <br />
            Email: {CONTACT.email}
            <br />
            Internet: {CONTACT.website}
          </div>
        </div>

        <div style={{ marginTop: '12mm', textAlign: 'center' }}>
          <SectionTitle>Immobilien-Kurzbewertung</SectionTitle>
          <div
            style={{
              height: '62mm',
              borderRadius: '8mm',
              border: `1px solid ${BORDER}`,
              background: 'linear-gradient(130deg, #f8fafb 0%, #edf6f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: MUTED,
              fontSize: '16px',
              letterSpacing: '0.02em',
            }}
          >
            Objektansicht / Bewertungsobjekt
          </div>
          <div style={{ marginTop: '10mm', fontSize: '19px', fontWeight: 700 }}>{data.kategorie}</div>
          <div style={{ marginTop: '2.5mm', color: ACCENT, fontSize: '24px', fontWeight: 700 }}>{headlineAddress}</div>
          <div style={{ marginTop: '8mm', color: MUTED, fontSize: '12px' }}>Bewertungsstichtag: {brwStichtag}</div>
        </div>
      </Page>

      <Page pageNum={2} totalPages={totalPages} headerRightTitle={headerTitle}>
        <h2 style={{ margin: 0, color: ACCENT, fontSize: '30px' }}>Inhalt:</h2>
        <div style={{ marginTop: '8mm', display: 'grid', gap: '3.2mm' }}>
          {contentRows.map((row) => (
            <div
              key={row.label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderBottom: `1px dotted ${BORDER}`,
                paddingBottom: '1.4mm',
                fontSize: '13px',
              }}
            >
              <span>{row.label}</span>
              <strong>{row.page}</strong>
            </div>
          ))}
        </div>
      </Page>

      <Page pageNum={3} totalPages={totalPages} headerRightTitle={headerTitle}>
        <MajorHeading>1. Einleitung</MajorHeading>
        <SubHeading>1.1 Auftrag</SubHeading>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8mm', marginBottom: '6mm' }}>
          <div style={{ fontSize: '13px', lineHeight: 1.6 }}>
            <strong>Auftraggeber der Wertermittlung</strong>
            <br />
            {customerName}
            <br />
            Geburtsdatum: {customerBirthDate}
            <br />
            {customerStreetLine || 'Adresse wird nachgereicht'}
            <br />
            {customerCityLine || 'Adresse wird nachgereicht'}
          </div>
          <div style={{ fontSize: '13px', lineHeight: 1.6 }}>
            <strong>Auftragnehmer der Wertermittlung</strong>
            <br />
            {CONTACT.company}
            <br />
            {CONTACT.person}
            <br />
            {CONTACT.street}
            <br />
            {CONTACT.city}
            <br />
            <strong style={{ marginTop: '2mm', display: 'inline-block' }}>Wertermittlungsobjekt</strong>
            <br />
            {headlineAddress}
            <br />
            <strong style={{ marginTop: '2mm', display: 'inline-block' }}>Anlass</strong>
            <br />
            Marktpreisermittlung
            <br />
            <strong style={{ marginTop: '2mm', display: 'inline-block' }}>Bewertungsstichtag</strong>
            <br />
            {brwStichtag}
          </div>
        </div>

        <SubHeading>1.2 Erläuterungen zum Umfang</SubHeading>
        <Paragraph>
          Diese Immobilien-Kurzbewertung dient zur überschlägigen Ermittlung des voraussichtlichen Marktwerts und ist
          kein Verkehrswertgutachten nach Paragraph 194 BauGB. Die Ableitung erfolgt anhand der vom Auftraggeber
          bereitgestellten Objektangaben, orientiert an ImmoWertV und den gängigen Richtlinien für Sach- und
          Ertragswertmodelle.
        </Paragraph>
        <Paragraph>
          Es wurden keine bautechnischen Substanzprüfungen, keine juristischen Detailprüfungen sowie keine
          Altlasten- oder Bodenuntersuchungen vorgenommen. Alle Ergebnisse sind als professionelle Wertermittlungsbasis
          für den Vertrieb und die Preisstrategie zu verstehen.
        </Paragraph>
      </Page>

      <Page pageNum={4} totalPages={totalPages} headerRightTitle={headerTitle}>
        <MajorHeading>2. Lage</MajorHeading>
        <Paragraph>
          Das Bewertungsobjekt liegt in {data.stadt || 'der Region'} ({data.bundesland || 'Deutschland'}) und ist in
          das regionale Infrastruktur- und Nahversorgungsnetz eingebunden. Schulen, Nahversorgung, medizinische
          Versorgung und ÖPNV-Anbindung sind für die Standortqualität grundsätzlich wertrelevant.
        </Paragraph>
        <KeyValueRows
          rows={[
            { label: 'Bundesland', value: data.bundesland || '-' },
            { label: 'Stadt / Ort', value: data.stadt || '-' },
            { label: 'PLZ', value: data.plz || '-' },
            { label: 'Markttrend in der Region', value: result.trend },
            { label: 'Regionalfaktor', value: formatNumber(result.regionFaktor, 2) },
            {
              label: data.mieteQuelle ? 'Mietniveau (automatisch)' : 'Mietniveau (Modellwert)',
              value: `${formatNumber(result.miete, 2)} EUR/m2`,
            },
          ]}
        />

        <div style={{ marginTop: '7mm' }}>
          <MajorHeading>3. Wertermittlungsobjekt</MajorHeading>
          <KeyValueRows
            rows={[
              { label: 'Objektart', value: data.untertyp || data.kategorie },
              { label: 'Wohnfläche', value: `${formatNumber(livingArea, 2)} m2` },
              {
                label: data.kategorie === 'Haus' ? 'Grundstücksfläche' : 'Miteigentumsanteil',
                value: `${formatNumber(lotAreaShare, 2)} m2`,
              },
              { label: 'Baujahr', value: data.baujahr || '-' },
              { label: 'Heizung', value: data.befeuerung || '-' },
              { label: 'Besonderheiten', value: data.besonderheiten || 'keine Angabe' },
            ]}
          />
        </div>
      </Page>

      <Page pageNum={5} totalPages={totalPages} headerRightTitle={headerTitle}>
        <MajorHeading>4. Verfahrenswahl und Begründung</MajorHeading>
        <Paragraph>
          Für dieses Objekt wird das Ertragswertverfahren als primäre Bewertungsmethode angesetzt. Die Ableitung
          verbindet markttypische Mieterträge, Bewirtschaftungskosten, Bodenwertverzinsung sowie die
          Restnutzungsdauer zu einem nachvollziehbaren Verkehrswertmodell.
        </Paragraph>
        <Paragraph>
          Parallel wird der Sachwert in der internen Modellrechnung berücksichtigt, um den finalen Marktwert bei
          eigengenutzten und gemischt nachfragegetriebenen Objektarten zu plausibilisieren. Die Gewichtung basiert auf
          der Objektkategorie.
        </Paragraph>

        <div
          style={{
            marginTop: '6mm',
            border: `1px solid ${BORDER}`,
            borderRadius: '3mm',
            padding: '4mm',
            background: '#fbfdfd',
          }}
        >
          <KeyValueRows
            rows={[
              { label: 'Bewertungsverfahren (primär)', value: 'Ertragswertverfahren' },
              { label: 'Liegenschaftszins (Modell)', value: '3,25 %' },
              { label: 'Restnutzungsdauer', value: `${result.rnd} Jahre` },
              { label: 'Barwertfaktor / Vervielfältiger', value: formatNumber(result.vV, 2) },
              { label: 'Vorläufiger Ertragswert', value: formatCurrency(result.ertragswert) },
              { label: 'Finaler Marktwert', value: formatCurrency(finalEstimate) },
            ]}
          />
        </div>

        <div style={{ marginTop: '7mm' }}>
          <SubHeading>Bewertungsgrundlagen</SubHeading>
          <Paragraph>
            Der Wert der Immobilie ist individuell und wird maßgeblich durch Standort, Zustand, Ausstattung,
            Modernisierungen, Teilmarkt und Nachfrageverhältnisse beeinflusst. Weitere objektbezogene Faktoren können
            den Wert in beide Richtungen verändern und sind vor finaler Vermarktung vor Ort zu verifizieren.
          </Paragraph>
        </div>
      </Page>

      <Page pageNum={6} totalPages={totalPages} headerRightTitle={headerTitle}>
        <MajorHeading>5. Bodenwert</MajorHeading>
        <SubHeading>5.1 Grundlagen der Bodenwertermittlung</SubHeading>
        <Paragraph>
          Der Bodenwert wird auf Basis des angegebenen Bodenrichtwerts und der zugeordneten Fläche berechnet. Bei
          Wohnungseigentum wird der anteilige Miteigentumsanteil angesetzt. Marktanpassungen sind gesondert zu
          prüfen, sofern atypische Lage- oder Nutzungsmerkmale vorliegen.
        </Paragraph>

        <SubHeading>5.2 Ermittlung des Bodenwerts</SubHeading>
        <KeyValueRows
          rows={[
            { label: 'Gesamtfläche Grundstück (modelliert)', value: `${formatNumber(totalLandArea, 2)} m2` },
            { label: 'Bodenrichtwert', value: `${formatNumber(landRate, 2)} EUR/m2` },
            { label: 'Stichtag Bodenrichtwert', value: brwStichtag },
            { label: 'Nutzungsart', value: selectedNutzungsart },
            {
              label: data.kategorie === 'Haus' ? 'Anrechenbare Baulandfläche' : 'Anteilige Fläche nach MEA',
              value: `${formatNumber(lotAreaShare, 2)} m2`,
            },
            {
              label: 'Bodenwertberechnung',
              value: `${formatNumber(lotAreaShare, 2)} m2 x ${formatNumber(landRate, 2)} EUR/m2`,
            },
            { label: 'Bodenwert', value: formatCurrency(landValue) },
            { label: 'Datenquelle', value: brwQuelle },
          ]}
        />
      </Page>

      <Page pageNum={7} totalPages={totalPages} headerRightTitle={headerTitle}>
        <MajorHeading>6. Ertragswertverfahren</MajorHeading>
        <SubHeading>6.1 Flächen und Erträge</SubHeading>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '6mm' }}>
          <thead>
            <tr style={{ background: ACCENT, color: 'white' }}>
              {['Bezeichnung', 'Nutzung', 'Zeitraum', 'Fläche', 'Marktmiete', 'Ertrag/Jahr'].map((label) => (
                <th key={label} style={{ textAlign: 'left', padding: '2.8mm', fontWeight: 600 }}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={cellS}>Wohnung</td>
              <td style={cellS}>{data.kategorie}</td>
              <td style={cellS}>Monat</td>
              <td style={cellS}>{formatNumber(livingArea, 2)} m2</td>
              <td style={cellS}>{formatCurrency(result.miete, 2)}</td>
              <td style={cellS}>{formatCurrency(annualGrossIncome)}</td>
            </tr>
          </tbody>
        </table>

        <KeyValueRows
          rows={[
            { label: 'Jahresrohertrag', value: formatCurrency(annualGrossIncome) },
            { label: 'Bewirtschaftungskosten (27,00 %)', value: formatCurrency(operatingCosts) },
            { label: 'Jahresreinertrag', value: formatCurrency(netIncome) },
            { label: 'Bodenwertverzinsung (3,25 %)', value: formatCurrency(landInterest) },
            { label: 'Reinertrag bauliche Anlagen', value: formatCurrency(buildingIncome) },
          ]}
        />
      </Page>

      <Page pageNum={8} totalPages={totalPages} headerRightTitle={headerTitle}>
        <SubHeading>6.2 Restnutzungsdauer und Vervielfältiger</SubHeading>
        <Paragraph>
          Die Gesamtnutzungsdauer des Modells wird mit 80 Jahren angesetzt. Die Restnutzungsdauer ergibt sich aus
          Gesamtnutzungsdauer minus Alter, erweitert um Modernisierungszuschläge für Fenster, Elektrik und Dämmung.
        </Paragraph>
        <KeyValueRows
          rows={[
            { label: 'Baujahr', value: data.baujahr || '-' },
            { label: 'Gesamtnutzungsdauer (Modell)', value: '80 Jahre' },
            { label: 'Restnutzungsdauer', value: `${result.rnd} Jahre` },
            { label: 'Liegenschaftszins', value: '3,25 %' },
            { label: 'Vervielfältiger', value: formatNumber(result.vV, 2) },
          ]}
        />

        <SubHeading>6.3 Ermittlung des vorläufigen Ertragswerts</SubHeading>
        <KeyValueRows
          rows={[
            { label: 'Reinertrag der baulichen Anlagen', value: formatCurrency(buildingIncome) },
            { label: `x Vervielfältiger ${formatNumber(result.vV, 2)}`, value: formatCurrency(buildingErtragswert) },
            { label: 'Ertragswert der baulichen Anlagen', value: formatCurrency(buildingErtragswert) },
            { label: '+ Bodenwert', value: formatCurrency(landValue) },
            { label: 'Vorläufiger Ertragswert', value: formatCurrency(result.ertragswert) },
          ]}
        />
      </Page>

      <Page pageNum={9} totalPages={totalPages} headerRightTitle={headerTitle}>
        <MajorHeading>7. Besondere objektspezifische Merkmale</MajorHeading>
        <Paragraph>
          Im aktuellen Datenstand wurden keine gesonderten objektspezifischen Zu- oder Abschläge außerhalb der
          Modellparameter angesetzt. Eine Besichtigung kann weitergehende Merkmale offenlegen, die bei einer finalen
          Preisstrategie berücksichtigt werden sollten.
        </Paragraph>

        <MajorHeading>8. Verkehrswert</MajorHeading>
        <Paragraph>
          Das Objekt wird im gewöhnlichen Geschäftsverkehr vorrangig ertragsorientiert gehandelt. Unter den
          vorliegenden Annahmen ergibt sich folgender Richtwert:
        </Paragraph>
        <div
          style={{
            marginTop: '4mm',
            borderRadius: '5mm',
            border: `1px solid ${BORDER}`,
            background: '#fbfdfe',
            padding: '6mm 8mm 7mm',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8mm', alignItems: 'flex-start' }}>
            <div style={{ textAlign: 'left', minWidth: 0 }}>
              <div style={{ fontSize: '15px', color: '#1f2933', fontWeight: 600 }}>Ertragswert:</div>
              <div style={{ marginTop: '1mm', fontSize: '30px', color: '#1f2933', fontWeight: 700, lineHeight: 1.1 }}>
                {formatCurrency(result.ertragswert)}
              </div>
            </div>
            <div style={{ textAlign: 'right', minWidth: 0 }}>
              <div style={{ fontSize: '15px', color: '#1f2933', fontWeight: 600 }}>Sachwert:</div>
              <div style={{ marginTop: '1mm', fontSize: '30px', color: '#1f2933', fontWeight: 700, lineHeight: 1.1 }}>
                {formatCurrency(result.sachwert)}
              </div>
            </div>
          </div>
          <div style={{ margin: '4mm 0 3mm', borderTop: `1px solid ${BORDER}` }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '15px', color: MUTED }}>Empfohlener Verkaufspreis (Mitte aus Ertragswert und Sachwert)</div>
            <div style={{ marginTop: '2mm', fontSize: '36px', color: '#d44f4f', fontWeight: 700 }}>
              {formatCurrency(recommendedMarketPrice)}
            </div>
          </div>
        </div>
        <Paragraph>
          Der Ersteller versichert, dass die Wertermittlung nach bestem Wissen und Gewissen sowie anhand der
          vorliegenden Objektangaben erfolgt ist. Der tatsächliche Marktwert kann in einem üblichen Rahmen abweichen.
        </Paragraph>
        <div style={{ marginTop: '8mm', display: 'grid', gridTemplateColumns: '1fr 1fr', fontSize: '13px', gap: '8mm' }}>
          <div>
            {data.stadt || 'Ort'}, den {templateDate}
            <br />
            (Ort, Datum)
          </div>
          <div style={{ textAlign: 'right' }}>({CONTACT.person})</div>
        </div>
      </Page>

      <Page pageNum={10} totalPages={totalPages} headerRightTitle={headerTitle}>
        <SectionTitle>9. Formeln und Beispielrechnungen</SectionTitle>
        <Paragraph>
          Die folgenden Formeln zeigen die in diesem Report verwendete Rechenlogik. Alle Zahlen stammen direkt aus den
          vorliegenden Objektdaten und der aktuellen Modellrechnung.
        </Paragraph>

        <FormulaExampleRows
          title="9.1 Ertragswertverfahren"
          rows={[
            {
              label: 'Jahresrohertrag',
              formula: `${formatNumber(livingArea, 2)} m2 x ${formatNumber(result.miete, 2)} EUR/m2 x 12`,
              value: `= ${formatCurrency(annualGrossIncome)}`,
            },
            {
              label: 'Bewirtschaftungskosten',
              formula: `${formatCurrency(annualGrossIncome)} x 27,00 %`,
              value: `= ${formatCurrency(operatingCosts)}`,
            },
            {
              label: 'Bodenwert (BRW x Fläche)',
              formula: `${formatNumber(lotAreaShare, 2)} m2 x ${formatNumber(landRate, 2)} EUR/m2`,
              value: `= ${formatCurrency(landValue)}`,
            },
            {
              label: 'Reinertrag bauliche Anlagen',
              formula: `${formatCurrency(annualGrossIncome)} - ${formatCurrency(operatingCosts)} - ${formatCurrency(landInterest)}`,
              value: `= ${formatCurrency(buildingIncome)}`,
            },
            {
              label: 'Vervielfältiger',
              formula: `((1 + ${formatNumber(LIEGENSCHAFTSZINS, 4)})^${result.rnd} - 1) / (${formatNumber(LIEGENSCHAFTSZINS, 4)} x (1 + ${formatNumber(LIEGENSCHAFTSZINS, 4)})^${result.rnd})`,
              value: `= ${formatNumber(multiplier, 2)}`,
            },
            {
              label: 'Vorläufiger Ertragswert',
              formula: `${formatCurrency(buildingIncome)} x ${formatNumber(multiplier, 2)} + ${formatCurrency(landValue)}`,
              value: `= ${formatCurrency(result.ertragswert)}`,
            },
          ]}
        />
      </Page>

      <Page pageNum={11} totalPages={totalPages} headerRightTitle={headerTitle}>
        <SectionTitle>9. Formeln und Beispielrechnungen (Fortsetzung)</SectionTitle>
        <FormulaExampleRows
          title="9.2 Sachwertverfahren"
          rows={[
            {
              label: 'Bruttogrundfläche (BGF)',
              formula: `${formatNumber(livingArea, 2)} m2 x 1,35`,
              value: `= ${formatNumber(grossFloorArea, 2)} m2`,
            },
            {
              label: 'Herstellungskosten neu',
              formula: `${formatNumber(grossFloorArea, 2)} m2 x ${formatNumber(nhkBase, 2)} EUR/m2 x ${formatNumber(result.regionFaktor, 2)}`,
              value: `= ${formatCurrency(replacementCostNew)}`,
            },
            {
              label: 'Alterswertminderung',
              formula: `min(${formatNumber(age, 0)} / 80, 1,00) x ${formatCurrency(replacementCostNew)}`,
              value: `= ${formatCurrency(ageDeduction)}`,
            },
            {
              label: 'Gebäudesachwert',
              formula: `(${formatCurrency(replacementCostNew)} - ${formatCurrency(ageDeduction)}) x ${formatNumber(conditionFactor, 2)}`,
              value: `= ${formatCurrency(result.gebaeudesachwert)}`,
            },
            {
              label: 'Sachwert inklusive Bodenwert und PV',
              formula: `${formatCurrency(result.gebaeudesachwert)} + ${formatCurrency(landValue)} + ${formatCurrency(result.pvWert)}`,
              value: `= ${formatCurrency(result.sachwert)}`,
            },
          ]}
        />

        <div
          style={{
            marginTop: '4mm',
            border: `1px solid ${BORDER}`,
            borderRadius: '3mm',
            padding: '4mm',
            background: '#fbfdfd',
          }}
        >
          <KeyValueRows
            rows={[
              { label: 'Bodenwert aus Bodenrichtwert', value: formatCurrency(landValue) },
              {
                label: `Anteil Ertragswert (${formatPercent(weights.ertragswert)})`,
                value: formatCurrency(weightedErtragswert),
              },
              {
                label: `Anteil Sachwert (${formatPercent(weights.sachwert)})`,
                value: formatCurrency(weightedSachwert),
              },
              { label: 'Finaler Marktwert', value: formatCurrency(finalEstimate) },
            ]}
          />
        </div>
      </Page>

      <Page pageNum={12} totalPages={totalPages} headerRightTitle={headerTitle}>
        <SectionTitle>10. Exklusive Immobilien-Wertanalyse</SectionTitle>
        <Paragraph>
          Die Wertanalyse kombiniert die strukturierte Kurzbewertung mit einer praxisnahen Vermarktungseinordnung. Damit
          erhalten Sie eine belastbare Grundlage, um den Angebotspreis sauber zu positionieren und die nächsten
          Schritte zielgerichtet vorzubereiten.
        </Paragraph>
        <div
          style={{
            marginBottom: '5mm',
            border: `1px solid ${BORDER}`,
            borderRadius: '3mm',
            padding: '4mm',
            background: '#fbfdfd',
          }}
        >
          <Paragraph>
            Aufgrund der angegebenen Daten ergibt sich eine Marktpreisermittlung von{' '}
            <strong>{formatCurrency(rangeFromErtragswert)}</strong> bis{' '}
            <strong>{formatCurrency(rangeToSachwert)}</strong>. Der Preis von{' '}
            <strong>{formatCurrency(rangeFromErtragswert)}</strong> entspricht dem Ertragswert, der Preis bis{' '}
            <strong>{formatCurrency(rangeToSachwert)}</strong> entspricht dem Sachwert. Wir empfehlen daher einen Preis
            von <strong>{formatCurrency(recommendedMarketPrice)}</strong>.
          </Paragraph>
          <KeyValueRows
            rows={[
              { label: 'Preis von (Ertragswert)', value: formatCurrency(rangeFromErtragswert) },
              { label: 'Preis bis (Sachwert)', value: formatCurrency(rangeToSachwert) },
              { label: 'Empfohlener Preis (Mittelwert)', value: formatCurrency(recommendedMarketPrice) },
            ]}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6mm', marginBottom: '6mm' }}>
          <div style={highlightPanelS}>
            <strong style={{ color: ACCENT, display: 'block', marginBottom: '2mm' }}>Ihre Vorteile im Ueberblick</strong>
            <ul style={{ margin: 0, paddingLeft: '4mm', fontSize: '12px', lineHeight: 1.6 }}>
              <li>Individuelle Bewertung entlang ImmoWertV-Logik</li>
              <li>Ertragswert, Bodenwert und Marktwert in einem Report</li>
              <li>Transparente Berechnungsschritte für volle Nachvollziehbarkeit</li>
              <li>Klare Grundlage für Vermarktung und Preisstrategie</li>
            </ul>
          </div>
          <div style={highlightPanelS}>
            <strong style={{ color: ACCENT, display: 'block', marginBottom: '2mm' }}>Die nächsten Schritte</strong>
            <ul style={{ margin: 0, paddingLeft: '4mm', fontSize: '12px', lineHeight: 1.6 }}>
              <li>Klärung offener Datenpunkte und Unterlagen</li>
              <li>Besichtigung mit Fotodokumentation</li>
              <li>Festlegung des finalen Angebotspreises</li>
              <li>Start der professionellen Vermarktung</li>
            </ul>
          </div>
        </div>

        <SubHeading>Modernisierungen gemäß NHK 2010</SubHeading>
        <ModernizationRows data={data} />
        <ContactStrip />
      </Page>
    </div>
  );
};

const cellS: React.CSSProperties = {
  border: `1px solid ${BORDER}`,
  padding: '2.4mm',
  fontSize: '12px',
};

const highlightPanelS: React.CSSProperties = {
  border: `1px solid ${BORDER}`,
  borderRadius: '3mm',
  padding: '4mm',
  background: '#f8fbfb',
};
