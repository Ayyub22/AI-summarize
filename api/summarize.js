module.exports = async function handler(req, res) {
  // Handle CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'No text provided' });
    }

    // Truncate if extremely long
    const truncatedText = text.length > 30000 ? text.substring(0, 30000) + '\n\n[...teks dipotong karena terlalu panjang]' : text;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `Kamu adalah asisten AI yang ahli merangkum dokumen. Rangkum dokumen dengan jelas dan terstruktur.

ATURAN:
- Gunakan bahasa yang SAMA dengan bahasa dokumen (Indonesia atau English)
- Buat rangkuman yang informatif dan mudah dipahami
- Gunakan format markdown

FORMAT OUTPUT:
## 📝 Ringkasan Singkat
(2-3 kalimat ringkasan utama)

## 🔑 Poin-Poin Penting
- (daftar poin penting)

## 📌 Kesimpulan
(kesimpulan utama dari dokumen)`
          },
          {
            role: 'user',
            content: `Rangkum dokumen berikut:\n\n${truncatedText}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Groq API error:', data);
      throw new Error(data.error?.message || 'API error');
    }

    const summary = data.choices[0].message.content;
    return res.status(200).json({ summary });
  } catch (error) {
    console.error('Summarize error:', error);
    return res.status(500).json({ error: 'Gagal merangkum dokumen. ' + (error.message || 'Silakan coba lagi.') });
  }
};
