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
    // 1 — Hent suggestions (som før)
    //

    const suggestionRes = await fetch(
      `https://api.bring.com/address/api/no/addresses/suggestions?q=${encodeURIComponent(q)}`,
      { headers }
    );

    const suggestionData = await suggestionRes.json();

    let suggestions = [];

    if (suggestionData.addresses) {
      suggestions = suggestionData.addresses.map(a =>
        `${a.street_name} ${a.house_number}${a.letter || ""}, ${a.postal_place}`
      );
    }

    //
    // 2 — Sjekk om bruker skrev gate + nummer
    // (f.eks "Camilla Colletts vei 11")
    //

    const parsed = q.match(/^(.*?)(\d+)\s*([a-zA-Z]?)$/);

    let extraSuggestions = [];

    if (parsed) {

      const street = parsed[1].trim();
      const number = parsed[2];

      //
      // 3 — Hent alle bokstav-varianter (11A, 11B osv.)
      //

      const addressUrl =
        `https://api.bring.com/address/api/no/addresses` +
        `?street_or_place=${encodeURIComponent(street)}` +
        `&street_number=${number}` +
        `&address_type=street`;

      const addressRes = await fetch(addressUrl, { headers });

      const addressData = await addressRes.json();

      if (addressData.addresses) {

        extraSuggestions = addressData.addresses.map(a =>
          `${a.street_name} ${a.house_number}${a.letter || ""}, ${a.postal_place}`
        );
      }
    }

    //
    // 4 — Merge + fjern duplikater
    //

    const combined = [
      ...suggestions,
      ...extraSuggestions
    ];

    const uniqueSuggestions = [...new Set(combined)];

    //
    // 5 — Returner samme struktur hver gang
    //

    res.setHeader("Access-Control-Allow-Origin", "*");

    res.status(200).json({
      suggestions: uniqueSuggestions
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Server error",
      details: error.message
    });
  }
}
