'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Feather, Layers, Lock, ChevronRight, Sparkles, MousePointerClick } from 'lucide-react';
import { useState } from 'react';

export type AIPersona = 'strategist' | 'literary' | 'structural';

interface AIPersonaConfig {
  id: AIPersona;
  icon: React.ReactNode;
  name: string;
  subtitle: string;
  description: string;
  color: string;
  glowColor: string;
  isLocked: boolean;
}

interface AISelectionPanelProps {
  onConfirm: (selectedAIs: AIPersona[]) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const IS_TEST_MODE = true;

const PERSONAS: AIPersonaConfig[] = [
  {
    id: 'strategist',
    icon: <Zap size={28} />,
    name: 'Strateji Şefi',
    subtitle: 'Gemini Pro',
    description: 'Viral hook\'lar, CTR optimizasyonu ve YouTube algoritması odaklı',
    color: '#ff0055',
    glowColor: 'rgba(255,0,85,0.4)',
    isLocked: false,
  },
  {
    id: 'literary',
    icon: <Feather size={28} />,
    name: 'Edebi Yazar',
    subtitle: 'Claude Sonnet',
    description: 'Duygusal derinlik, storytelling ve akıcı anlatım',
    color: '#7000ff',
    glowColor: 'rgba(112,0,255,0.4)',
    isLocked: !IS_TEST_MODE,
  },
  {
    id: 'structural',
    icon: <Layers size={28} />,
    name: 'Yapısal Usta',
    subtitle: 'GPT-4o',
    description: 'Sahne yapısı, zamanlama ve teknik prodüksiyon yönlendirmeleri',
    color: '#00c2ff',
    glowColor: 'rgba(0,194,255,0.4)',
    isLocked: !IS_TEST_MODE,
  },
];

// ── Loading state: Her persona için animasyonlu satır ────────────────────────
function PersonaLoadingRow({ persona, index }: { persona: AIPersonaConfig; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.15 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        background: `linear-gradient(135deg, ${persona.color}15, ${persona.color}05)`,
        border: `1px solid ${persona.color}40`,
        borderRadius: '14px',
        padding: '1rem 1.25rem',
      }}
    >
      {/* Pulsing icon */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [1, 0.6, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: index * 0.3 }}
        style={{
          color: persona.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: `${persona.color}20`,
          flexShrink: 0,
        }}
      >
        {persona.icon}
      </motion.div>

      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'white', marginBottom: '0.25rem' }}>
          {persona.name}
        </div>
        <div style={{ fontSize: '0.75rem', color: `${persona.color}cc` }}>
          {persona.subtitle} — Senaryo yazılıyor...
        </div>
        {/* Animasyonlu progress bar */}
        <div style={{ marginTop: '0.5rem', height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
          <motion.div
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: index * 0.4 }}
            style={{
              height: '100%',
              width: '40%',
              background: `linear-gradient(90deg, transparent, ${persona.color}, transparent)`,
              borderRadius: '2px',
            }}
          />
        </div>
      </div>

      {/* Dönen halka */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        style={{
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          border: `2px solid ${persona.color}30`,
          borderTopColor: persona.color,
          flexShrink: 0,
        }}
      />
    </motion.div>
  );
}

export default function AISelectionPanel({ onConfirm, onCancel, isLoading }: AISelectionPanelProps) {
  const [selected, setSelected] = useState<AIPersona[]>(['strategist']);

  const toggle = (id: AIPersona, locked: boolean) => {
    if (locked) return;
    setSelected(prev =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter(a => a !== id) : prev
        : [...prev, id]
    );
  };

  const getSelectionLabel = () => {
    if (selected.length === 3) return '🔥 3 Zeka — Konsensüs Modu';
    if (selected.length === 2) return '⚡ 2 Zeka — Hibrit Mod';
    return '🎯 1 Zeka — Hızlı Mod';
  };

  const activePersonas = PERSONAS.filter(p => selected.includes(p.id));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.88)',
          zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
          backdropFilter: 'blur(10px)',
        }}
        onClick={isLoading ? undefined : onCancel}
      >
        <motion.div
          initial={{ scale: 0.85, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.85, y: 30, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          style={{
            background: 'rgba(10,10,15,0.97)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '24px',
            padding: '2rem',
            width: '100%',
            maxWidth: '680px',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* ── LOADING STATE ── */}
          {isLoading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {/* Loading Header */}
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <motion.div
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}
                >
                  <Sparkles size={20} style={{ color: '#ff0055' }} />
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0, background: 'linear-gradient(90deg, #ff0055, #7000ff, #00c2ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {activePersonas.length === 1
                      ? `${activePersonas[0].name} Senaryo Yazıyor`
                      : `${activePersonas.length} Zeka Paralel Çalışıyor`}
                  </h2>
                </motion.div>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', margin: 0 }}>
                  {activePersonas.length > 1
                    ? 'Her yapay zeka kendi uzmanlığıyla senaryo üretiyor — ardından Baş Editör sentez yapacak'
                    : 'Uzman senaryo hazırlıyor, lütfen bekleyin...'}
                </p>
              </div>

              {/* Persona loading rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {activePersonas.map((persona, i) => (
                  <PersonaLoadingRow key={persona.id} persona={persona} index={i} />
                ))}

                {/* Sentez adımı — sadece 2+ persona seçiliyse */}
                {activePersonas.length > 1 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.75rem 1.25rem',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px dashed rgba(255,255,255,0.15)',
                      borderRadius: '12px',
                      fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)',
                    }}
                  >
                    <Sparkles size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
                    Baş Editör bekliyor — sonuçları sentezleyecek...
                  </motion.div>
                )}
              </div>

              {/* Genel progress */}
              <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                <motion.div
                  animate={{ x: ['-100%', '150%'] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    height: '100%',
                    width: '50%',
                    background: 'linear-gradient(90deg, transparent, #ff0055, #7000ff, #00c2ff, transparent)',
                    borderRadius: '4px',
                  }}
                />
              </div>
            </motion.div>
          ) : (
            /* ── SELECTION STATE ── */
            <>
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Sparkles size={20} style={{ color: '#ff0055' }} />
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>
                    Hangi Zekalar Bu Senaryoyu Dokusun?
                  </h2>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: '0 0 0.75rem 0' }}>
                  Birden fazla seçersen AI{"'"}lar paralel çalışır ve sentez bir final senaryo üretilir
                </p>

                {/* Tıklanabilirlik ipucu */}
                <motion.div
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '20px', padding: '0.3rem 0.85rem',
                    fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)',
                  }}
                >
                  <MousePointerClick size={12} />
                  Kartlara tıklayarak seç veya seçimi kaldır
                </motion.div>

                {IS_TEST_MODE && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                    background: 'rgba(0,255,170,0.1)', border: '1px solid rgba(0,255,170,0.3)',
                    borderRadius: '20px', padding: '0.25rem 0.75rem',
                    fontSize: '0.75rem', color: '#00ffaa', marginTop: '0.5rem', marginLeft: '0.5rem',
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00ffaa', display: 'inline-block' }} />
                    Test Modu — Tüm AI{"'"}lar Aktif
                  </div>
                )}
              </div>

              {/* Persona Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {PERSONAS.map(persona => {
                  const isSelected = selected.includes(persona.id);
                  return (
                    <motion.button
                      key={persona.id}
                      onClick={() => toggle(persona.id, persona.isLocked)}
                      whileHover={{ scale: persona.isLocked ? 1 : 1.04, y: persona.isLocked ? 0 : -2 }}
                      whileTap={{ scale: persona.isLocked ? 1 : 0.96 }}
                      style={{
                        background: isSelected
                          ? `linear-gradient(135deg, ${persona.color}25, ${persona.color}10)`
                          : 'rgba(255,255,255,0.03)',
                        border: `1.5px solid ${isSelected ? persona.color : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: '16px',
                        padding: '1.25rem 1rem 1rem',
                        cursor: persona.isLocked ? 'not-allowed' : 'pointer',
                        textAlign: 'center',
                        position: 'relative',
                        transition: 'all 0.25s ease',
                        boxShadow: isSelected ? `0 0 24px ${persona.glowColor}` : 'none',
                        opacity: persona.isLocked ? 0.55 : 1,
                      }}
                    >
                      {/* Locked Badge */}
                      {persona.isLocked && (
                        <div style={{
                          position: 'absolute', top: '0.5rem', right: '0.5rem',
                          background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                          borderRadius: '8px', padding: '0.15rem 0.4rem',
                          fontSize: '0.6rem', fontWeight: 700, color: 'white',
                          display: 'flex', alignItems: 'center', gap: '0.2rem',
                        }}>
                          <Lock size={8} /> UPGRADE
                        </div>
                      )}

                      {/* Seçim toggle göstergesi — her zaman görünür */}
                      <div style={{
                        position: 'absolute', top: '0.5rem', left: '0.5rem',
                        width: '20px', height: '20px', borderRadius: '50%',
                        border: `2px solid ${isSelected ? persona.color : 'rgba(255,255,255,0.2)'}`,
                        background: isSelected ? persona.color : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '10px', color: 'white',
                        transition: 'all 0.2s ease',
                      }}>
                        {isSelected && (
                          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>✓</motion.span>
                        )}
                      </div>

                      {/* Icon */}
                      <div style={{ color: isSelected ? persona.color : 'rgba(255,255,255,0.35)', marginBottom: '0.5rem', marginTop: '0.25rem' }}>
                        {persona.icon}
                      </div>

                      {/* Name */}
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.15rem', color: isSelected ? 'white' : 'rgba(255,255,255,0.65)' }}>
                        {persona.name}
                      </div>

                      {/* Subtitle */}
                      <div style={{ fontSize: '0.7rem', color: isSelected ? persona.color : 'rgba(255,255,255,0.3)', marginBottom: '0.5rem', fontWeight: 600 }}>
                        {persona.subtitle}
                      </div>

                      {/* Description */}
                      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>
                        {persona.description}
                      </div>

                      {/* Seç/Seçildi alt etiketi */}
                      <div style={{
                        marginTop: '0.75rem',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        color: isSelected ? persona.color : 'rgba(255,255,255,0.25)',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                      }}>
                        {persona.isLocked ? '— Kilitli —' : isSelected ? '✓ Seçildi' : '+ Ekle'}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <button
                  onClick={onCancel}
                  style={{
                    background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
                    color: 'rgba(255,255,255,0.5)', padding: '0.75rem 1.5rem',
                    borderRadius: '12px', cursor: 'pointer', fontSize: '0.9rem',
                  }}
                >
                  İptal
                </button>

                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                    {getSelectionLabel()}
                  </div>
                </div>

                <motion.button
                  onClick={() => onConfirm(selected)}
                  disabled={selected.length === 0}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    background: 'linear-gradient(135deg, #ff0055, #7000ff)',
                    border: 'none', color: 'white',
                    padding: '0.75rem 1.75rem', borderRadius: '12px',
                    cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    boxShadow: '0 4px 20px rgba(255,0,85,0.4)',
                  }}
                >
                  Senaryoyu Üret
                  <ChevronRight size={18} />
                </motion.button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
