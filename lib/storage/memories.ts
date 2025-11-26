import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { Memory } from '@/types';
import { withFileLock } from './lock';
import { getRuntimePaths } from '@/config/runtime';

const { dataDir } = getRuntimePaths();
const DATA_DIR = path.join(dataDir, 'memories');

/**
 * 确保角色记忆目录存在
 */
async function ensureCharacterDir(characterId: string): Promise<void> {
  const characterDir = path.join(DATA_DIR, characterId);
  try {
    await fs.access(characterDir);
  } catch {
    await fs.mkdir(characterDir, { recursive: true });
  }
}

/**
 * 获取指定角色的所有记忆
 */
export async function getMemoriesByCharacter(characterId: string): Promise<Memory[]> {
  try {
    await ensureCharacterDir(characterId);
    const characterDir = path.join(DATA_DIR, characterId);
    const files = await fs.readdir(characterDir);
    const mdFiles = files.filter(f => f.endsWith('.md'));
    
    const memories = await Promise.all(
      mdFiles.map(async (file) => {
        const filePath = path.join(characterDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const stats = await fs.stat(filePath);
        
        return {
          filename: file,
          content,
          createdAt: stats.birthtime,
        } as Memory;
      })
    );
    
    return memories.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    console.error('Error reading memories:', error);
    return [];
  }
}

/**
 * 为角色创建记忆文件
 */
export async function createMemory(
  characterId: string,
  content: string
): Promise<Memory> {
  try {
    await ensureCharacterDir(characterId);
    
    // 使用时间戳 + UUID 确保文件名唯一性，避免并发冲突
    const timestamp = Date.now();
    const uniqueId = randomUUID().split('-')[0]; // 取 UUID 的前8个字符
    const filename = `memory_${timestamp}_${uniqueId}.md`;
    const characterDir = path.join(DATA_DIR, characterId);
    const filePath = path.join(characterDir, filename);
    
    return await withFileLock(filePath, async () => {
      await fs.writeFile(filePath, content, 'utf-8');
      
      const stats = await fs.stat(filePath);
      
      return {
        filename,
        content,
        createdAt: stats.birthtime,
      };
    });
  } catch (error) {
    console.error('Error creating memory:', error);
    throw error;
  }
}

/**
 * 删除记忆文件
 */
export async function deleteMemory(
  characterId: string,
  filename: string
): Promise<boolean> {
  try {
    const characterDir = path.join(DATA_DIR, characterId);
    const filePath = path.join(characterDir, filename);
    
    // 安全检查：确保文件名是 .md 结尾且不包含路径分隔符
    if (!filename.endsWith('.md') || filename.includes('/') || filename.includes('\\')) {
      return false;
    }
    
    return await withFileLock(filePath, async () => {
      await fs.unlink(filePath);
      return true;
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    console.error('Error deleting memory:', error);
    throw error;
  }
}

/**
 * 获取单个记忆文件内容
 */
export async function getMemory(
  characterId: string,
  filename: string
): Promise<Memory | null> {
  try {
    const characterDir = path.join(DATA_DIR, characterId);
    const filePath = path.join(characterDir, filename);
    
    // 安全检查
    if (!filename.endsWith('.md') || filename.includes('/') || filename.includes('\\')) {
      return null;
    }
    
    const content = await fs.readFile(filePath, 'utf-8');
    const stats = await fs.stat(filePath);
    
    return {
      filename,
      content,
      createdAt: stats.birthtime,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    console.error('Error reading memory:', error);
    throw error;
  }
}

/**
 * 更新记忆文件内容
 */
export async function updateMemory(
  characterId: string,
  filename: string,
  content: string
): Promise<Memory | null> {
  try {
    const characterDir = path.join(DATA_DIR, characterId);
    const filePath = path.join(characterDir, filename);
    
    // 安全检查
    if (!filename.endsWith('.md') || filename.includes('/') || filename.includes('\\')) {
      return null;
    }
    
    // 检查文件是否存在
    try {
      await fs.access(filePath);
    } catch {
      return null;
    }
    
    return await withFileLock(filePath, async () => {
      await fs.writeFile(filePath, content, 'utf-8');
      const stats = await fs.stat(filePath);
      
      return {
        filename,
        content,
        createdAt: stats.birthtime,
      };
    });
  } catch (error) {
    console.error('Error updating memory:', error);
    throw error;
  }
}
