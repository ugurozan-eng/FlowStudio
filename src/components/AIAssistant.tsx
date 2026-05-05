'use client';

import { VideoProject, VideoStatus, STAGES, ScriptMeta, StoryboardTool } from '@/types/video';
import { useVideos } from '@/context/VideoContext';
import { useLanguage, LANG_LABELS, Language } from '@/context/LanguageContext';
import { X, Sparkles, Wand2, ArrowRightLeft, Check, RefreshCcw, Edit3, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import AISelectionPanel, { AIPersona } from './AISelectionPanel';

interface AIAssistantProps {
  project: VideoProject | null;
  onClose: () => void;
}

interface ScriptResult {
  metadata: ScriptMeta;
  scriptBody: string;
  personas?: Record<string, string>;
  selectedAIs?: string[];
}

function isScriptResult(r: unknown): r is ScriptResult {
  if (!r || typeof r !== 'object') return false;
  return 'scriptBody' in r && 'metadata' in r;
}

export default function AIAssistant({ project, onClose }: AIAssistantProps) {
  const { updateProject, moveProject } = useVideos();
  const { language, setLanguage } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | string[] | ScriptResult | null>(null);
  const [humanizeLevel, setHumanizeLevel] = useState<'Düşük' | 'Orta' | 'Yüksek'>('Orta');
  const [storyboardTool, setStoryboardTool] = useState<StoryboardTool>('midjourney');
  const [revisionPrompt, setRevisionPrompt] = useState('');
  const [ideaPrompts, setIdeaPrompts] = useState<string[]>([]);
  const [saveText, setSaveText] = useState('Değişiklikleri Uygula');
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [pendingMoveStatus, setPendingMoveStatus] = useState<VideoStatus | null>(null);

  useEffect(() => {
    if (!project) return;

    const { aiData, status, description } = project;
    let saved: string | string[] | ScriptResult | null = null;

    if (status === 'Idea' && description) {
      saved = description;
    } else if (status === 'Script' && aiData?.script) {
      saved = {
        metadata: aiData.scriptMeta || { title: project.title, duration: '?', tone: '?', targetAudience: '?' },
        scriptBody: aiData.script,
      } as ScriptResult;
    } else if (status === 'ElevenLabs' && aiData?.elevenLabsScript) {
      saved = aiData.elevenLabsScript;
    } else if (status === 'Storyboard' && aiData?.storyboardPrompts) {
      saved = aiData.storyboardPrompts;
    } else if (status === 'Thumbnail' && aiData?.thumbnailIdeas) {
      saved = aiData.thumbnailIdeas;
    } else if (status === 'SEO/Publish' && aiData?.seoTags) {
      saved = aiData.seoTags.join(', ');
    }

    setResult(saved);
    setRevisionPrompt('');
    setIdeaPrompts([]);
    setSaveText('Değişiklikleri Uygula');
    setShowAIPanel(false);
    setPendingMoveStatus(null);
    setLoading(false);
  }, [project?.id, project?.status]);

  if (!project) return null;

  const nextStageIndex = STAGES.indexOf(project.status) + 1;
  const nextStage = nextStageIndex < STAGES.length ? STAGES[nextStageIndex] : project.status;

  const requestMove = (newStatus: VideoStatus) => {
    if (newStatus === 'Script' && project.status === 'Idea') {
      setPendingMoveStatus(newStatus);
      setShowAIPanel(true);
    } else {
      executeMove(newStatus);
    }
  };

  const executeMove = (newStatus: VideoStatus) => {
    if (result) {
      const updated = { ...project };
      if (isScriptResult(result)) {
        updated.aiData = {
          ...updated.aiData,
          script: result.scriptBody,
          scriptMeta: result.metadata,
        };
      } else if (project.status === 'Idea') {
        const txt = Array.isArray(result) ? result.join('\n\n---\n\n') : (result as string);
        updated.description = txt;
      } else if (project.status === 'ElevenLabs') {
        updated.aiData = { ...updated.aiData, elevenLabsScript: result as string };
      } else if (project.status === 'Storyboard') {
        updated.aiData = { ...updated.aiData, storyboardPrompts: result as string };
      } else if (project.status === 'Thumbnail') {
        updated.aiData = { ...updated.aiData, thumbnailIdeas: result as string };
      } else if (project.status === 'SEO/Publish') {
        const tags = (result as string).split(',').map(t => t.trim());
        updated.aiData = { ...updated.aiData, seoTags: tags };
      }
      updateProject(updated);
    }
    moveProject(project.id, newStatus);
    handleClose();
  };

  const handleAIPanelConfirm = async (selectedAIs: AIPersona[]) => {
    setLoading(true);

    try {
      const response = await fetch('/api/ai/consensus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project, humanizeLevel, language, selectedAIs }),
      });

      const data = await response.json();

      if (data.error) {
        setResult('Hata: ' + data.error);
        return;
      }

      if (data.metadata && data.scriptBody) {
        const scriptData = data as ScriptResult;
        updateProject({
          ...project,
          aiData: {
            ...project.aiData,
            script: scriptData.scriptBody,
            scriptMeta: scriptData.metadata,
          },
        });
        if (pendingMoveStatus) {
          moveProject(project.id, pendingMoveStatus);
          setPendingMoveStatus(null);
          handleClose();
          return;
        }
      } else {
        setResult('Senaryo üretilemedi.');
      }
    } catch (err: unknown) {
      const error = err as Error;
      setResult('Hata: ' + error.message);
    } finally {
      setLoading(false);
      setShowAIPanel(false);
    }
  };

  const handleAIAction = async (actionType: 'generate' | 'revise' | 'reshape', targetIndex?: number) => {
    setLoading(true);

    let currentText = '';
    let revPrompt = '';

    if (targetIndex !== undefined && Array.isArray(result)) {
      currentText = result[targetIndex] as string;
      revPrompt = ideaPrompts[targetIndex] || '';
    } else {
      if (isScriptResult(result)) {
        currentText = result.scriptBody;
      } else {
        currentText = Array.isArray(result) ? JSON.stringify(result) : (result || '');
      }
      if ((project.status === 'ElevenLabs' || project.status === 'Storyboard') && !currentText && project.aiData?.script) {
        currentText = project.aiData.script;
      }
      revPrompt = revisionPrompt;
    }

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project,
          action: actionType,
          stage: project.status,
          humanizeLevel,
          language,
          storyboardTool,
          currentText,
          revisionPrompt: revPrompt,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setResult('Hata: ' + data.error);
        return;
      }

      let newResult = data.content;

      if (project.status === 'Idea' && actionType === 'generate') {
        try {
          const jsonMatch = data.content.match(/\[[\s\S]*\]/);
          if (jsonMatch) newResult = JSON.parse(jsonMatch[0]);
          else newResult = JSON.parse(data.content);
          if (!Array.isArray(newResult)) newResult = [data.content];
        } catch {
          newResult = [data.content];
        }
      }

      if (targetIndex !== undefined && Array.isArray(result)) {
        const updated = [...result as string[]];
        updated[targetIndex] = newResult;
        setResult(updated);
        if (actionType === 'revise') {
          const np = [...ideaPrompts];
          np[targetIndex] = '';
          setIdeaPrompts(np);
        }
      } else if (isScriptResult(result) && actionType !== 'generate') {
        setResult({ ...result, scriptBody: newResult });
      } else {
        setResult(newResult);
        if (Array.isArray(newResult)) setIdeaPrompts(new Array(newResult.length).fill(''));
        if (actionType === 'revise') setRevisionPrompt('');
      }
    } catch (err: unknown) {
      const error = err as Error;
      setResult('Bir hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (result && project) {
      const updated = { ...project };
      if (isScriptResult(result)) {
        updated.aiData = { ...updated.aiData, script: result.scriptBody, scriptMeta: result.metadata };
      } else if (Array.isArray(result)) {
        updated.description = result.join('\n\n---\n\n');
      } else if (typeof result === 'string') {
        if (project.status === 'Idea') updated.description = result;
        else if (project.status === 'ElevenLabs') updated.aiData = { ...updated.aiData, elevenLabsScript: result };
        else if (project.status === 'Storyboard') updated.aiData = { ...updated.aiData, storyboardPrompts: result };
        else if (project.status === 'Thumbnail') updated.aiData = { ...updated.aiData, thumbnailIdeas: result };
        else if (project.status === 'SEO/Publish') updated.aiData = { ...updated.aiData, seoTags: (result as string).split(',').map(t => t.trim()) };
      }
      updateProject(updated);
    }
    onClose();
  };

  const applyResult = () => {
    if (!result) return;
    const updated = { ...project };

    if (isScriptResult(result)) {
      updated.aiData = { ...updated.aiData, script: result.scriptBody, scriptMeta: result.metadata };
    } else if (Array.isArray(result)) {
      updated.description = result.join('\n\n---\n\n');
    } else {
      const txt = result as string;
      if (project.status === 'Idea') updated.description = txt;
      else if (project.status === 'ElevenLabs') updated.aiData = { ...updated.aiData, elevenLabsScript: txt };
      else if (project.status === 'Storyboard') updated.aiData = { ...updated.aiData, storyboardPrompts: txt };
      else if (project.status === 'Thumbnail') updated.aiData = { ...updated.aiData, thumbnailIdeas: txt };
      else if (project.status === 'SEO/Publish') updated.aiData = { ...updated.aiData, seoTags: txt.split(',').map(t => t.trim()) };
    }

    updateProject(updated);
    setSaveText('Kaydedildi!');
    setTimeout(() => setSaveText('Değişiklikleri Uygula'), 2000);
  };

  const applySpecificIdea = (idea: string) => {
    setResult(idea);
    updateProject({ ...project, description: idea });
  };

  const removeIdea = (index: number) => {
    if (Array.isArray(result)) {
      const nr = [...result as string[]];
      nr.splice(index, 1);
      const np = [...ideaPrompts];
      np.splice(index, 1);
      setIdeaPrompts(np);
      setResult(nr.length === 0 ? null : nr);
    }
  };

  const updateIdea = (index: number, val: string) => {
    if (Array.isArray(result)) {
      const nr = [...result as string[]];
      nr[index] = val;
      setResult(nr);
    }
  };

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="glass-panel"
            style={{ width: '100%', maxWidth: '1000px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', margin: '0 0.5rem' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Sparkles className="float-animation" style={{ color: 'var(--accent)' }} />
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{project.title}</h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Aşama: {project.status}</p>
                </div>
              </div>
              <button onClick={handleClose} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '1rem', overflowY: 'auto', flex: 1 }}>

              {/* Hızlı İşlemler */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--muted)', textTransform: 'uppercase', margin: 0 }}>Hızlı İşlemler</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Dil:</span>
                      <div style={{ display: 'flex', background: 'var(--glass)', border: '1px solid var(--card-border)', borderRadius: '6px', overflow: 'hidden' }}>
                        {(['tr', 'en'] as Language[]).map(lang => (
                          <button
                            key={lang}
                            onClick={() => setLanguage(lang)}
                            style={{
                              padding: '0.3rem 0.6rem',
                              border: 'none',
                              background: language === lang ? 'var(--accent)' : 'transparent',
                              color: language === lang ? 'white' : 'var(--muted)',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                          >
                            {LANG_LABELS[lang]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Doğallık (Humanize):</span>
                      <select
                        value={humanizeLevel}
                        onChange={e => setHumanizeLevel(e.target.value as typeof humanizeLevel)}
                        style={{ background: 'var(--glass)', border: '1px solid var(--card-border)', color: 'white', padding: '0.3rem 0.5rem', borderRadius: '6px', outline: 'none', fontSize: '0.8rem' }}
                      >
                        <option value="Düşük">Düşük</option>
                        <option value="Orta">Orta</option>
                        <option value="Yüksek">Yüksek</option>
                      </select>
                    </div>
                  </div>
                </div>
                {project.status === 'Storyboard' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Prompt Aracı:</span>
                    <select
                      value={storyboardTool}
                      onChange={e => setStoryboardTool(e.target.value as StoryboardTool)}
                      style={{ background: 'var(--glass)', border: '1px solid var(--card-border)', color: 'white', padding: '0.3rem 0.5rem', borderRadius: '6px', outline: 'none', fontSize: '0.8rem' }}
                    >
                      <option value="midjourney">Midjourney</option>
                      <option value="leonardo">Leonardo AI</option>
                      <option value="kling">Kling AI</option>
                      <option value="runway">Runway</option>
                    </select>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button
                    onClick={() => handleAIAction('generate')}
                    disabled={loading}
                    className="ai-glow"
                    style={{ flex: 1, background: 'var(--glass)', border: '1px solid var(--card-border)', color: 'white', padding: '1rem', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: loading ? 0.7 : 1 }}
                  >
                    {loading ? <RefreshCcw size={18} className="spin-animation" /> : <Wand2 size={18} />}
                    {loading ? 'İşleniyor...' : (result ? (Array.isArray(result) ? 'Yeni 3 Fikir Daha Getir' : 'AI ile Yeniden Üret') : 'AI ile Üret')}
                  </button>

                  {result && nextStageIndex < STAGES.length && (
                    <button
                      onClick={() => requestMove(nextStage)}
                      disabled={loading}
                      style={{
                        flex: 1,
                        background: 'var(--glass)',
                        border: '1px solid var(--card-border)',
                        color: 'white',
                        padding: '1rem',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        opacity: loading ? 0.5 : 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <ArrowRightLeft size={16} />
                      {nextStage} Aşamasına Taşı
                    </button>
                  )}
                </div>
              </div>

              {/* Sonuç Alanı */}
              {result && (
                <div>
                  {/* IDEA: 3 Kart Görünüm */}
                  {Array.isArray(result) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {(result as string[]).map((idea, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          style={{ background: 'var(--glass)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '1.25rem' }}
                        >
                          <textarea
                            value={idea}
                            onChange={e => updateIdea(i, e.target.value)}
                            style={{ width: '100%', background: 'transparent', border: 'none', color: 'white', resize: 'vertical', minHeight: '120px', outline: 'none', fontSize: '0.95rem', lineHeight: 1.6 }}
                          />
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                            <input
                              value={ideaPrompts[i] || ''}
                              onChange={e => { const np = [...ideaPrompts]; np[i] = e.target.value; setIdeaPrompts(np); }}
                              onKeyDown={e => { if (e.key === 'Enter') handleAIAction('revise', i); }}
                              placeholder="Bu fikri revize et..."
                              style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'white', padding: '0.5rem 0.75rem', borderRadius: '8px', outline: 'none', fontSize: '0.85rem' }}
                            />
                            <button onClick={() => handleAIAction('revise', i)} style={{ background: 'var(--accent)', border: 'none', color: 'white', padding: '0.5rem 0.75rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}>Revize</button>
                            <button onClick={() => handleAIAction('reshape', i)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid var(--card-border)', color: 'white', padding: '0.5rem 0.75rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}>Toparla</button>
                            <button onClick={() => applySpecificIdea(idea)} style={{ background: 'rgba(0,255,128,0.15)', border: '1px solid rgba(0,255,128,0.3)', color: '#00ff80', padding: '0.5rem 0.75rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}>
                              <Check size={14} /> Bu Fikri Seç
                            </button>
                            <button onClick={() => removeIdea(i)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,0,0,0.5)', cursor: 'pointer', padding: '0.5rem' }}>✕</button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* SCRIPT: Bölünmüş Görünüm */}
                  {isScriptResult(result) && (
                    <div>
                      <div style={{ background: 'linear-gradient(135deg, rgba(112,0,255,0.15), rgba(255,0,85,0.08))', border: '1px solid rgba(112,0,255,0.3)', borderRadius: '16px', padding: '1.25rem', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Info size={14} style={{ color: '#7000ff' }} />
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7000ff', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Video Bilgileri</span>
                          </div>
                          {result.selectedAIs && (
                            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
                              {result.selectedAIs.length} AI ile üretildi
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                          {[
                            { label: '🎯 Başlık', value: result.metadata?.title },
                            { label: '⏱️ Süre', value: result.metadata?.duration },
                            { label: '🎭 Ton', value: result.metadata?.tone },
                            { label: '👥 Hedef Kitle', value: result.metadata?.targetAudience },
                          ].map(({ label, value }) => (
                            <div key={label}>
                              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.25rem' }}>{label}</div>
                              <div style={{ fontSize: '0.9rem', color: 'white', fontWeight: 500 }}>{value || '?'}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{ background: 'var(--glass)', border: '2px solid var(--accent)', borderRadius: '12px', padding: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>📝 Senaryo Metni</span>
                        </div>
                        <textarea
                          value={result.scriptBody}
                          onChange={e => setResult({ ...result, scriptBody: e.target.value })}
                          style={{ width: '100%', background: 'transparent', border: 'none', color: 'white', resize: 'vertical', minHeight: '400px', outline: 'none', fontSize: '0.9rem', lineHeight: 1.7, fontFamily: 'inherit' }}
                        />
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                          <input
                            value={revisionPrompt}
                            onChange={e => setRevisionPrompt(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && revisionPrompt) handleAIAction('revise'); }}
                            placeholder="Senaryoyu revize et (Örn: Daha kısa yap, gençlere hitap et)"
                            style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'white', padding: '0.6rem 0.9rem', borderRadius: '8px', outline: 'none', fontSize: '0.85rem' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TEKST: Genel Metin Görünümü */}
                  {typeof result === 'string' && (
                    <div>
                      <textarea
                        value={result}
                        onChange={e => setResult(e.target.value)}
                        style={{ width: '100%', background: 'var(--glass)', border: '2px solid var(--accent)', borderRadius: '12px', padding: '1rem', color: 'white', resize: 'vertical', minHeight: '500px', outline: 'none', fontSize: '0.95rem', lineHeight: 1.6 }}
                      />
                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                        <input
                          value={revisionPrompt}
                          onChange={e => setRevisionPrompt(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && revisionPrompt) handleAIAction('revise'); }}
                          placeholder="Revize etmek için yönlendirme yazıp Enter'a basın"
                          style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'white', padding: '0.6rem 0.9rem', borderRadius: '8px', outline: 'none', fontSize: '0.85rem' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Alt Butonlar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                    <button
                      onClick={() => handleAIAction('reshape')}
                      disabled={loading}
                      style={{ background: 'transparent', border: '1px solid var(--card-border)', color: 'var(--muted)', padding: '0.6rem 1rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
                    >
                      <Edit3 size={16} /> {isScriptResult(result) ? 'Toparla' : 'Manuel Müdahaleyi Toparla'}
                    </button>
                    <button
                      onClick={applyResult}
                      style={{ background: 'var(--accent)', border: 'none', color: 'white', padding: '0.6rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <Check size={16} /> {saveText}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* AI Seçim Paneli */}
      {showAIPanel && (
        <AISelectionPanel
          onConfirm={handleAIPanelConfirm}
          onCancel={() => { setShowAIPanel(false); setPendingMoveStatus(null); }}
          isLoading={loading}
        />
      )}
    </>
  );
}
