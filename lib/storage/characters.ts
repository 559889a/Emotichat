import fs from 'fs/promises';
import path from 'path';
import { Character } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data', 'characters');

/**
 * 确保数据目录存在
 */
async function ensureDataDir(): Promise<void> {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

/**
 * 获取所有角色列表
 */
export async function getAllCharacters(): Promise<Character[]> {
  try {
    await ensureDataDir();
    const files = await fs.readdir(DATA_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    const characters = await Promise.all(
      jsonFiles.map(async (file) => {
        const content = await fs.readFile(path.join(DATA_DIR, file), 'utf-8');
        const data = JSON.parse(content);
        return {
          ...data,
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt),
        } as Character;
      })
    );
    
    return characters.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    console.error('Error reading characters:', error);
    return [];
  }
}

/**
 * 根据 ID 获取单个角色
 */
export async function getCharacterById(id: string): Promise<Character | null> {
  try {
    await ensureDataDir();
    const filePath = path.join(DATA_DIR, `${id}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    } as Character;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    console.error('Error reading character:', error);
    throw error;
  }
}

/**
 * 创建新角色
 */
export async function createCharacter(
  data: Omit<Character, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Character> {
  try {
    await ensureDataDir();
    
    const now = new Date();
    const character: Character = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    
    const filePath = path.join(DATA_DIR, `${character.id}.json`);
    const jsonData = {
      ...character,
      createdAt: character.createdAt.toISOString(),
      updatedAt: character.updatedAt.toISOString(),
    };
    
    await fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), 'utf-8');
    
    return character;
  } catch (error) {
    console.error('Error creating character:', error);
    throw error;
  }
}

/**
 * 更新角色信息
 */
export async function updateCharacter(
  id: string,
  data: Partial<Omit<Character, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Character | null> {
  try {
    await ensureDataDir();
    const existing = await getCharacterById(id);
    
    if (!existing) {
      return null;
    }
    
    const updated: Character = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
    
    const filePath = path.join(DATA_DIR, `${id}.json`);
    const jsonData = {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
    
    await fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), 'utf-8');
    
    return updated;
  } catch (error) {
    console.error('Error updating character:', error);
    throw error;
  }
}

/**
 * 删除角色
 */
export async function deleteCharacter(id: string): Promise<boolean> {
  try {
    await ensureDataDir();
    const filePath = path.join(DATA_DIR, `${id}.json`);
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    console.error('Error deleting character:', error);
    throw error;
  }
}