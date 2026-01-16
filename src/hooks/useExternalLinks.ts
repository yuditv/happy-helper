import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ExternalLink {
  id: string;
  title: string;
  url: string;
  icon: string;
  order_index: number;
}

const defaultLinks: Omit<ExternalLink, 'id'>[] = [
  { title: 'Internet Ilimitada', url: 'https://servex.ws/dashboard', icon: 'Shield', order_index: 0 },
  { title: 'StreamingTV', url: 'https://bommesmo.site/#/sign-in', icon: 'Tv', order_index: 1 },
  { title: 'Lovable Créditos', url: 'https://lovable.dev/credits', icon: 'Coins', order_index: 2 },
  { title: 'Mentorias', url: 'https://mentorias.example.com', icon: 'GraduationCap', order_index: 3 },
  { title: 'Painéis', url: 'https://paineis.example.com', icon: 'LayoutDashboard', order_index: 4 },
];

// Use localStorage as fallback until table is created
const STORAGE_KEY = 'external_links';

export function useExternalLinks() {
  const { user } = useAuth();
  const [links, setLinks] = useState<ExternalLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadLinks = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setLinks(JSON.parse(stored));
      } else {
        // Initialize with defaults
        const initialLinks = defaultLinks.map((link, index) => ({
          ...link,
          id: `default-${index}`,
        }));
        setLinks(initialLinks);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initialLinks));
      }
    } catch (error) {
      console.error('Error loading links:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  const saveLinks = (newLinks: ExternalLink[]) => {
    setLinks(newLinks);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newLinks));
  };

  const addLink = (link: Omit<ExternalLink, 'id'>) => {
    const newLink: ExternalLink = {
      ...link,
      id: `link-${Date.now()}`,
    };
    const newLinks = [...links, newLink];
    saveLinks(newLinks);
    return newLink;
  };

  const updateLink = (id: string, updates: Partial<Omit<ExternalLink, 'id'>>) => {
    const newLinks = links.map(link =>
      link.id === id ? { ...link, ...updates } : link
    );
    saveLinks(newLinks);
  };

  const deleteLink = (id: string) => {
    const newLinks = links.filter(link => link.id !== id);
    saveLinks(newLinks);
  };

  const reorderLinks = (newOrder: ExternalLink[]) => {
    const reorderedLinks = newOrder.map((link, index) => ({
      ...link,
      order_index: index,
    }));
    saveLinks(reorderedLinks);
  };

  return {
    links: links.sort((a, b) => a.order_index - b.order_index),
    isLoading,
    addLink,
    updateLink,
    deleteLink,
    reorderLinks,
  };
}
