import fs from 'fs/promises';
import path from 'path';
import {
  Conversation,
  Message,
  CreateConversationInput,
  ConversationSummary
} from '@/types';
import { getCharacterById } from './characters';

const DATA_DIR = path.join(process.cwd(), 'data', 'conversations');

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
 * 确保对话消息目录存在
 */
async function ensureConversationDir(conversationId: string): Promise<void> {
  const conversationDir = path.join(DATA_DIR, conversationId);
  try {
    await fs.access(conversationDir);
  } catch {
    await fs.mkdir(conversationDir, { recursive: true });
  }
}

/**
 * 获取所有对话列表
 */
export async function getAllConversations(): Promise<Conversation[]> {
  try {
    await ensureDataDir();
    const files = await fs.readdir(DATA_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    const conversations = await Promise.all(
      jsonFiles.map(async (file) => {
        const content = await fs.readFile(path.join(DATA_DIR, file), 'utf-8');
        return JSON.parse(content) as Conversation;
      })
    );
    
    // 按更新时间降序排序
    return conversations.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  } catch (error) {
    console.error('Error reading conversations:', error);
    return [];
  }
}

/**
 * 根据 ID 获取单个对话
 */
export async function getConversationById(id: string): Promise<Conversation | null> {
  try {
    await ensureDataDir();
    const filePath = path.join(DATA_DIR, `${id}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as Conversation;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    console.error('Error reading conversation:', error);
    throw error;
  }
}

/**
 * 根据角色 ID 获取对话列表
 */
export async function getConversationsByCharacter(characterId: string): Promise<Conversation[]> {
  try {
    const allConversations = await getAllConversations();
    return allConversations.filter(c => c.characterId === characterId);
  } catch (error) {
    console.error('Error getting conversations by character:', error);
    return [];
  }
}

/**
 * 创建新对话
 */
export async function createConversation(
  input: CreateConversationInput
): Promise<Conversation> {
  try {
    await ensureDataDir();
    
    const now = new Date().toISOString();
    const conversation: Conversation = {
      id: crypto.randomUUID(),
      title: input.title || '新对话',
      characterId: input.characterId,
      messageCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    
    // 保存对话元数据
    const filePath = path.join(DATA_DIR, `${conversation.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(conversation, null, 2), 'utf-8');
    
    // 创建消息目录和空消息文件
    await ensureConversationDir(conversation.id);
    const messagesPath = path.join(DATA_DIR, conversation.id, 'messages.json');
    await fs.writeFile(messagesPath, JSON.stringify([], null, 2), 'utf-8');
    
    return conversation;
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
}

/**
 * 更新对话信息
 */
export async function updateConversation(
  id: string,
  updates: { title?: string }
): Promise<Conversation> {
  try {
    await ensureDataDir();
    const existing = await getConversationById(id);
    
    if (!existing) {
      throw new Error(`Conversation ${id} not found`);
    }
    
    const updated: Conversation = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    const filePath = path.join(DATA_DIR, `${id}.json`);
    await fs.writeFile(filePath, JSON.stringify(updated, null, 2), 'utf-8');
    
    return updated;
  } catch (error) {
    console.error('Error updating conversation:', error);
    throw error;
  }
}

/**
 * 删除对话（同时删除消息文件夹）
 */
export async function deleteConversation(id: string): Promise<void> {
  try {
    await ensureDataDir();
    
    // 删除对话元数据文件
    const filePath = path.join(DATA_DIR, `${id}.json`);
    await fs.unlink(filePath);
    
    // 删除消息目录
    const conversationDir = path.join(DATA_DIR, id);
    try {
      await fs.rm(conversationDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Error deleting conversation directory:', error);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return; // 文件不存在，静默返回
    }
    console.error('Error deleting conversation:', error);
    throw error;
  }
}

/**
 * 获取对话的所有消息
 */
export async function getMessages(conversationId: string): Promise<Message[]> {
  try {
    await ensureConversationDir(conversationId);
    const messagesPath = path.join(DATA_DIR, conversationId, 'messages.json');
    
    try {
      const content = await fs.readFile(messagesPath, 'utf-8');
      return JSON.parse(content) as Message[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // 消息文件不存在，创建空文件
        await fs.writeFile(messagesPath, JSON.stringify([], null, 2), 'utf-8');
        return [];
      }
      throw error;
    }
  } catch (error) {
    console.error('Error reading messages:', error);
    throw error;
  }
}

/**
 * 添加新消息到对话
 */
export async function addMessage(
  conversationId: string,
  message: Omit<Message, 'id' | 'createdAt'>
): Promise<Message> {
  try {
    // 获取现有消息
    const messages = await getMessages(conversationId);
    
    // 创建新消息
    const newMessage: Message = {
      id: crypto.randomUUID(),
      ...message,
      createdAt: new Date().toISOString(),
    };
    
    // 添加到消息列表
    messages.push(newMessage);
    
    // 保存消息
    await ensureConversationDir(conversationId);
    const messagesPath = path.join(DATA_DIR, conversationId, 'messages.json');
    await fs.writeFile(messagesPath, JSON.stringify(messages, null, 2), 'utf-8');
    
    // 更新对话元数据
    const conversation = await getConversationById(conversationId);
    if (conversation) {
      await updateConversation(conversationId, {
        title: conversation.title,
      });
      
      // 单独更新 messageCount 和 lastMessageAt
      const updatedConversation: Conversation = {
        ...conversation,
        messageCount: messages.length,
        lastMessageAt: newMessage.createdAt,
        updatedAt: new Date().toISOString(),
      };
      
      const filePath = path.join(DATA_DIR, `${conversationId}.json`);
      await fs.writeFile(filePath, JSON.stringify(updatedConversation, null, 2), 'utf-8');
    }
    
    return newMessage;
  } catch (error) {
    console.error('Error adding message:', error);
    throw error;
  }
}

/**
 * 获取对话概要列表（包含角色名称）
 */
export async function getConversationSummaries(): Promise<ConversationSummary[]> {
  try {
    const conversations = await getAllConversations();
    
    const summaries = await Promise.all(
      conversations.map(async (conversation) => {
        // 获取关联的角色信息
        const character = await getCharacterById(conversation.characterId);
        
        return {
          id: conversation.id,
          title: conversation.title,
          characterId: conversation.characterId,
          characterName: character?.name || '未知角色',
          messageCount: conversation.messageCount,
          lastMessageAt: conversation.lastMessageAt,
          updatedAt: conversation.updatedAt,
        } as ConversationSummary;
      })
    );
    
    return summaries;
  } catch (error) {
    console.error('Error getting conversation summaries:', error);
    return [];
  }
}