export default async function handler(req, res) {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: "Missing query" });
  }

  try {
    const response = await fetch(
      `https://api.bring.com/address/api/no/addresses/suggestions?q=${encodeURIComponent(q)}`,
      {
        headers: {
          "X-Mybring-API-Uid": process.env.BRING_UID,
          "X-Mybring-API-Key": process.env.BRING_KEY,
          "Accept": "application/json"
        }
      }
    );

    const data = await response.json();

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json(data);

  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
}
