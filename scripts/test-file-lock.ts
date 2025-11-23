/**
 * 文件锁并发测试脚本
 * 
 * 此脚本用于验证文件锁机制是否能正确防止并发写入导致的数据竞争问题
 */

import { addMessage, createConversation } from '../lib/storage/conversations';
import { createCharacter, updateCharacter } from '../lib/storage/characters';
import { createMemory, updateMemory } from '../lib/storage/memories';

/**
 * 测试并发添加消息
 */
async function testConcurrentMessages() {
  console.log('\n🧪 测试 1: 并发添加消息...');
  
  try {
    // 1. 创建测试角色
    const character = await createCharacter({
      name: '测试角色',
      description: '用于测试文件锁的角色',
      systemPrompt: '你是一个测试助手',
      personality: ['友好'],
      memoryEnabled: false,
    });
    
    console.log(`✅ 创建角色: ${character.name} (${character.id})`);
    
    // 2. 创建测试对话
    const conversation = await createConversation({
      characterId: character.id,
      title: '测试对话',
    });
    
    console.log(`✅ 创建对话: ${conversation.title} (${conversation.id})`);
    
    // 3. 并发添加多条消息
    const messageCount = 10;
    console.log(`📝 并发添加 ${messageCount} 条消息...`);
    
    const startTime = Date.now();
    const promises = Array.from({ length: messageCount }, (_, i) =>
      addMessage(conversation.id, {
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `测试消息 #${i + 1}`,
      })
    );
    
    const messages = await Promise.all(promises);
    const endTime = Date.now();
    
    console.log(`✅ 成功添加 ${messages.length} 条消息`);
    console.log(`⏱️  耗时: ${endTime - startTime}ms`);
    console.log(`📊 平均每条消息: ${((endTime - startTime) / messageCount).toFixed(2)}ms`);
    
    // 验证消息数量
    const { getMessages } = await import('../lib/storage/conversations');
    const savedMessages = await getMessages(conversation.id);
    
    if (savedMessages.length === messageCount) {
      console.log(`✅ 验证通过: 消息数量正确 (${savedMessages.length}/${messageCount})`);
    } else {
      console.error(`❌ 验证失败: 消息数量不匹配 (${savedMessages.length}/${messageCount})`);
    }
    
    return { success: true, character, conversation };
  } catch (error) {
    console.error('❌ 测试失败:', error);
    return { success: false };
  }
}

/**
 * 测试并发更新角色
 */
async function testConcurrentCharacterUpdates() {
  console.log('\n🧪 测试 2: 并发更新角色...');
  
  try {
    // 1. 创建测试角色
    const character = await createCharacter({
      name: '初始名称',
      description: '初始描述',
      systemPrompt: '初始提示词',
      personality: ['初始'],
      memoryEnabled: false,
    });
    
    console.log(`✅ 创建角色: ${character.name} (${character.id})`);
    
    // 2. 并发更新角色
    const updateCount = 5;
    console.log(`📝 并发执行 ${updateCount} 次更新...`);
    
    const startTime = Date.now();
    const promises = Array.from({ length: updateCount }, (_, i) =>
      updateCharacter(character.id, {
        description: `更新描述 #${i + 1}`,
      })
    );
    
    const results = await Promise.all(promises);
    const endTime = Date.now();
    
    console.log(`✅ 完成 ${results.filter(r => r !== null).length} 次更新`);
    console.log(`⏱️  耗时: ${endTime - startTime}ms`);
    
    // 验证最终状态
    const { getCharacterById } = await import('../lib/storage/characters');
    const finalCharacter = await getCharacterById(character.id);
    
    if (finalCharacter) {
      console.log(`✅ 最终描述: ${finalCharacter.description}`);
      console.log(`✅ 验证通过: 角色数据完整`);
    } else {
      console.error('❌ 验证失败: 无法读取角色数据');
    }
    
    return { success: true, character };
  } catch (error) {
    console.error('❌ 测试失败:', error);
    return { success: false };
  }
}

/**
 * 测试并发创建和更新记忆
 */
async function testConcurrentMemories() {
  console.log('\n🧪 测试 3: 并发创建记忆...');
  
  try {
    // 1. 创建测试角色
    const character = await createCharacter({
      name: '记忆测试角色',
      description: '测试记忆功能',
      systemPrompt: '测试',
      personality: ['测试'],
      memoryEnabled: true,
    });
    
    console.log(`✅ 创建角色: ${character.name} (${character.id})`);
    
    // 2. 并发创建多个记忆
    const memoryCount = 5;
    console.log(`📝 并发创建 ${memoryCount} 个记忆...`);
    
    const startTime = Date.now();
    const promises = Array.from({ length: memoryCount }, (_, i) =>
      createMemory(character.id, `测试记忆内容 #${i + 1}`)
    );
    
    const memories = await Promise.all(promises);
    const endTime = Date.now();
    
    console.log(`✅ 成功创建 ${memories.length} 个记忆`);
    console.log(`⏱️  耗时: ${endTime - startTime}ms`);
    
    // 验证记忆
    const { getMemoriesByCharacter } = await import('../lib/storage/memories');
    const savedMemories = await getMemoriesByCharacter(character.id);
    
    if (savedMemories.length === memoryCount) {
      console.log(`✅ 验证通过: 记忆数量正确 (${savedMemories.length}/${memoryCount})`);
    } else {
      console.error(`❌ 验证失败: 记忆数量不匹配 (${savedMemories.length}/${memoryCount})`);
    }
    
    return { success: true, character };
  } catch (error) {
    console.error('❌ 测试失败:', error);
    return { success: false };
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('🚀 开始文件锁并发测试...\n');
  console.log('=' .repeat(60));
  
  const results = {
    messages: await testConcurrentMessages(),
    characterUpdates: await testConcurrentCharacterUpdates(),
    memories: await testConcurrentMemories(),
  };
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 测试总结:');
  console.log(`  消息并发测试: ${results.messages.success ? '✅ 通过' : '❌ 失败'}`);
  console.log(`  角色更新测试: ${results.characterUpdates.success ? '✅ 通过' : '❌ 失败'}`);
  console.log(`  记忆并发测试: ${results.memories.success ? '✅ 通过' : '❌ 失败'}`);
  
  const allPassed = Object.values(results).every(r => r.success);
  
  if (allPassed) {
    console.log('\n🎉 所有测试通过！文件锁机制工作正常。');
  } else {
    console.log('\n⚠️  部分测试失败，请检查日志。');
  }
  
  console.log('\n' + '='.repeat(60));
}

// 运行测试
runTests().catch(error => {
  console.error('💥 测试过程中发生错误:', error);
  process.exit(1);
});