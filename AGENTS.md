<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Proje Anayasası: YouTube Content Manager & AI Assistant

Bu dosya, projenin kalıcı hafızasıdır. Yeni bir sohbet (session) başlatıldığında sistem bu kuralları otomatik olarak okur ve projeye tam hakim olarak uyanır.

## 1. Veritabanı ve Mimari (Supabase)
- **Ana Veritabanı:** Supabase kullanılmaktadır. `localStorage` kullanımı tamamen sonlandırılmıştır.
- **VideoContext:** Tüm veriler `src/context/VideoContext.tsx` üzerinden yönetilir. 
- **Optimistic UI:** Context üzerindeki CRUD işlemlerinde daima Optimistic UI (İyimser Arayüz) kullanılır. Veri önce ekrana çizilir, arka planda Supabase'e gönderilir.
- **RLS (Row Level Security):** Test aşamasında `projects` tablosunda RLS deaktif edilmiştir. SaaS aşamasına geçildiğinde Auth ile birlikte aktif edilecektir.

## 2. Yapay Zeka ve Prompt Mühendisliği (Gemini)
- **Temperature (Sıcaklık):** Gemini API çağrılarında daima yüksek yaratıcılık için `temperature: 0.9` kullanılmalıdır. Sistem asla tekrara düşmemeli, her üretilişte yepyeni açılar sunmalıdır.
- **Rol ve Strateji:** AI düz bir metin yazarı değildir. Milyonlarca izlenen kanalları yöneten "Viral YouTube Stratejisti" rolündedir. Her zaman "Merak Duygusu (Curiosity Gap)", "Tıklanma Oranı (CTR)" ve "İzlenme Süresi (Retention)" odaklı Clickbait tarzı akıllı fikirler üretmelidir.

## 3. Gelecek Vizyonu: Semantic Caching (Cevap Havuzu)
- **SaaS Maliyet Düşürme:** Proje bir SaaS'a dönüştüğünde, kullanıcıların ürettiği başarılı "Fikirler" Supabase'de birikecektir.
- Sistem yeni bir sorgu geldiğinde Gemini API'ye gitmeden önce Supabase havuzunu tarayacak (Semantic Caching), aynı veya benzer bir konu varsa cevabı oradan döndürecektir. Böylece API masrafları minimize edilecektir.

## 4. UI ve Etkileşim Kuralları (Bağımsız Kartlar)
- **Idea Aşaması:** Ekranda 3 bağımsız fikir kartı (Card) bulunur.
- Her kartın kendi "Revize Et" ve "Toparla" butonu vardır. Bir karta yapılan müdahale (API çağrısı) kesinlikle diğer kartları etkilememelidir.
- "Bu Fikri Seç" butonuna basıldığında o fikir Supabase'e kaydedilir, diğer kartlar temizlenip tekli-metin moduna geçilir.
