'use client';

import KanbanBoard from '@/components/KanbanBoard';
import AIAssistant from '@/components/AIAssistant';
import { VideoProject, STAGE_COLORS } from '@/types/video';
import { useVideos } from '@/context/VideoContext';
import { useState } from 'react';
import { Sparkles, Video, ChevronDown, ChevronUp, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const { projects } = useVideos();
  const [selectedProject, setSelectedProject] = useState<VideoProject | null>(null);
  const [dockOpen, setDockOpen] = useState(true);

  // Aktif projeler: sadece Idea ve Script aşamasındakiler dock'ta gösterilir
  const activeProjects = projects.filter(p => p.status === 'Idea' || p.status === 'Script');

  const handleDockSelect = (project: VideoProject) => {
    setSelectedProject(project);
  };

  return (
    <main style={{ minHeight: '100vh' }}>
      {/* Header */}
      <header style={{
        padding: '1.5rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--card-border)',
        background: 'rgba(5,5,5,0.5)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            background: 'linear-gradient(45deg, var(--accent), var(--secondary))',
            padding: '8px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Video color="white" size={24} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Studio<span style={{ color: 'var(--accent)' }}>Flow</span>
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={14} style={{ color: 'var(--accent)' }} />
            3 AI Konsensüs Aktif
          </div>
        </div>
      </header>

      {/* Kanban Board */}
      <KanbanBoard onOpenAI={setSelectedProject} />

      {/* AI Assistant Modal */}
      <AIAssistant
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
      />

      {/* ── Paralel Proje Dock ──────────────────────────────────────────── */}
      {activeProjects.length > 0 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            right: '1.5rem',
            zIndex: 90,
            width: '280px',
          }}
        >
          {/* Dock Header */}
          <button
            onClick={() => setDockOpen(v => !v)}
            style={{
              width: '100%',
              background: 'rgba(10,10,15,0.95)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: dockOpen ? '12px 12px 0 0' : '12px',
              padding: '0.6rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              color: 'white',
              backdropFilter: 'blur(16px)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bot size={14} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Aktif Projeler</span>
              <span style={{
                background: 'var(--accent)',
                color: 'white',
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: '10px',
              }}>
                {activeProjects.length}
              </span>
            </div>
            {dockOpen ? <ChevronDown size={14} style={{ color: 'var(--muted)' }} /> : <ChevronUp size={14} style={{ color: 'var(--muted)' }} />}
          </button>

          {/* Dock List */}
          <AnimatePresence>
            {dockOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  overflow: 'hidden',
                  background: 'rgba(10,10,15,0.95)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderTop: 'none',
                  borderRadius: '0 0 12px 12px',
                  backdropFilter: 'blur(16px)',
                }}
              >
                {activeProjects.map(project => {
                  const isActive = selectedProject?.id === project.id;
                  return (
                    <motion.button
                      key={project.id}
                      onClick={() => handleDockSelect(project)}
                      whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                      style={{
                        width: '100%',
                        background: isActive ? 'rgba(255,0,85,0.1)' : 'transparent',
                        border: 'none',
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                        padding: '0.65rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {/* Stage dot */}
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: STAGE_COLORS[project.status] || '#888',
                        flexShrink: 0,
                        boxShadow: `0 0 6px ${STAGE_COLORS[project.status] || '#888'}`,
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          color: isActive ? 'white' : 'rgba(255,255,255,0.75)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {project.title}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', marginTop: '1px' }}>
                          {project.status}
                        </div>
                      </div>
                      {isActive && (
                        <span style={{ fontSize: '0.65rem', color: 'var(--accent)', fontWeight: 700 }}>●</span>
                      )}
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </main>
  );
}
