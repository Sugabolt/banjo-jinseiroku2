export default async function handler(req, res) {
  // POST以外のアクセスを遮断
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userPrompt, systemPrompt } = req.body;

  // Vercelに登録したあなたのGemini APIキーを安全に読み込みます
  // （スマホのブラウザからはこの中身は絶対に見えません）
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key is not configured on server' });
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Gemini Backend Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
