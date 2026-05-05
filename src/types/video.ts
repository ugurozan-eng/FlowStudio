// Video status tanımları
export type VideoStatus = 'Idea' | 'Script' | 'ElevenLabs' | 'Storyboard' | 'Thumbnail' | 'SEO/Publish';

// Tüm aşamalar
export const STAGES: VideoStatus[] = [
  'Idea',
  'Script',
  'ElevenLabs',
  'Storyboard',
  'Thumbnail',
  'SEO/Publish'
];

// Aşama renkleri - UI'da kullanılır
export const STAGE_COLORS: Record<VideoStatus, string> = {
  'Idea': '#ff0055',
  'Script': '#7000ff',
  'ElevenLabs': '#00c2ff',
  'Storyboard': '#00ffaa',
  'Thumbnail': '#f59e0b',
  'SEO/Publish': '#10b981',
};

// Script metadata
export interface ScriptMeta {
  title: string;
  duration: string;
  tone: string;
  targetAudience: string;
}

// AI data - her aşama için farklı içerik
export interface AIData {
  ideas?: string[];
  script?: string;
  scriptMeta?: ScriptMeta;
  elevenLabsScript?: string;
  storyboardPrompts?: string;
  storyboardTool?: StoryboardTool;
  thumbnailIdeas?: string;
  seoTags?: string[];
}

// Ana proje tipi
export interface VideoProject {
  id: string;
  title: string;
  description: string;
  status: VideoStatus;
  createdAt: string;
  updatedAt: string;
  aiData?: AIData;
}

// API response tipleri
export interface AIError {
  error: string;
  requestId?: string;
  details?: string;
}

export interface AIResponse {
  content?: string;
  requestId?: string;
}

export interface ConsensusResponse {
  metadata?: ScriptMeta;
  scriptBody?: string;
  personas?: Record<string, string>;
  selectedAIs?: string[];
  requestId?: string;
  error?: string;
}

// AI Action tipleri
export type AIActionType = 'generate' | 'revise' | 'reshape';

// Humanize seviyeleri
export type HumanizeLevel = 'Düşük' | 'Orta' | 'Yüksek';

// Dil tercihi
export type Language = 'tr' | 'en';

// Storyboard araçları
export type StoryboardTool = 'midjourney' | 'leonardo' | 'kling' | 'runway';

// AI Persona tipleri
export type AIPersona = 'strategist' | 'literary' | 'structural';

// Tip guard fonksiyonları
export function isScriptResult(r: unknown): r is { metadata: ScriptMeta; scriptBody: string } {
  return (
    typeof r === 'object' &&
    r !== null &&
    'metadata' in r &&
    'scriptBody' in r &&
    typeof (r as Record<string, unknown>).scriptBody === 'string'
  );
}

export function isVideoProject(obj: unknown): obj is VideoProject {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'title' in obj &&
    'status' in obj
  );
}

export function isValidStatus(status: string): status is VideoStatus {
  return STAGES.includes(status as VideoStatus);
}

// Yardımcı fonksiyonlar
export function getNextStage(current: VideoStatus): VideoStatus | null {
  const currentIndex = STAGES.indexOf(current);
  if (currentIndex === -1 || currentIndex >= STAGES.length - 1) return null;
  return STAGES[currentIndex + 1];
}

export function getStageColor(status: VideoStatus): string {
  return STAGE_COLORS[status] || '#888888';
}

export function formatDate(dateString: string): string {
  if (!dateString) return 'Yeni';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Yeni';
  return date.toLocaleDateString('tr-TR');
}

