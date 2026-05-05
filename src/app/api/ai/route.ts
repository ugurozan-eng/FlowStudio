import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Rate limiting için basit in-memory store (production'da Redis kullanılmalı)
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 30; // dakika başına
const RATE_WINDOW = 60 * 1000; // 1 dakika

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);
  
  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

// API Key validation
function validateApiKey(): { valid: boolean; error?: string } {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { valid: false, error: "GEMINI_API_KEY bulunamadı. Lütfen .env dosyasını kontrol edin." };
  }
  if (apiKey.length < 20) {
    return { valid: false, error: "GEMINI_API_KEY geçersiz görünüyor." };
  }
  return { valid: true };
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  
  try {
    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ 
        error: "Çok fazla istek. Lütfen biraz bekleyin.",
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

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

    const { project, action, stage, language = 'tr', storyboardTool = 'midjourney', humanizeLevel = 'Orta', currentText = '', revisionPrompt = '' } = await req.json();

    if (!project || !action) {
      return NextResponse.json({
        error: "Eksik parametreler: project ve action gereklidir.",
        requestId,
      }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.1-pro-preview",
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 8192,
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      ],
    });

    let humanizeInstruction = "";
    if (humanizeLevel === 'Yüksek') {
      humanizeInstruction = language === 'en'
        ? "IMPORTANT: Do NOT make it sound like AI-generated text. Use very natural, flowing, conversational language as if a real person is speaking in a YouTube video. Absolutely avoid robotic words and AI clichés."
        : "ÖNEMLİ: Metni kesinlikle bir yapay zeka tarafından yazılmış gibi hissettirme. Çok doğal, akıcı, samimi, sanki bir insan YouTube videosunda konuşuyormuş gibi bir dil kullan. Robotik kelimelerden ve yapay zeka klişelerinden kesinlikle kaçın.";
    } else if (humanizeLevel === 'Düşük') {
      humanizeInstruction = language === 'en'
        ? "IMPORTANT: Use a more standard, straightforward, and technical/explanatory language."
        : "ÖNEMLİ: Daha standart, düz ve teknik/açıklayıcı bir dil kullan.";
    } else {
      humanizeInstruction = language === 'en'
        ? "IMPORTANT: Use natural, flowing language suitable for YouTube."
        : "ÖNEMLİ: Doğal, akıcı ve YouTube için uygun anlaşılır bir dil kullan.";
    }

    const languageInstruction = language === 'en'
      ? "\n\nCRITICAL: Write the ENTIRE output in ENGLISH. Do not use any other language."
      : "\n\nKRİTİK: Çıktının TAMAMINI TÜRKÇE yaz. Başka dil kullanma.";

    let prompt = "";

    if (action === 'revise') {
      prompt = language === 'en'
        ? `Revise the following text according to the instruction:\n\nInstruction: ${revisionPrompt}\n\nCurrent Text:\n${currentText}\n\n${humanizeInstruction}${languageInstruction}`
        : `Aşağıdaki metni verilen talimata göre revize et:\n\nTalimat: ${revisionPrompt}\n\nMevcut Metin:\n${currentText}\n\n${humanizeInstruction}${languageInstruction}`;
    } else if (action === 'reshape') {
      prompt = language === 'en'
        ? `The user made some manual changes to the text below. Without changing the meaning or added parts, just polish grammar and flow to create a professional, error-free final version.\n\nCurrent Text:\n${currentText}\n\n${humanizeInstruction}${languageInstruction}`
        : `Kullanıcı aşağıdaki metinde bazı manuel değişiklikler yaptı. Anlamını ve eklenen kısımları kesinlikle bozmadan, sadece dilbilgisini ve akışını toparlayarak profesyonel, hatasız bir son hale getir.\n\nMevcut Metin:\n${currentText}\n\n${humanizeInstruction}${languageInstruction}`;
    } else {
      let basePrompt = "";
      switch (stage) {
        case 'Idea':
          basePrompt = language === 'en'
            ? `You are a top-tier "YouTube Strategist & Viral Content Consultant" managing channels with millions of views. Your job is to take ordinary ideas and transform them to maximize click-through rate (CTR) and watch time (Retention).\n\nNow, for a project with the title/idea "${project.title}", write exactly 3 COMPLETELY DIFFERENT, original, creative, and high-potential video topic/angle suggestions.\nSuggestions should trigger the curiosity gap and create a "I must watch this" feeling.\n\nCRITICAL: Output MUST be a pure JSON array in this format: ["Idea 1...", "Idea 2...", "Idea 3..."]. No markdown, no extra text.\n\nWrite the entire output in ENGLISH.`
            : `Sen, milyonlarca izlenen YouTube kanalları yöneten üst düzey bir "YouTube Stratejisti ve Viral İçerik Danışmanı"sın. Senin görevin, sıradan fikirleri alıp onları tıklanma oranını (CTR) ve izlenme süresini (Retention) en üst düzeye çıkaracak şekilde dönüştürmektir.\n\nŞimdi "${project.title}" başlığına veya fikrine sahip bir proje için tam olarak 3 tane BİRBİRİNDEN TAMAMEN FARKLI, orijinal, yaratıcı ve çok yüksek izlenme potansiyeli olan video konusu/açısı önerisi yaz.\nÖneriler, insanların merak duygusunu (curiosity gap) tetiklemeli ve "bunu kesin izlemeliyim" hissi uyandırmalıdır.\n\nÖNEMLİ: Çıktıyı KESİNLİKLE markdown veya ekstra metin olmadan, doğrudan ["Fikir 1...", "Fikir 2...", "Fikir 3..."] formatında saf bir JSON dizisi (Array) olarak ver.\n\nÇıktının TAMAMINI TÜRKÇE yaz.`;
          break;
        case 'Script':
          basePrompt = language === 'en'
            ? `Write a detailed video script for the video titled "${project.title}" with the following idea: ${project.description}. Include intro, development, and conclusion sections. Use engaging language suitable for YouTube.\n\nWrite the entire script in ENGLISH.`
            : `"${project.title}" başlıklı ve şu fikirle yola çıkan video için detaylı bir video senaryosu yaz: ${project.description}. Giriş, gelişme ve sonuç bölümleri olsun. YouTube için ilgi çekici bir dil kullan.\n\nSenaryonun TAMAMINI TÜRKÇE yaz.`;
          break;
        case 'ElevenLabs':
          basePrompt = language === 'en'
            ? `Format the following VIDEO SCRIPT for ElevenLabs TTS voiceover.\n\nDO NOT SHORTEN, TRIM, OR SUMMARIZE. Keep all content, just convert to ElevenLabs-compatible format:\n\n- Use "..." for natural breath pauses between sentences\n- Write emphasized words in ALL CAPS\n- Use ↑ for rising tone, ↓ for falling tone\n- Use "[pause: 2s]" for longer pauses\n- Mark emotional transitions in brackets: [excited], [calm], [tense], [intriguing], [dramatic]\n- Use "[SCENE CHANGE]" for topic/scene shifts\n- Do NOT add "Duration: X min" or "Tone: Y" metadata — only pure formatted script\n\nCURRENT SCRIPT:\n${currentText}`
            : `Aşağıdaki VİDEO SENARYOSUNU ElevenLabs TTS seslendirmesi için formatla.\n\nSENARYOYU KISALTMA, KIRPMA, ÖZETLEME. Tüm içeriği koru, sadece ElevenLabs'ın anlayacağı formata dönüştür:\n\n- Her cümle arasına doğal nefes boşlukları için "..." koy\n- Vurgulanması gereken kelimeleri BÜYÜK HARFLE yaz\n- Ses tonu yükselmesi gereken yerlerde ↑, alçalması gereken yerlerde ↓ işareti koy\n- Uzun duraksamalar için "[pause: 2s]" formatını kullan\n- Duygusal geçişleri köşeli parantez içinde belirt: [heyecanlı], [sakin], [gergin], [merak uyandıran], [dramatik]\n- Konu veya sahne değişimlerinde "[SAHNE DEGISIMI]" yaz\n- Script'in başına "Süre: X dakika" veya "Ton: Y" gibi meta bilgi EKLEME — sadece saf formatlanmış senaryo metni\n\nMEVCUT SENARYO:\n${currentText}`;
          break;
        case 'Storyboard': {
          const toolInstructions: Record<string, string> = {
            midjourney: language === 'en'
              ? `Format as MIDJOURNEY prompts:\n- Comma-separated descriptive style, cinematic language\n- Include: shot type, lighting, color palette, mood, key objects, composition\n- End each prompt with: --ar 16:9 --v 6.0\n- Example: "Low-angle cinematic shot, rain-slicked neon street, man in trench coat walking, moody noir lighting, wet reflections on pavement, high contrast, 8K --ar 16:9 --v 6.0"`
              : `MIDJOURNEY formatında prompt olarak yaz:\n- Virgülle ayrılmış betimleyici stil, sinematik dil\n- Şunları içer: çekim açısı, ışık, renk paleti, duygu/mood, ana nesneler, kompozisyon\n- Her prompt'un sonuna ekle: --ar 16:9 --v 6.0\n- Örnek: "Low-angle cinematic shot, rain-slicked neon street, man in trench coat walking, moody noir lighting, wet reflections on pavement, high contrast, 8K --ar 16:9 --v 6.0"`,
            leonardo: language === 'en'
              ? `Format as LEONARDO AI prompts:\n- Natural descriptive style with photorealistic emphasis\n- Include: "Photorealistic, cinematic lighting, highly detailed, 8K, sharp focus"\n- Add technical tags at the end: cinematic, dramatic lighting, hyperrealistic\n- Example: "A man in a business suit walking through a rain-slicked airport terminal at night, neon reflections, Photorealistic, cinematic lighting, highly detailed, 8K, sharp focus, cinematic, dramatic lighting, hyperrealistic"`
              : `LEONARDO AI formatında prompt olarak yaz:\n- Doğal betimleyici stil, fotogerçekçi vurgulu\n- Şunları ekle: "Photorealistic, cinematic lighting, highly detailed, 8K, sharp focus"\n- Sona teknik etiketler ekle: cinematic, dramatic lighting, hyperrealistic\n- Örnek: "A man in a business suit walking through a rain-slicked airport terminal at night, neon reflections, Photorealistic, cinematic lighting, highly detailed, 8K, sharp focus, cinematic, dramatic lighting, hyperrealistic"`,
            kling: language === 'en'
              ? `Format as KLING AI video prompts:\n- Describe the scene INCLUDING CAMERA MOVEMENT\n- Start with motion direction: "Camera slowly pans...", "Static shot of...", "Dolly zoom into..."\n- Describe subject, environment, lighting, and movement within the frame\n- Mention duration feel: "Slow, atmospheric buildup"\n- Example: "Camera slowly pans left across a rain-slicked neon street, a man in a trench coat walks with purpose, wet reflections shimmer, moody noir lighting, slow atmospheric buildup"`
              : `KLING AI video prompt formatında yaz:\n- KAMERA HAREKETİNİ de içeren sahne tanımı\n- Hareket yönüyle başla: "Kamera yavaşça sola kayar...", "Sabit çekim...", "Zoom ile yaklaşır..."\n- Özne, ortam, ışık ve kadraj içi hareketi tanımla\n- Süre hissi belirt: "Yavaş, atmosferik yükseliş"\n- Örnek: "Camera slowly pans left across a rain-slicked neon street, a man in a trench coat walks with purpose, wet reflections shimmer, moody noir lighting, slow atmospheric buildup"`,
            runway: language === 'en'
              ? `Format as RUNWAY Gen-3 prompts:\n- Structured format with camera, lighting, movement, subject sections\n- camera: [shot type and angle]\n- lighting: [style and mood]\n- movement: [camera and subject motion]\n- subject: [what/who is in frame]\n- Example: "camera: low-angle tracking shot / lighting: moody neon noir, high contrast / movement: subject walks with purpose, rain falls slowly / subject: man in trench coat on rain-slicked street"`
              : `RUNWAY Gen-3 formatında prompt olarak yaz:\n- Yapılandırılmış format: camera, lighting, movement, subject\n- camera: [çekim türü ve açısı]\n- lighting: [stil ve atmosfer]\n- movement: [kamera ve özne hareketi]\n- subject: [kadrajdaki kişi/nesne]\n- Örnek: "camera: low-angle tracking shot / lighting: moody neon noir, high contrast / movement: subject walks with purpose, rain falls slowly / subject: man in trench coat on rain-slicked street"`,
          };

          const toolPrompt = toolInstructions[storyboardTool] || toolInstructions.midjourney;

          basePrompt = language === 'en'
            ? `You are creating a STORYBOARD from an ElevenLabs script. Your output must INTERLEAVE story text with visual prompts.\n\nCRITICAL RULES:\n1. Output MUST have 20-25 visual prompts for a 10-minute video (roughly one every 20-30 seconds)\n2. Do NOT just use existing [SCENE CHANGE] markers — also create NEW prompts within long sections where the topic shifts\n3. FORMAT: After each story section, insert a visual prompt block BEFORE the next [SCENE CHANGE]\n\nOUTPUT FORMAT (follow EXACTLY):\n\n🎬 [MM:SS]\n${storyboardTool}: prompt text here\n\n---HİKAYE---\n[scene text from the script goes here]\n---GÖRSEL---\n\n(repeat this pattern for ALL scenes)\n\nRULES FOR PROMPTS:\n- Be EXTREMELY SPECIFIC: include objects, colors, lighting, camera angle, composition\n- The prompt MUST visually represent exactly what is being SAID in that section\n- Example: if the script says "a father drinking whiskey while telling a story at the kitchen table", the prompt MUST include: whiskey glass, kitchen table, father figure, storytelling mood\n- NEVER use generic phrases like "a man talking" or "some people discussing"\n\n${toolPrompt}\n\nSCRIPT:\n${currentText}`
            : `Sen bir STORYBOARD oluşturucusun. ElevenLabs script'inden hikaye metni VE görsel prompt'ları İÇ İÇE geçmiş şekilde üret.\n\nKRİTİK KURALLAR:\n1. 10 dakikalık video için TAM 20-25 görsel prompt'u ÇIKARMAK ZORUNDASIN (her 20-30 saniyede bir)\n2. SADECE mevcut [SAHNE DEGISIMI] noktalarını kullanma — uzun bölümlerde konu değişimlerinde EK prompt'lar oluştur\n3. FORMAT: Her hikaye bölümünden SONRA, bir sonraki [SAHNE DEGISIMI] öncesinde görsel prompt bloğu ekle\n\nÇIKTI FORMATI (KESİNLİKLE bu formatta olacak):\n\n🎬 [DD:SS]\n${storyboardTool}: prompt metni buraya\n\n---HİKAYE---\n[script'teki ilgili bölümün metni buraya]\n---GÖRSEL---\n\n(bu kalıbı TÜM sahneler için tekrarla)\n\nPROMPT KURALLARI:\n- AŞIRI SPESİFİK ol: nesneler, renkler, ışık, kamera açısı, kompozisyon belirt\n- Prompt, TAM O BÖLÜMDE ANLATILAN şeyi görselleştirmeli\n- Örnek: script'te "babası mutfak masasında viski içerken hikaye anlattı" geçiyorsa, prompt'ta MUTLAKA şunlar olmalı: viski bardağı, mutfak masası, baba figürü, hikaye anlatma havası\n- ASLA "bir adam konuşuyor" veya "insanlar tartışıyor" gibi jenerik ifadeler KULLANMA\n\n${toolPrompt}\n\nSENARYO:\n${currentText}`;
          break;
        }
        case 'SEO/Publish':
          basePrompt = language === 'en'
            ? `For the video "${project.title}", create the best SEO optimization. Suggest 3 engaging titles, a video description, and comma-separated keywords. Write everything in ENGLISH.`
            : `"${project.title}" videosu için en iyi SEO optimizasyonunu yap. 3 farklı ilgi çekici başlık, video açıklaması ve virgülle ayrılmış anahtar kelimeler öner. Her şeyi TÜRKÇE yaz.`;
          break;
        default:
          basePrompt = language === 'en'
            ? `Provide creative suggestions for the "${stage}" stage of the video "${project.title}". Write in ENGLISH.`
            : `"${project.title}" videosunun "${stage}" aşaması için yaratıcı öneriler ver. TÜRKÇE yaz.`;
      }
      prompt = `${basePrompt}\n\n${humanizeInstruction}`;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Safety filters nedeniyle boş yanıt kontrolü
    if (!text || text.trim().length < 10) {
      console.warn(`⚠️ [${requestId}] Boş veya çok kısa AI yanıtı`);
      return NextResponse.json({ 
        content: "AI içerik üretemedi. Lütfen farklı bir talimat deneyin.",
        requestId,
      });
    }

    return NextResponse.json({ content: text, requestId });
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`❌ [${requestId}] Gemini API Error:`, error);
    
    // Spesifik hata mesajları
    let errorMessage = "AI üretilirken bir hata oluştu.";
    
    if (error.message?.includes('quota')) {
      errorMessage = "API kotası doldu. Lütfen daha sonra tekrar deneyin.";
    } else if (error.message?.includes('rate')) {
      errorMessage = "Çok hızlı istek gönderiyorsunuz. Lütfen yavaşlayın.";
    } else if (error.message?.includes('blocked')) {
      errorMessage = "İçerik güvenlik filtresi nedeniyle üretilemedi.";
    }

    return NextResponse.json({ 
      error: errorMessage,
      requestId,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    }, { status: 500 });
  }
}
