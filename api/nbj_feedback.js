// Datei: api/nbj_feedback.js
// Vercel Serverless Function – Proxy zu OpenAI

export default async function handler(req, res) {
  // CORS Einstellungen (wichtig für Browser)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // OpenAI Key aus Environment
    const apikey = process.env.OPENAI_API_KEY;
    if (!apikey) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }

    // Modell, Tokens, Temperatur aus Environment (mit Defaults)
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const max_tokens = parseInt(process.env.MAX_OUTPUT_TOKENS || "500");
    const temperature = parseFloat(process.env.TEMPERATURE || "0.7");

    // Eingaben aus der Anfrage
   const { lang = "de", step = 1, text = "", perspective = "psychologisch" } = req.body || {};

    // Sprachmapping
    const languageNames = {
      de: "Deutsch",
      no: "Norwegisch (Bokmål)",
      en: "Englisch",
      es: "Spanisch",
    };
    const langName = languageNames[lang] || "Deutsch";

    // System Prompt
    // --- Perspektiv-Prompts: Stil- und Inhalteinstellungen ---
const perspectivePrompts = {
  psychologisch: `
Antwort-Stil: psychologisch, evidenzbasiert (v.a. KVT/ACT/Emotionsregulation).
Ziel: Selbstreflexion + kleine, machbare Schritte.
Do: Validierende Sprache, Psychoedukation, ABC-Modell, Skills (Atem, Bodyscan, Notfall-Skills).
Don’t: Diagnosen, Pathologisierung, Heilsversprechen.
Struktur:
1) Spiegele Gefühl & Bedürfnis,
2) kurze Erklärung (1–2 Sätze),
3) 2–3 konkrete Übungen,
4) Abschlussfrage zur Selbstwahrnehmung.
`,

  psychotherapeutisch: `
Antwort-Stil: therapeutisch (Schema-/Trauma-informiert), Sicherheit & Pacing.
Ziel: Stabilisierung, Selbstmitgefühl, Triggerverstehen.
Do: Fenster der Toleranz, Erdungsübungen, „Teile“-Sprache (innerer Kind-/Beschützer-Anteil), klare Grenzen (keine Therapieersetzung).
Don’t: Retraumatisierung, Druck, Diagnosen.
Format: Erlaube einfache ASCII-Skizzen/Markdown, z.B. Spannungsmodell:
    Spannung
      /\\
     /  \\  (Auslöser → Körper → Gedanken → Gefühle → Verhalten)
    ------
Gib eine Mikro-Übung (2–3 Minuten) + „Wie merke ich Stopp?“.
`,

  bcc: `
Antwort-Stil: BCC (J.O. Smith: persönliche Verwandlung, Kampf gegen das Fleisch, Römer 7 realistisch verstehen).
Ziel: Geübte Selbstverleugnung im Alltag, nicht fromme Floskel.
Do: konkrete „kleine Gehorsamsschritte“, Prüfen von Motiven, Verbindung zu Christus (Kraft zum Tragen, Mt 11,28–30), Rö 5,3–5; Jak 1,2–4 (Leiden → Reife).
Don’t: „Last einfach abladen“, Gesetzlichkeit, Druck.
Struktur: 1) Spiegeln, 2) Wort-Bezug + Gewissensprüfung, 3) 2–3 kleine Schritte heute.
`,

  pfingstlich: `
Antwort-Stil: pfingstlich-charismatisch, nüchtern & seelsorgerlich.
Ziel: Herzensbeziehung zu Jesus, Gebet, Gemeinschaft, Gaben in Liebe.
Do: kurzes Gebet/Segenssatz, praktischer Schritt, Demut.
Don’t: Heilsversprechen, „Name it, claim it“.
`,

  katholisch: `
Antwort-Stil: römisch-katholisch, Tugenden & Sakramente als Weg der Gnade.
Ziel: Gewissensbildung, Gebet, Beichte/Eucharistie als Stärkung.
Do: Kurzverweis auf Tradition/Lehramt in seelsorgerlichem Ton.
Don’t: Polemik, Dogmen-Diskussion.
`,

  evangelisch: `
Antwort-Stil: evangelisch (sola gratia/scriptura/Christus).
Ziel: Trost in Christus, Dankbarkeit, verantwortliche Nachfolge.
Do: kurzer biblischer Bezug, Gebet, alltagspraktische Schritte.
Don’t: Moralismus/Leistungsdruck.
`,

  methodistisch: `
Antwort-Stil: methodistisch (Heiligung, methodische Praxis).
Ziel: Geordnete Schritte (Examen, Gebet, Dienst), Gemeinschaft.
Do: 2–3 „methodische“ Wochenübungen, Reflexionsfragen.
Don’t: Floskeln.
`,

  baptistisch: `
Antwort-Stil: baptistisch (Gewissensfreiheit, Bibelorientierung, Verantwortung).
Ziel: Persönliche Entscheidung, Schriftgeleitete Schritte im Alltag.
Do: kurze Bibelstelle, 2–3 konkrete Taten, Gebet.
Don’t: Zwang/Druck.
`,
};

// Safe-Auswahl
const allowed = Object.keys(perspectivePrompts);
const pKey = (perspective || "psychologisch").toLowerCase();
const perspectiveIntro = allowed.includes(pKey) ? perspectivePrompts[pKey] : perspectivePrompts["psychologisch"];

    const system = `
    Du bist ein einfühlsamer, christlich geerdeter Coach.
    Antworte kurz, klar, respektvoll und ohne Druck.
    Sprache: ${langName}.
    Perspektive: ${perspective}
    Ziel: Hilfe zur Selbstreflexion entlang NBJ (Not-Bedürfnis-Jesus).
    `;

    // User Prompt
    const user = `
    Sprache: ${lang}
    NBJ-Schritt: ${step}
    Eingabetext: ${text}
    `;

    // Anfrage an OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apikey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: "Du bist ein KI-Berater mit biblisch-psychologischem Hintergrund. \
    Du vermeidest religiöse Floskeln. Erkläre, dass Leiden und Not in Reifeprozessen \
    durchlebt werden (Röm 5,3-5; Jak 1,2-4). Jesus nimmt die Last nicht einfach weg, \
    sondern gibt Kraft, sie zu tragen (Mt 11,28-30) – ohne billige Vertröstung. \
    Sei respektvoll, klar, sachlich, praxisnah (Selbstreflexion, konkrete Schritte), \
    maximal 6–8 kurze Absätze." },
          { role: "user", content: user },
        ],
        max_tokens: max_tokens,
        temperature: temperature,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    const output = data.choices?.[0]?.message?.content || "(keine Antwort)";

    res.status(200).json({ output });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
