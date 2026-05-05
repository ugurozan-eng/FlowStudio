'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { VideoProject, VideoStatus } from '@/types/video';
import { supabase } from '@/lib/supabase';

interface VideoContextType {
  projects: VideoProject[];
  isLoaded: boolean;
  addProject: (title: string) => Promise<void>;
  updateProject: (project: VideoProject) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  moveProject: (id: string, newStatus: VideoStatus) => Promise<void>;
  refreshProjects: () => Promise<void>;
}

const VideoContext = createContext<VideoContextType | undefined>(undefined);

// Sabit bir "şimdi" timestamp'i oluştur - batch işlemlerde tutarlılık için
const now = () => new Date().toISOString();

export function VideoProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const fetchProjects = useCallback(async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('createdAt', { ascending: false });
       
    if (error) {
      console.error("❌ Error fetching projects:", error);
      setIsLoaded(true);
      return;
    }
    if (data) {
      setProjects(data as VideoProject[]);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const refreshProjects = useCallback(async () => {
    await fetchProjects();
  }, [fetchProjects]);

  const addProject = async (title: string) => {
    const tempId = crypto.randomUUID();
    const timestamp = now();
    const newProject: VideoProject = {
      id: tempId,
      title,
      description: '',
      status: 'Idea',
      aiData: {},
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // Optimistic UI - hemen göster
    setProjects(prev => [newProject, ...prev]);

    const { error } = await supabase
      .from('projects')
      .insert([newProject]);

    if (error) {
      console.error("❌ Error adding project:", error);
      // Hata durumunda optimistic update'i geri al
      setProjects(prev => prev.filter(p => p.id !== tempId));
      throw new Error(`Veritabanı Hatası: ${error.message}`);
    }
  };

  const updateProject = async (updated: VideoProject) => {
    const timestamp = now();
    
    // Optimistic update - hemen yansıt
    setProjects(prev => prev.map(p => 
      p.id === updated.id ? { ...updated, updatedAt: timestamp } : p
    ));

    const { error } = await supabase
      .from('projects')
      .update({
        title: updated.title,
        description: updated.description,
        status: updated.status,
        aiData: updated.aiData || {},
        updatedAt: timestamp
      })
      .eq('id', updated.id);

    if (error) {
      console.error("❌ Error updating project:", error);
      // Hata durumunda refresh et
      await fetchProjects();
      throw new Error(`Güncelleme Hatası: ${error.message}`);
    }
  };

  const deleteProject = async (id: string) => {
    // Optimistic delete
    setProjects(prev => prev.filter(p => p.id !== id));

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("❌ Error deleting project:", error);
      // Hata durumunda refresh et
      await fetchProjects();
      throw new Error(`Silme Hatası: ${error.message}`);
    }
  };

  const moveProject = async (id: string, newStatus: VideoStatus) => {
    const timestamp = now();
    
    setProjects(prev => prev.map(p => 
      p.id === id 
        ? { ...p, status: newStatus, updatedAt: timestamp } 
        : p
    ));

    // Supabase'e güncelle - aiData'yı koruyarak
    const { error } = await supabase
      .from('projects')
      .update({
        status: newStatus,
        updatedAt: timestamp
      })
      .eq('id', id);

    if (error) {
      console.error("❌ Error moving project:", error);
      await fetchProjects();
      throw new Error(`Taşıma Hatası: ${error.message}`);
    }
  };

  return (
    <VideoContext.Provider value={{ 
      projects, 
      isLoaded, 
      addProject, 
      updateProject, 
      deleteProject, 
      moveProject,
      refreshProjects 
    }}>
      {children}
    </VideoContext.Provider>
  );
}

export function useVideos() {
  const context = useContext(VideoContext);
  if (!context) {
    throw new Error('useVideos must be used within a VideoProvider');
  }
  return context;
}
