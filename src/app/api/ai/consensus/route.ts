import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);
  
  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) return false;
  record.count++;
  return true;
}

function validateApiKey(): { valid: boolean; error?: string } {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { valid: false, error: "GEMINI_API_KEY eksik." };
  return { valid: true };
}

let modelInstance: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null;

function getModel() {
  if (modelInstance) return modelInstance;
  
  const apiKey = process.env.GEMINI_API_KEY!;
  const genAI = new GoogleGenerativeAI(apiKey);
  
  modelInstance = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      temperature: 0.95,
      maxOutputTokens: 8192,
    },
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ],
  });
  return modelInstance;
}

// ─── ORTAK KALITE KURALLARI ────────────────────────────────────────────────────
const QUALITY_RULES = `
KESİN YASAKLAR (bunları yaparsanız senaryo başarısız sayılır):
❌ "Merhaba sevgili izleyiciler", "Bugün size X'i anlatacağım", "Bu videoda şunu öğreneceksiniz" gibi jenerik açılış cümleleri YASAK. Senaryo DOĞRUDAN KANCAYLA başlamalı — ilk cümle izleyiciyi şoke etmeli veya düşündürmeli.
❌ Aynı CTA cümlesini birden fazla yerde kullanma. Tüm senaryoda MAKSIMUM 2 CTA olabilir: biri video ortasında, biri kapanışta.
❌ "Ve işte asıl sır şu ki..." veya benzeri bir hook ifadesini 1'den fazla kez kullanma.
❌ İzleyicinin zaten bildiği bilgileri verme. Klişe genel bilgiler YASAK.
❌ Aynı fikri farklı kelimelerle tekrar etme. Her paragraf YENİ bir bilgi veya bakış açısı sunmalı.
❌ "Unutmayın, her bünye farklıdır", "Sağlıklı yaşam tarzı benimsemek önemlidir" gibi genel, boş tavsiyeler.
❌ "scriptBody" alanı içine başlık, süre, ton veya hedef kitle bilgisi YAZMA. Bunlar SADECE "metadata" alanında olacak.

ZORUNLU KALİTE STANDARTLARI:
✅ İlk cümle: Doğrudan konuya giren, şok edici veya provoke edici bir iddia — giriş seramonisi yok.
✅ Her bölüm, izleyicinin DAHA ÖNCE DUYMADĞI, şaşırtıcı veya tartışmalı bir bulgu içermeli.
✅ Spesifik araştırma bulgularına atıf yap (örn: "2023 NEJM çalışması", "Harvard verilerine göre").
✅ Konuya karşı çıkan görüşleri de sun — çok boyutlu anlatı.
✅ Her bölüm bir öncekini KAVRAMSAL olarak ilerleten yeni bir katman açmalı.
`;

// ─── UZUNLUK TALİMATI ─────────────────────────────────────────────────────────
const LENGTH_INSTRUCTION = `
UZUNLUK KURALI: 8-12 dakikalık video = 1200-1600 kelime senaryo metni.
Her ana bölüm minimum 250 kelime. Kısaltma yapma, tamamla.
`;

// ─── 3 PERSONA PROMPT'LARI ────────────────────────────────────────────────────

function buildStrategistPrompt(title: string, description: string, humanize: string, language: string): string {
  const isEn = language === 'en';
  const langInstruction = isEn
    ? 'Write ENTIRELY in ENGLISH. No other language.'
    : 'TAMAMINI TÜRKÇE yaz. Başka dil kullanma.';

  return isEn
    ? `You are a top-tier "YouTube Viral Strategist" managing channels with millions of views.

Video Title: "${title}"
Idea/Angle: "${description}"

YOUR TASK — YOUR EXPERTISE:
- First 30 seconds: A powerful HOOK that freezes the viewer. Shocking stat, counter-intuitive question, or provocative claim. No cliché openings.
- "Pattern interrupts" between sections: transitions that break viewer expectations.
- EXACT MIDDLE of the video (minute 4-5): a "retention bomb": "What if everything I've said so far is wrong?" or similar crisis point.
- Closing: An open-ended question that forces viewers to comment, or a provocative final sentence.

${isEn ? QUALITY_RULES.replace(/Senaryo/g, 'Script').replace(/YASAK/g, 'FORBIDDEN').replace(/ZORUNLU/g, 'MANDATORY').replace(/Türkçe/g, 'English') : QUALITY_RULES}
${LENGTH_INSTRUCTION}

Output ONLY this JSON format, no other text:
{
  "metadata": {
    "title": "provocative, clickbait title",
    "duration": "8-10 minutes",
    "tone": "video tone",
    "targetAudience": "target audience"
  },
  "scriptBody": "FULL SCRIPT TEXT — do NOT include title/duration/tone info HERE"
}

${humanize === 'Yüksek' ? 'Language: Very natural, conversational, street-smart. Zero robotic tone.' : humanize === 'Düşük' ? 'Language: Standard, explanatory.' : 'Language: Natural, YouTube conversational style.'}
${langInstruction}`
    : `Sen, milyonlarca izlenen YouTube kanallarını yöneten üst düzey bir "YouTube Viral Stratejisti"sin.

Video Başlığı: "${title}"
Fikir/Açı: "${description}"

GÖREVIN — SENİN UZMANLLIK ALANLARIN:
- İlk 30 saniye: İzleyiciyi donduracak kadar güçlü bir HOOK. Şok istatistik, karşı-sezgisel soru veya provoke edici iddia. Klişe açılışlar yasak.
- Her bölüm arasında "pattern interrupt": izleyicinin beklentisini kıran bir geçiş.
- Videonun TAM ORTASINDA (4-5. dakika) bir "retention bomb": "Şimdiye kadar anlattıklarımın hepsi yanlışsa?" veya benzer bir kriz noktası.
- Kapanışta: İzleyiciyi yorum yapmaya zorlayan açık uçlu bir soru veya provoke edici son cümle.

${QUALITY_RULES}
${LENGTH_INSTRUCTION}

Çıktını SADECE bu JSON formatında ver, başka metin ekleme:
{
  "metadata": {
    "title": "provoke edici, clickbait başlık",
    "duration": "8-10 dakika",
    "tone": "video tonu",
    "targetAudience": "hedef kitle"
  },
  "scriptBody": "TAM SENARYO METNİ — başlık/süre/ton bilgisi BURAYA YAZMA"
}

${humanize === 'Yüksek' ? 'Dil: Çok doğal, samimi, sokak ağzı. Robotik sıfırdan kaçın.' : humanize === 'Düşük' ? 'Dil: Standart, açıklayıcı.' : 'Dil: Doğal, YouTube sohbet tarzı.'}
${langInstruction}`;
}

function buildLiteraryPrompt(title: string, description: string, humanize: string, language: string): string {
  const isEn = language === 'en';
  const langInstruction = isEn
    ? 'Write ENTIRELY in ENGLISH. No other language.'
    : 'TAMAMINI TÜRKÇE yaz. Başka dil kullanma.';

  return isEn
    ? `You are an award-winning documentary scriptwriter and investigative journalist. You're a master at bridging data and human stories.

Video Title: "${title}"
Idea/Angle: "${description}"

YOUR TASK — YOUR EXPERTISE:
- Open the topic through a REAL person's or group's story (anonymous anecdotes OK).
- Match every scientific finding with a concrete life experience: "Lab X showed this, which in real life means..."
- Translate controversial or complex research into simple but profound language.
- Enter the gray areas of the topic: "Everyone says X, but researcher Y disputes this."
- Close with an emotional-philosophical end that forces the viewer to question their inner world.

${isEn ? QUALITY_RULES.replace(/Senaryo/g, 'Script').replace(/YASAK/g, 'FORBIDDEN').replace(/ZORUNLU/g, 'MANDATORY') : QUALITY_RULES}
${LENGTH_INSTRUCTION}

Output ONLY this JSON format, no other text:
{
  "metadata": {
    "title": "emotional, curiosity-evoking title",
    "duration": "8-10 minutes",
    "tone": "video tone",
    "targetAudience": "target audience"
  },
  "scriptBody": "FULL SCRIPT TEXT — do NOT include title/duration/tone info HERE"
}

${humanize === 'Yüksek' ? 'Language: Very natural, emotional but not robotic.' : humanize === 'Düşük' ? 'Language: Standard, explanatory.' : 'Language: Fluent, conversational but knowledgeable.'}
${langInstruction}`
    : `Sen, ödüllü bir belgesel senaryocusu ve araştırmacı gazetecisin. Veriler ve hikayeler arasında köprü kurma sanatında ustasın.

Video Başlığı: "${title}"
Fikir/Açı: "${description}"

GÖREVIN — SENİN UZMANLLIK ALANLARIN:
- Konuyu bir kişinin veya grubun GERÇEK HİKAYESİ üzerinden aç (isimsiz anekdot kullanabilirsin).
- Her bilimsel bulguyu somut bir hayat deneyimiyle eşleştir: "Laboratuvarda X görüldü, hayatta bu şu demek."
- Tartışmalı veya karmaşık araştırmaları basit ama derin bir dille aktar.
- Konunun gri alanlarına gir: "Herkes X diyor ama Y araştırmacıları buna itiraz ediyor."
- Finalde izleyiciyi iç dünyasında sorgulamaya iten duygusal-felsefi bir kapanış.

${QUALITY_RULES}
${LENGTH_INSTRUCTION}

Çıktını SADECE bu JSON formatında ver, başka metin ekleme:
{
  "metadata": {
    "title": "duygusal, merak uyandıran başlık",
    "duration": "8-10 dakika",
    "tone": "video tonu",
    "targetAudience": "hedef kitle"
  },
  "scriptBody": "TAM SENARYO METNİ — başlık/süre/ton bilgisi BURAYA YAZMA"
}

${humanize === 'Yüksek' ? 'Dil: Çok doğal, samimi, duygusal ama robotik değil.' : humanize === 'Düşük' ? 'Dil: Standart, açıklayıcı.' : 'Dil: Akıcı, sohbet eden ama bilgili.'}
${langInstruction}`;
}

function buildStructuralPrompt(title: string, description: string, humanize: string, language: string): string {
  const isEn = language === 'en';
  const langInstruction = isEn
    ? 'Write ENTIRELY in ENGLISH. No other language.'
    : 'TAMAMINI TÜRKÇE yaz. Başka dil kullanma.';

  return isEn
    ? `You are the content director of major broadcast networks and a research content architect.

Video Title: "${title}"
Idea/Angle: "${description}"

YOUR TASK — YOUR EXPERTISE:
- Create a clear time-stamped section skeleton: [0:00-1:00], [1:00-3:00] etc.
- Give each section a DIFFERENT thematic focus — don't repeat the same idea.
- Scene directions: [Camera angle], [B-roll], [Graphics/Animation] — practical and original suggestions.
- At the end of each section, add 1-2 sentences as "cliff-hanger" transitions to pull viewers into the next section.
- Tempo management: After heavy information blocks, mark a lighter anecdote or breath point.

${isEn ? QUALITY_RULES.replace(/Senaryo/g, 'Script').replace(/YASAK/g, 'FORBIDDEN').replace(/ZORUNLU/g, 'MANDATORY') : QUALITY_RULES}
${LENGTH_INSTRUCTION}

Output ONLY this JSON format, no other text:
{
  "metadata": {
    "title": "clear, powerful title",
    "duration": "8-10 minutes",
    "tone": "video tone",
    "targetAudience": "target audience"
  },
  "scriptBody": "FULL SCRIPT TEXT, with time-stamped sections — do NOT include title/duration/tone info HERE"
}

${humanize === 'Yüksek' ? 'Language: Natural, conversational.' : humanize === 'Düşük' ? 'Language: Standard, explanatory.' : 'Language: Fluent YouTube style.'}
${langInstruction}`
    : `Sen, büyük yayın kanallarının içerik direktörü ve araştırmacı içerik mimarısın.

Video Başlığı: "${title}"
Fikir/Açı: "${description}"

GÖREVIN — SENİN UZMANLLIK ALANLARIN:
- Net zaman damgalı bölüm iskeleti oluştur: [0:00-1:00], [1:00-3:00] vb.
- Her bölüme FARKLI bir tematik odak ver — aynı fikri bölümlerde tekrarlama.
- Sahne yönlendirmeleri: [Kamera açısı], [B-roll], [Grafik/Animasyon] — pratik ve özgün öneriler.
- Her bölüm sonunda izleyiciyi bir sonraki bölüme çeken 1-2 cümlelik "cliff-hanger" geçiş.
- Tempo yönetimi: Ağır bilgi bloklarından sonra hafif bir anekdot veya nefes noktası işaretle.

${QUALITY_RULES}
${LENGTH_INSTRUCTION}

Çıktını SADECE bu JSON formatında ver, başka metin ekleme:
{
  "metadata": {
    "title": "net, güçlü başlık",
    "duration": "8-10 dakika",
    "tone": "video tonu",
    "targetAudience": "hedef kitle"
  },
  "scriptBody": "TAM SENARYO METNİ, zaman damgalı bölümlerle — başlık/süre/ton bilgisi BURAYA YAZMA"
}

${humanize === 'Yüksek' ? 'Dil: Doğal, samimi sohbet.' : humanize === 'Düşük' ? 'Dil: Standart, açıklayıcı.' : 'Dil: Akıcı YouTube dili.'}
${langInstruction}`;
}

function buildSynthesisPrompt(
  title: string,
  strategist: string,
  literary: string,
  structural: string,
  language: string
): string {
  const isEn = language === 'en';

  return isEn
    ? `You are the "Editor-in-Chief." 3 experts have written scripts. Your task: produce a UNIQUE, DEEP, and LONG final script.

Video: "${title}"

CHIEF STRATEGIST (Strong hooks and CTAs):
${strategist}

---

LITERARY WRITER (Story and research depth):
${literary}

---

STRUCTURAL MASTER (Section skeleton and tempo):
${structural}

---

SYNTHESIS RULES — FOLLOW STRICTLY:

1. STRUCTURE: Take Structural Master's time-stamped section skeleton.
2. HOOK: Use Chief Strategist's strongest opening sentence — ONLY once, at the beginning.
3. CONTENT: Place Literary Writer's research findings and stories into each section.
4. CTA: Collect CTAs from all 3 scripts, pick ONLY 2 (best mid-video + closing CTA). DELETE the rest.
5. DUPLICATE DETECTION: Find paragraphs saying the same thing, delete the weaker one. Hook phrases like "And here's the real secret..." can only be used ONCE.
6. DEPTH: Remove shallow generic paragraphs (e.g., "healthy living is important"), replace with Literary Writer's research findings.
7. LENGTH: Minimum 1400 words. DON'T shorten — remove duplicates but preserve and expand content.

Output ONLY this JSON format, no other text:
{
  "metadata": {
    "title": "the strongest, most provocative title",
    "duration": "8-10 Minutes",
    "tone": "video tone",
    "targetAudience": "target audience"
  },
  "scriptBody": "UNIQUE LONG FINAL SCRIPT — do NOT include title/duration/tone info HERE"
}
Write ENTIRELY in ENGLISH. No other language.`
    : `Sen bir "Baş Editör"sün. 3 uzman senaryo yazdı. Görevin: TEKRARSİZ, DERİN ve UZUN bir final senaryo üretmek.

Video: "${title}"

STRATEJI ŞEFİ (Hook ve CTA güçlü):
${strategist}

---

EDEBİ YAZAR (Hikaye ve araştırma derinliği güçlü):
${literary}

---

YAPISAL USTA (Bölüm iskeleti ve tempo güçlü):
${structural}

---

SENTEZ KURALLARI — KESİNLİKLE UYGULA:

1. YAPI: Yapısal Usta'nın zaman damgalı bölüm iskeletini al.
2. HOOK: Strateji Şefi'nin en güçlü açılış cümlesini kullan — SADECE başta, 1 kez.
3. İÇERİK: Her bölüme Edebi Yazar'ın araştırma bulgularını ve hikayelerini yerleştir.
4. CTA: Tüm 3 senaryodaki CTA'ları topla, SADECE 2 TANESINI seç (en iyi video ortası + kapanış CTA'sı). Geri kalanları SİL.
5. TEKRAR TESPİTİ: Aynı fikri anlatan iki paragrafı bul, zayıf olanı SİL. "Ve işte asıl sır şu ki..." gibi kalıplar SADECE 1 kez kullanılabilir.
6. DERİNLİK: Yüzeysel genel bilgiler içeren paragrafları (örn: "sağlıklı yaşam önemlidir") ÇIKAR, yerine Edebi Yazar'ın araştırma bulgularını koy.
7. UZUNLUK: Minimum 1400 kelime. Kısaltma yapma — tekrarları sil ama içeriği koru ve genişlet.

Çıktını SADECE bu JSON formatında ver, başka metin ekleme:
{
  "metadata": {
    "title": "en güçlü, provoke edici başlık",
    "duration": "8-10 Dakika",
    "tone": "video tonu",
    "targetAudience": "hedef kitle"
  },
  "scriptBody": "TEKRARSİZ UZUN FINAL SENARYO — başlık/süre/ton bilgisi BURAYA YAZMA"
}
TAMAMINI TÜRKÇE yaz. Başka dil kullanma.`;
}

function safeParseJSON(raw: string): { metadata: Record<string, string>; scriptBody: string } | null {
  try {
    // Tüm markdown code fence'leri temizle
    let cleaned = raw
      .replace(/```(?:json)?\s*/gi, '')
      .trim();

    // İlk { ile son } arasındaki JSON'u bul
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    cleaned = cleaned.slice(start, end + 1);

    const parsed = JSON.parse(cleaned);
    if (parsed?.metadata && typeof parsed.scriptBody === 'string') {
      let body: string = parsed.scriptBody.trim();

      // İç içe JSON wrapper varsa temizle
      if (body.startsWith('{') && body.includes('"metadata"') && body.includes('"scriptBody"')) {
        try {
          const innerClean = body.replace(/```(?:json)?\s*/gi, '').trim();
          const innerParsed = JSON.parse(innerClean.slice(innerClean.indexOf('{'), innerClean.lastIndexOf('}') + 1));
          if (innerParsed?.scriptBody) body = innerParsed.scriptBody;
        } catch {
          // parse edilemezse olduğu gibi bırak
        }
      }

      return { metadata: parsed.metadata, scriptBody: body };
    }
    return null;
  } catch {
    return null;
  }
}

// ─── ROUTE HANDLER ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  
  try {
    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({
        error: "Çok fazla istek. Lütfen bekleyin.",
        requestId,
      }, { status: 429 });
    }

    // API Key validation
    const keyValidation = validateApiKey();
    if (!keyValidation.valid) {
      return NextResponse.json({
        error: keyValidation.error,
        requestId,
      }, { status: 500 });
    }

    const model = getModel();
    const { project, humanizeLevel = 'Orta', language = 'tr', selectedAIs = ['strategist'] } = await req.json();

    // Input validation
    if (!project || !project.title) {
      return NextResponse.json({
        error: "Eksik parametreler: project.title gereklidir.",
        requestId,
      }, { status: 400 });
    }

    const { title, description } = project;

    // Validate selected personas
    const validPersonas = ['strategist', 'literary', 'structural'];
    const filteredAIs = (selectedAIs || []).filter((ai: string) => validPersonas.includes(ai));
    const activeAIs = filteredAIs.length > 0 ? filteredAIs : ['strategist'];

    // Paralel AI çağrıları
    const personaTasks: Promise<string>[] = [];
    const personaKeys: string[] = [];

    if (activeAIs.includes('strategist')) {
      personaKeys.push('strategist');
      personaTasks.push(
        model.generateContent(buildStrategistPrompt(title, description || '', humanizeLevel, language))
          .then(r => r.response.text())
          .catch(() => '')
      );
    }
    if (activeAIs.includes('literary')) {
      personaKeys.push('literary');
      personaTasks.push(
        model.generateContent(buildLiteraryPrompt(title, description || '', humanizeLevel, language))
          .then(r => r.response.text())
          .catch(() => '')
      );
    }
    if (activeAIs.includes('structural')) {
      personaKeys.push('structural');
      personaTasks.push(
        model.generateContent(buildStructuralPrompt(title, description || '', humanizeLevel, language))
          .then(r => r.response.text())
          .catch(() => '')
      );
    }

    const personaRawResults = await Promise.all(personaTasks);

    // Her persona'nın JSON'ını parse et
    const personaParsed: Record<string, { metadata: Record<string, string>; scriptBody: string }> = {};
    personaKeys.forEach((key, i) => {
      const parsed = safeParseJSON(personaRawResults[i]);
      personaParsed[key] = parsed || {
        metadata: { title, duration: '8-10 Dakika', tone: '?', targetAudience: '?' },
        scriptBody: personaRawResults[i],
      };
    });

    // Tek AI seçiliyse doğrudan döndür, birden fazlaysa sentez yap
    let finalMetadata: Record<string, string> | undefined;
    let finalScriptBody: string;
    const personaScripts: Record<string, string> = {};

    personaKeys.forEach(key => {
      personaScripts[key] = personaParsed[key]?.scriptBody || '';
    });

    if (personaKeys.length === 1) {
      finalMetadata = personaParsed[personaKeys[0]].metadata;
      finalScriptBody = personaParsed[personaKeys[0]].scriptBody;
    } else {
      const strategistScript = personaParsed['strategist']?.scriptBody || '';
      const literaryScript = personaParsed['literary']?.scriptBody || '';
      const structuralScript = personaParsed['structural']?.scriptBody || '';

      const synthesisRaw = await model
        .generateContent(buildSynthesisPrompt(title, strategistScript, literaryScript, structuralScript, language))
        .then(r => r.response.text())
        .catch(() => '');

      const synthesisParsed = safeParseJSON(synthesisRaw);
      finalMetadata = synthesisParsed?.metadata || personaParsed[personaKeys[0]]?.metadata;
      finalScriptBody = synthesisParsed?.scriptBody || synthesisRaw;
    }

    return NextResponse.json({
      metadata: finalMetadata,
      scriptBody: finalScriptBody,
      personas: personaScripts,
      selectedAIs: activeAIs,
      requestId,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`❌ [${requestId}] Consensus API Error:`, error);
    
    let errorMessage = "Konsensüs üretilirken hata oluştu.";
    if (error.message?.includes('quota')) {
      errorMessage = "API kotası doldu. Lütfen daha sonra deneyin.";
    } else if (error.message?.includes('rate')) {
      errorMessage = "Çok hızlı istek. Lütfen yavaşlayın.";
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        requestId,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
