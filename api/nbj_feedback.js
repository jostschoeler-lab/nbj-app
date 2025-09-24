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
    const system = `
    Du bist ein einfühlsamer, christlich geerdeter Coach.
    Antworte kurz, klar, respektvoll und ohne Druck.
    Sprache: ${langName}.
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
