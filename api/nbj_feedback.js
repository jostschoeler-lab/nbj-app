// File: api/nbj_feedback.js
// Vercel Serverless Function (Node.js) – sicherer Proxy zu OpenAI
export default async function handler(req, res) {
  // CORS (erlaubt Aufruf von deiner App-Domain)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')  return res.status(405).json({ error: 'Method not allowed' });

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Missing OPENAI_API_KEY' });

    const { lang = 'de', step = 1, text = '', notes = '', durations = {}, tone = 'pastoral' } = req.body || {};
    const languageNames = { de: 'Deutsch', nb: 'Norwegisch (Bokmål)', en: 'Englisch', es: 'Spanisch' };
    const langName = languageNames[lang] || 'Deutsch';

    const system = `
Du bist ein einfühlsamer, christlich geerdeter Coach. Antworte kurz, klar, respektvoll, ohne Druck.
Sprache: ${langName}. Ziel: Hilfe zur Selbstreflexion entlang NBJ (Not–Bedürfnis–Jesus).
Struktur:
1) Spiegeln (Gefühl/Bedürfnis)
2) Evangeliums-Bezug (Zusage, Trost)
3) Micro-Schritt (sehr konkret)
4) 1 Vers (kurz, Quellenangabe)
Hinweise: keine Diagnosen, keine Dogmatik-Debatten, keine Scham. Höchstens 120–160 Wörter.
Wenn Nutzer Notizen sendet, nutze sie als Material – aber keine Annahmen über Dritte.
`;

    const user = `
Sprache: ${lang}
NBJ-Schritt: ${step}
Kurztext des Schritts/Text: """${text}"""
Notizen (optional): """${notes}"""
Timer (Sekunden) pro Schritt: ${JSON.stringify(durations)}
Bitte antworte in ${langName} mit den 4 Punkten (1–4) als kurze Abschnitte.
`;

    // OpenAI: Chat Completions
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',         // günstig & gut für Text
        temperature: 0.4,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      })
    });

    if (!resp.ok) {
      const t = await resp.text();
      return res.status(resp.status).json({ error: 'OpenAI error', detail: t });
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || 'Keine Antwort erhalten.';
    return res.status(200).json({ ok: true, lang, content });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error', detail: e?.message || e?.toString() });
  }
}
