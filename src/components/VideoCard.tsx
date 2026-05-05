'use client';

import { VideoProject } from '@/types/video';
import { useVideos } from '@/context/VideoContext';
import { Sparkles, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface VideoCardProps {
  project: VideoProject;
  onOpenAI: (project: VideoProject) => void;
}

export default function VideoCard({ project, onOpenAI }: VideoCardProps) {
  const { deleteProject } = useVideos();

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="premium-card"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{project.title}</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={() => onOpenAI(project)}
            className="ai-glow"
            style={{ 
              background: 'var(--accent)', 
              border: 'none', 
              borderRadius: '50%', 
              width: '32px', 
              height: '32px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white'
            }}
          >
            <Sparkles size={16} />
          </button>
        </div>
      </div>

      <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: '1.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {project.description || 'Henüz bir açıklama eklenmedi...'}
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
          {(() => {
            const raw = project.updatedAt || project.createdAt;
            if (!raw) return 'Yeni';
            const d = new Date(raw);
            return isNaN(d.getTime()) ? 'Yeni' : d.toLocaleDateString('tr-TR');
          })()}
        </span>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={() => deleteProject(project.id)}
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,0,0,0.5)', cursor: 'pointer' }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
