import fs from 'fs/promises';
import path from 'path';
import { Conversation, Message } from '@/types';

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
        const data = JSON.parse(content);
        return {
          ...data,
          messages: data.messages.map((msg: any) => ({
            ...msg,
            createdAt: new Date(msg.createdAt),
          })),
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt),
        } as Conversation;
      })
    );
    
    return conversations.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
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
    const data = JSON.parse(content);
    
    return {
      ...data,
      messages: data.messages.map((msg: any) => ({
        ...msg,
        createdAt: new Date(msg.createdAt),
      })),
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    } as Conversation;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    console.error('Error reading conversation:', error);
    throw error;
  }
}

/**
 * 创建新对话
 */
export async function createConversation(
  data: Omit<Conversation, 'id' | 'messages' | 'createdAt' | 'updatedAt'>
): Promise<Conversation> {
  try {
    await ensureDataDir();
    
    const now = new Date();
    const conversation: Conversation = {
      id: crypto.randomUUID(),
      ...data,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    
    const filePath = path.join(DATA_DIR, `${conversation.id}.json`);
    const jsonData = {
      ...conversation,
      messages: conversation.messages.map(msg => ({
        ...msg,
        createdAt: msg.createdAt.toISOString(),
      })),
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    };
    
    await fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), 'utf-8');
    
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
  data: Partial<Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Conversation | null> {
  try {
    await ensureDataDir();
    const existing = await getConversationById(id);
    
    if (!existing) {
      return null;
    }
    
    const updated: Conversation = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
    
    const filePath = path.join(DATA_DIR, `${id}.json`);
    const jsonData = {
      ...updated,
      messages: updated.messages.map(msg => ({
        ...msg,
        createdAt: msg.createdAt.toISOString(),
      })),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
    
    await fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), 'utf-8');
    
    return updated;
  } catch (error) {
    console.error('Error updating conversation:', error);
    throw error;
  }
}

/**
 * 删除对话
 */
export async function deleteConversation(id: string): Promise<boolean> {
  try {
    await ensureDataDir();
    const filePath = path.join(DATA_DIR, `${id}.json`);
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    console.error('Error deleting conversation:', error);
    throw error;
  }
}

/**
 * 向对话添加消息
 */
export async function addMessage(
  conversationId: string,
  message: Omit<Message, 'id' | 'createdAt'>
): Promise<Conversation | null> {
  try {
    await ensureDataDir();
    const conversation = await getConversationById(conversationId);
    
    if (!conversation) {
      return null;
    }
    
    const newMessage: Message = {
      id: crypto.randomUUID(),
      ...message,
      createdAt: new Date(),
    };
    
    const updated: Conversation = {
      ...conversation,
      messages: [...conversation.messages, newMessage],
      updatedAt: new Date(),
    };
    
    const filePath = path.join(DATA_DIR, `${conversationId}.json`);
    const jsonData = {
      ...updated,
      messages: updated.messages.map(msg => ({
        ...msg,
        createdAt: msg.createdAt.toISOString(),
      })),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
    
    await fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), 'utf-8');
    
    return updated;
  } catch (error) {
    console.error('Error adding message to conversation:', error);
    throw error;
  }
}