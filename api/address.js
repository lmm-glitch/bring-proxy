export default async function handler(req, res) {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: "Missing query" });
  }

  try {

    const headers = {
      "X-Mybring-API-Uid": process.env.BRING_UID,
      "X-Mybring-API-Key": process.env.BRING_KEY,
      "Accept": "application/json"
    };

    //
    // 1 — Hent suggestions (første kall)
    //

    const suggestionRes = await fetch(
      `https://api.bring.com/address/api/no/addresses/suggestions?q=${encodeURIComponent(q)}`,
      { headers }
    );

    const suggestionData = await suggestionRes.json();

    let suggestions = [];

    if (suggestionData.addresses) {

      suggestions = suggestionData.addresses.map(a => {

        const city =
          a.postal_place ||
          a.city ||
          "";

        const postal =
          a.postal_code ||
          "";

        return `${a.street_name} ${a.house_number}${a.letter || ""}, ${postal} ${city}`.trim();

      });

    }

    //
    // 2 — Sjekk om bruker skrev gate + nummer
    //

    const parsed = q.match(/^(.*?)(\d+)\s*([a-zA-Z]?)$/);

    let extraSuggestions = [];

    if (parsed) {

      const street = parsed[1].trim();
      const number = parsed[2];

      //
      // 3 — Hent bokstav-varianter (andre kall)
      //

      const addressUrl =
        `https://api.bring.com/address/api/no/addresses` +
        `?street_or_place=${encodeURIComponent(street)}` +
        `&street_number=${number}` +
        `&address_type=street`;

      const addressRes = await fetch(addressUrl, { headers });

      const addressData = await addressRes.json();

      if (addressData.addresses) {

        extraSuggestions = addressData.addresses.map(a => {

          const city =
            a.postal_place ||
            a.city ||
            "";

          const postal =
            a.postal_code ||
            "";

          return `${a.street_name} ${a.house_number}${a.letter || ""}, ${postal} ${city}`.trim();

        });

      }

    }

    //
    // 4 — Merge + fjern duplikater
    //

    const combined = [
      ...suggestions,
      ...extraSuggestions
    ];

    const uniqueSuggestions =
      [...new Set(combined)]
      .filter(Boolean)
      .slice(0, 8); // maks 8 forslag

    //
    // 5 — Returner resultat
    //

    res.setHeader("Access-Control-Allow-Origin", "*");

    res.status(200).json({
      suggestions: uniqueSuggestions
    });

  } catch (error) {

    console.error("API error:", error);

    res.status(500).json({
      error: "Server error",
      details: error.message
    });

  }
}
