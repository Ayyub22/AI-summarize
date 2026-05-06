# 🧠 DocuMind AI

> **Smart Document Summarizer** — Upload dokumen PDF, dapatkan rangkuman otomatis, dan tanya jawab seputar isi dokumen menggunakan kecerdasan buatan.

![Landing Page](https://img.shields.io/badge/Status-Active-10b981?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Groq](https://img.shields.io/badge/AI-Groq_Llama_3.3-f55036?style=for-the-badge)
![Supabase](https://img.shields.io/badge/Database-Supabase-3ecf8e?style=for-the-badge&logo=supabase&logoColor=white)

---

## ✨ Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
| 📄 **Upload PDF** | Drag & drop atau pilih file PDF hingga 10MB |
| 🤖 **AI Rangkum Otomatis** | Rangkuman terstruktur dengan poin-poin penting dalam hitungan detik |
| 💬 **Tanya Jawab Cerdas** | Chat interaktif seputar isi dokumen yang di-upload |
| 💾 **Simpan Riwayat** | Daftar akun gratis untuk menyimpan dokumen & riwayat chat |
| 🔐 **Autentikasi** | Login & register dengan Supabase Auth |

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3 (Dark Theme + Glassmorphism), Vanilla JavaScript
- **Backend**: Node.js + Express (Vercel Serverless Functions)
- **AI Engine**: [Groq API](https://groq.com) — Model `llama-3.3-70b-versatile`
- **Database & Auth**: [Supabase](https://supabase.com)
- **PDF Parsing**: PDF.js (client-side)

## 📁 Struktur Project

```
AI-summarize/
├── api/
│   ├── summarize.js        # Endpoint AI rangkuman
│   └── chat.js             # Endpoint AI tanya jawab
├── public/
│   ├── index.html          # Landing page
│   ├── app.html            # Aplikasi utama
│   ├── css/
│   │   └── style.css       # Stylesheet aplikasi
│   └── js/
│       └── app.js          # Client-side logic
├── server.js               # Express server (development)
├── vercel.json             # Konfigurasi deployment Vercel
├── package.json
└── .env                    # Environment variables (tidak di-commit)
```

## 🚀 Getting Started

### 1. Clone Repository

```bash
git clone https://github.com/username/AI-summarize.git
cd AI-summarize
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment Variables

Buat file `.env` di root project:

```env
GROQ_API_KEY=your_groq_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

> **Cara mendapatkan API Key:**
> - **Groq**: Daftar gratis di [console.groq.com](https://console.groq.com) → API Keys → Create API Key
> - **Supabase**: Buat project di [supabase.com](https://supabase.com) → Settings → API

### 4. Setup Database (Supabase)

Jalankan SQL berikut di **Supabase SQL Editor**:

```sql
-- Tabel dokumen
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own documents" ON documents
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own chat messages" ON chat_messages
  FOR ALL USING (auth.uid() = user_id);
```

### 5. Jalankan Server

```bash
node server.js
```

Buka **http://localhost:3000** di browser.

## 🌐 Deployment (Vercel)

1. Push project ke GitHub
2. Import project di [vercel.com](https://vercel.com)
3. Tambahkan environment variables di Vercel Project Settings:
   - `GROQ_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
4. Deploy!

## 📊 API Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `POST` | `/api/summarize` | Mengirim teks dokumen untuk dirangkum |
| `POST` | `/api/chat` | Tanya jawab seputar dokumen |

### Contoh Request — Summarize

```json
POST /api/summarize
{
  "text": "Isi dokumen PDF yang sudah diekstrak..."
}
```

### Contoh Request — Chat

```json
POST /api/chat
{
  "question": "Apa inti utama dokumen ini?",
  "context": "Isi dokumen PDF...",
  "history": []
}
```

## ⚡ Groq API (Free Tier)

| Limit | Nilai |
|-------|-------|
| Request/menit | 30 |
| Request/hari | 14.400 |
| Model | Llama 3.3 70B Versatile |
| Biaya | **Gratis** |

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">
  Made with ❤️ by <strong>Ayyub</strong> — Powered by Groq AI
</p>
