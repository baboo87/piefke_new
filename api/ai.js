const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
};

const buildPrompt = ({ task, formData, result }) => {
  if (task === 'property-summary') {
    return [
      'Du bist Immobilien-Analyst fuer einen deutschsprachigen PDF-Bericht.',
      'Erstelle einen kurzen, professionellen Vermarktungstext mit 3 bis 5 Saetzen.',
      'Betone Lage, Objektart, Wertermittlung und Modernisierungen.',
      'Keine Aufzaehlungen, kein Markdown.',
      '',
      `Objektart: ${formData?.untertyp || 'Unbekannt'}`,
      `Strasse: ${formData?.strasse || 'Unbekannt'}`,
      `Hausnummer: ${formData?.hausnummer || 'Unbekannt'}`,
      `PLZ: ${formData?.plz || 'Unbekannt'}`,
      `Stadt: ${formData?.stadt || 'Unbekannt'}`,
      `Bundesland: ${formData?.bundesland || 'Unbekannt'}`,
      `Wohnflaeche: ${formData?.wohnflaeche || 'Unbekannt'} m2`,
      `Baujahr: ${formData?.baujahr || 'Unbekannt'}`,
      `Heizung: ${formData?.befeuerung || 'Unbekannt'}`,
      `Besonderheiten: ${formData?.besonderheiten || 'Keine Angabe'}`,
      `Marktwert: ${result?.finalerMarktwert || 'Unbekannt'} EUR`,
      `Trend: ${result?.trend || 'Unbekannt'}`,
    ].join('\n');
  }

  return 'Bitte gib eine kurze professionelle Immobilienzusammenfassung aus.';
};

const extractOpenAiText = (payload) => {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const chunks =
    payload.output
      ?.flatMap((item) => item.content || [])
      ?.filter((item) => item.type === 'output_text' && typeof item.text === 'string')
      ?.map((item) => item.text.trim()) || [];

  return chunks.join('\n').trim();
};

const extractGeminiText = (payload) => {
  const parts =
    payload.candidates?.[0]?.content?.parts
      ?.filter((part) => typeof part.text === 'string')
      ?.map((part) => part.text.trim()) || [];

  return parts.join('\n').trim();
};

const callOpenAI = async (prompt) => {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-5-mini';

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY fehlt.');
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: prompt,
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || 'OpenAI API Fehler');
  }

  const text = extractOpenAiText(payload);
  if (!text) {
    throw new Error('OpenAI API hat keinen Text geliefert.');
  }

  return { text, provider: 'openai', model };
};

const callGemini = async (prompt) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY fehlt.');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    },
  );

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || 'Gemini API Fehler');
  }

  const text = extractGeminiText(payload);
  if (!text) {
    throw new Error('Gemini API hat keinen Text geliefert.');
  }

  return { text, provider: 'gemini', model };
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Nur POST ist erlaubt.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const provider = body.provider || process.env.AI_PROVIDER || 'openai';
    const prompt = buildPrompt(body);

    const result = provider === 'gemini' ? await callGemini(prompt) : await callOpenAI(prompt);
    return json(res, 200, result);
  } catch (error) {
    return json(res, 500, {
      error: error instanceof Error ? error.message : 'Unbekannter Fehler im KI-Endpoint.',
    });
  }
}
