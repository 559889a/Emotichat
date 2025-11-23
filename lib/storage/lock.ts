import lockfile from 'proper-lockfile';
import fs from 'fs/promises';
import path from 'path';

/**
 * 文件锁配置选项
 */
interface FileLockOptions {
  /** 锁定超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 重试间隔（毫秒） */
  retryInterval?: number;
}

/**
 * 默认锁配置
 */
const DEFAULT_LOCK_OPTIONS: Required<FileLockOptions> = {
  timeout: 15000, // 15秒（增加超时时间以应对高并发）
  retries: 10, // 增加重试次数
  retryInterval: 100, // 100ms（减少间隔以更快重试）
};

/**
 * 使用文件锁执行操作
 * 
 * 此函数确保对文件的读写操作是原子性的，防止并发写入导致的数据竞争问题。
 * 它会自动处理锁的获取和释放，并在发生错误时提供友好的提示。
 * 
 * @param filePath 要锁定的文件路径
 * @param operation 在锁保护下执行的操作
 * @param options 锁配置选项
 * @returns 操作的返回值
 * 
 * @example
 * ```typescript
 * // 安全地更新 JSON 文件
 * await withFileLock('/path/to/file.json', async () => {
 *   const data = await fs.readFile('/path/to/file.json', 'utf-8');
 *   const parsed = JSON.parse(data);
 *   parsed.count++;
 *   await fs.writeFile('/path/to/file.json', JSON.stringify(parsed, null, 2));
 * });
 * ```
 */
export async function withFileLock<T>(
  filePath: string,
  operation: () => Promise<T>,
  options?: FileLockOptions
): Promise<T> {
  const opts = { ...DEFAULT_LOCK_OPTIONS, ...options };
  
  // 确保文件所在目录存在
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  
  // 确保文件存在（如果不存在则创建空文件）
  // 这对于 proper-lockfile 很重要，因为它需要锁定一个存在的文件
  try {
    await fs.access(filePath);
  } catch {
    // 文件不存在，创建一个空文件
    await fs.writeFile(filePath, '', 'utf-8');
  }
  
  let release: (() => Promise<void>) | null = null;
  
  try {
    // 获取文件锁
    release = await lockfile.lock(filePath, {
      retries: {
        retries: opts.retries,
        minTimeout: opts.retryInterval,
        maxTimeout: opts.retryInterval * 2,
      },
      stale: opts.timeout,
      realpath: false, // Windows 兼容性
    });
    
    // 在锁保护下执行操作
    return await operation();
  } catch (error) {
    // 如果是锁获取失败，提供更友好的错误信息
    if (error instanceof Error && error.message.includes('already being held')) {
      throw new Error(`无法获取文件锁: ${filePath}，文件可能正在被其他进程使用`);
    }
    throw error;
  } finally {
    // 确保释放锁
    if (release) {
      try {
        await release();
      } catch (error) {
        console.error('释放文件锁时出错:', error);
      }
    }
  }
}

/**
 * 检查文件是否被锁定
 * 
 * @param filePath 文件路径
 * @returns 是否被锁定
 */
export async function isFileLocked(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return await lockfile.check(filePath, { realpath: false });
  } catch {
    return false;
  }
}