import fs from 'fs/promises';
import path from 'path';
import { Character, CreateCharacterInput, UpdateCharacterInput, CharacterPromptConfig } from '@/types';
import { withFileLock } from './lock';

const DATA_DIR = path.join(process.cwd(), 'data', 'characters');

/**
 * 为旧版角色数据创建默认的 promptConfig
 * 向后兼容：从旧字段迁移到新的提示词系统
 */
function ensurePromptConfig(character: Character): Character {
  // 如果已经有 promptConfig，直接返回
  if (character.promptConfig) {
    return character;
  }
  
  // 从旧格式创建默认 promptConfig
  const defaultPromptConfig: CharacterPromptConfig = {
    openingMessage: '',
    prompts: [],
    exampleDialogues: [],
    inheritFromPreset: undefined,
    overridePreset: false,
  };
  
  // 迁移 systemPrompt
  if (character.systemPrompt) {
    defaultPromptConfig.prompts.push({
      id: `system-migrated-${character.id}`,
      order: 0,
      content: character.systemPrompt,
      enabled: true,
      role: 'system',
      name: 'System Prompt',
      description: '从旧版本自动迁移的系统提示词',
    });
  }
  
  // 迁移 background
  if (character.background) {
    defaultPromptConfig.prompts.push({
      id: `background-migrated-${character.id}`,
      order: 1,
      content: character.background,
      enabled: true,
      role: 'system',
      name: 'Background',
      description: '从旧版本自动迁移的背景故事',
    });
  }
  
  // 迁移 exampleDialogues
  if (character.exampleDialogues && character.exampleDialogues.length > 0) {
    defaultPromptConfig.exampleDialogues = character.exampleDialogues.map((content, index) => {
      // 尝试解析 "User: xxx\nAssistant: xxx" 格式
      const lines = content.split('\n');
      let user = '';
      let assistant = '';
      
      for (const line of lines) {
        const lowerLine = line.toLowerCase();
        if (lowerLine.startsWith('user:')) {
          user = line.substring(5).trim();
        } else if (lowerLine.startsWith('assistant:') || lowerLine.startsWith('ai:')) {
          assistant = line.substring(line.indexOf(':') + 1).trim();
        }
      }
      
      // 如果解析失败，将整个内容作为 assistant 回复
      if (!user && !assistant) {
        assistant = content;
      }
      
      return {
        id: `example-migrated-${character.id}-${index}`,
        order: index,
        user,
        assistant,
        enabled: true,
      };
    });
  }
  
  return {
    ...character,
    promptConfig: defaultPromptConfig,
  };
}

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
        const character = JSON.parse(content) as Character;
        // 确保向后兼容性：为旧角色添加默认的 promptConfig
        return ensurePromptConfig(character);
      })
    );
    
    // 按创建时间降序排序
    return characters.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
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
    const character = JSON.parse(content) as Character;
    // 确保向后兼容性：为旧角色添加默认的 promptConfig
    return ensurePromptConfig(character);
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
  data: CreateCharacterInput
): Promise<Character> {
  try {
    await ensureDataDir();
    
    const now = new Date().toISOString();
    const character: Character = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    
    const filePath = path.join(DATA_DIR, `${character.id}.json`);
    
    await withFileLock(filePath, async () => {
      await fs.writeFile(filePath, JSON.stringify(character, null, 2), 'utf-8');
    });
    
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
  data: UpdateCharacterInput
): Promise<Character | null> {
  try {
    await ensureDataDir();
    const filePath = path.join(DATA_DIR, `${id}.json`);
    
    return await withFileLock(filePath, async () => {
      // 在锁保护下重新读取，确保获取最新数据
      const existing = await getCharacterById(id);
      
      if (!existing) {
        return null;
      }
      
      const updated: Character = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      };
      
      await fs.writeFile(filePath, JSON.stringify(updated, null, 2), 'utf-8');
      
      return updated;
    });
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
    
    return await withFileLock(filePath, async () => {
      await fs.unlink(filePath);
      return true;
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    console.error('Error deleting character:', error);
    throw error;
  }
}