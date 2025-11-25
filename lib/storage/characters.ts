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

/**
 * 获取激活的用户角色
 */
export async function getActiveUserProfile(): Promise<Character | null> {
  try {
    const allCharacters = await getAllCharacters();
    const activeProfile = allCharacters.find(
      char => char.isUserProfile === true && char.isActive === true
    );
    return activeProfile || null;
  } catch (error) {
    console.error('Error getting active user profile:', error);
    return null;
  }
}

/**
 * 设置激活的用户角色
 * 确保全局只有一个激活的用户角色
 */
export async function setActiveUserProfile(id: string): Promise<Character | null> {
  try {
    await ensureDataDir();

    // 1. 获取要激活的角色
    const targetCharacter = await getCharacterById(id);
    if (!targetCharacter || !targetCharacter.isUserProfile) {
      throw new Error('Character not found or is not a user profile');
    }

    // 2. 取消所有其他用户角色的激活状态
    const allCharacters = await getAllCharacters();
    for (const char of allCharacters) {
      if (char.isUserProfile && char.isActive && char.id !== id) {
        await updateCharacter(char.id, { isActive: false });
      }
    }

    // 3. 激活目标角色
    const updated = await updateCharacter(id, { isActive: true });
    return updated;
  } catch (error) {
    console.error('Error setting active user profile:', error);
    throw error;
  }
}

/**
 * 取消用户角色的激活状态
 */
export async function deactivateUserProfile(id: string): Promise<Character | null> {
  try {
    return await updateCharacter(id, { isActive: false });
  } catch (error) {
    console.error('Error deactivating user profile:', error);
    throw error;
  }
}