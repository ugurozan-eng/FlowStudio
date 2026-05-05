'use client';

import { useVideos } from '@/context/VideoContext';
import { VideoProject, STAGES } from '@/types/video';
import VideoCard from './VideoCard';
import { Plus } from 'lucide-react';
import { useState } from 'react';

interface KanbanBoardProps {
  onOpenAI: (project: VideoProject) => void;
}

export default function KanbanBoard({ onOpenAI }: KanbanBoardProps) {
  const { projects, addProject, isLoaded } = useVideos();
  const [newTitle, setNewTitle] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  if (!isLoaded) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 80px)' }}>
        <p style={{ color: 'var(--muted)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="spin-animation">⏳</span> Yükleniyor...
        </p>
      </div>
    );
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim()) {
      try {
        await addProject(newTitle);
        setNewTitle('');
        setShowAdd(false);
      } catch {
        // optimistic UI tarafından zaten geri alındı
      }
    }
  };

  return (
    <div style={{ display: 'flex', gap: '1.5rem', padding: '2rem', overflowX: 'auto', minHeight: 'calc(100vh - 80px)' }}>
      {STAGES.map((stage) => (
        <div key={stage} className="kanban-column">
          <div className="kanban-header">
            <span>{stage}</span>
            <span style={{ background: 'var(--card-border)', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem' }}>
              {projects.filter(p => p.status === stage).length}
            </span>
          </div>

          {stage === 'Idea' && (
            <div style={{ marginBottom: '1rem' }}>
              {!showAdd ? (
                <button 
                  onClick={() => setShowAdd(true)}
                  className="glass-panel"
                  style={{ width: '100%', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', border: '1px dashed var(--card-border)', color: 'var(--muted)' }}
                >
                  <Plus size={18} /> Yeni Fikir
                </button>
              ) : (
                <form onSubmit={handleAdd} className="premium-card" style={{ padding: '1rem' }}>
                  <input 
                    autoFocus
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Video başlığı..."
                    style={{ width: '100%', background: 'transparent', border: 'none', color: 'white', marginBottom: '0.5rem', outline: 'none', fontSize: '1rem' }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => setShowAdd(false)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.8rem' }}>İptal</button>
                    <button type="submit" style={{ background: 'var(--accent)', border: 'none', color: 'white', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>Ekle</button>
                  </div>
                </form>
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
            {projects
              .filter((p) => p.status === stage)
              .map((project) => (
                <VideoCard key={project.id} project={project} onOpenAI={onOpenAI} />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
