'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Character, CreateCharacterInput, UpdateCharacterInput } from '@/types/character';

interface UseCharactersReturn {
  characters: Character[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createCharacter: (input: CreateCharacterInput) => Promise<Character | null>;
  updateCharacter: (id: string, input: UpdateCharacterInput) => Promise<Character | null>;
  deleteCharacter: (id: string) => Promise<boolean>;
}

export function useCharacters(): UseCharactersReturn {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCharacters = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/characters');
      const data = await res.json();
      
      if (data.success) {
        setCharacters(data.data);
      } else {
        setError(data.error || '获取角色列表失败');
      }
    } catch (err) {
      setError('网络错误，无法获取角色列表');
      console.error('Failed to fetch characters:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);

  const createCharacter = useCallback(async (input: CreateCharacterInput): Promise<Character | null> => {
    try {
      const res = await fetch('/api/characters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });
      
      const data = await res.json();
      
      if (data.success) {
        await fetchCharacters(); // 重新获取列表
        return data.data;
      } else {
        setError(data.error || '创建角色失败');
        return null;
      }
    } catch (err) {
      setError('网络错误，无法创建角色');
      console.error('Failed to create character:', err);
      return null;
    }
  }, [fetchCharacters]);

  const updateCharacter = useCallback(async (id: string, input: UpdateCharacterInput): Promise<Character | null> => {
    try {
      const res = await fetch(`/api/characters/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });
      
      const data = await res.json();
      
      if (data.success) {
        await fetchCharacters(); // 重新获取列表
        return data.data;
      } else {
        setError(data.error || '更新角色失败');
        return null;
      }
    } catch (err) {
      setError('网络错误，无法更新角色');
      console.error('Failed to update character:', err);
      return null;
    }
  }, [fetchCharacters]);

  const deleteCharacter = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/characters/${id}`, {
        method: 'DELETE',
      });
      
      const data = await res.json();
      
      if (data.success) {
        await fetchCharacters(); // 重新获取列表
        return true;
      } else {
        setError(data.error || '删除角色失败');
        return false;
      }
    } catch (err) {
      setError('网络错误，无法删除角色');
      console.error('Failed to delete character:', err);
      return false;
    }
  }, [fetchCharacters]);

  return {
    characters,
    loading,
    error,
    refetch: fetchCharacters,
    createCharacter,
    updateCharacter,
    deleteCharacter,
  };
}