module.exports = async function handler(req, res) {
  // Handle CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { document_text, history, question } = req.body;

    if (!document_text || !question) {
      return res.status(400).json({ error: 'document_text and question are required' });
    }

    // Truncate document if extremely long
    const truncatedText = document_text.length > 25000
      ? document_text.substring(0, 25000) + '\n\n[...teks dipotong]'
      : document_text;

    // Build messages array
    const messages = [
      {
        role: 'system',
        content: `Kamu adalah asisten AI yang membantu menjawab pertanyaan tentang sebuah dokumen.

ATURAN:
- Jawab dalam bahasa yang SAMA dengan bahasa pertanyaan user
- Jawab berdasarkan isi dokumen. Jika informasi tidak ada, katakan dengan jujur
- Gunakan format markdown jika diperlukan
- Berikan jawaban yang jelas, akurat, dan informatif

DOKUMEN:
${truncatedText}`
      }
    ];

    // Add chat history
    if (history && history.length > 0) {
      history.slice(-10).forEach(msg => {
        messages.push({ role: msg.role, content: msg.content });
      });
    }

    // Add current question
    messages.push({ role: 'user', content: question });

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.4,
        max_tokens: 2000
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Groq API error:', data);
      throw new Error(data.error?.message || 'API error');
    }

    const reply = data.choices[0].message.content;
    return res.status(200).json({ reply });
  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({ error: 'Gagal memproses pertanyaan. ' + (error.message || 'Silakan coba lagi.') });
  }
};
