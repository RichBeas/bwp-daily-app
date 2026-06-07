export default async function handler(req, res) {
  const day = Number(req.query.day || 1);
  const safeDay = Math.min(Math.max(day, 1), 366);
  const url = `https://bible.alpha.org/en/classic/${safeDay}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 BWP-Daily/1.0",
        "Accept": "text/html,application/xhtml+xml"
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error: `Alpha returned ${response.status}`,
        url
      });
    }

    const html = await response.text();

    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).json({
      ok: true,
      url,
      html
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message,
      url
    });
  }
}
