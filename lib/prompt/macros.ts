/**
 * 宏处理器
 * 处理宏展开：{{setvar::name::value}}, {{getvar::name}}, {{random::opt1::opt2}}
 */

/**
 * 展开模板中的宏
 * @param template - 包含宏的模板字符串
 * @param macroStore - 宏变量存储（用于 setvar/getvar）
 * @returns 展开后的字符串
 */
export function expandMacros(
  template: string,
  macroStore: Map<string, string> = new Map()
): string {
  let result = template;
  
  // 处理 setvar 宏：{{setvar::变量名::变量值}}
  result = processSetvarMacros(result, macroStore);
  
  // 处理 getvar 宏：{{getvar::变量名}}
  result = processGetvarMacros(result, macroStore);
  
  // 处理 random 宏：{{random::选项1::选项2::...}}
  result = processRandomMacros(result);
  
  return result;
}

/**
 * 处理 setvar 宏
 * @param template - 模板字符串
 * @param macroStore - 宏变量存储
 * @returns 处理后的字符串
 */
function processSetvarMacros(template: string, macroStore: Map<string, string>): string {
  const setvarRegex = /\{\{setvar::([^:]+)::([^}]+)\}\}/g;
  
  return template.replace(setvarRegex, (match, varName, varValue) => {
    // 将变量存储到 macroStore 中
    macroStore.set(varName.trim(), varValue.trim());
    // setvar 宏本身不产生输出，返回空字符串
    return '';
  });
}

/**
 * 处理 getvar 宏
 * @param template - 模板字符串
 * @param macroStore - 宏变量存储
 * @returns 处理后的字符串
 */
function processGetvarMacros(template: string, macroStore: Map<string, string>): string {
  const getvarRegex = /\{\{getvar::([^}]+)\}\}/g;
  
  return template.replace(getvarRegex, (match, varName) => {
    const name = varName.trim();
    // 从 macroStore 中获取变量值
    return macroStore.get(name) || '';
  });
}

/**
 * 处理 random 宏
 * @param template - 模板字符串
 * @returns 处理后的字符串
 */
function processRandomMacros(template: string): string {
  const randomRegex = /\{\{random::([^}]+)\}\}/g;
  
  return template.replace(randomRegex, (match, optionsStr) => {
    // 分割选项（以 :: 为分隔符）
    const options = optionsStr.split('::').map((opt: string) => opt.trim());
    
    if (options.length === 0) {
      return '';
    }
    
    // 随机选择一个选项
    const randomIndex = Math.floor(Math.random() * options.length);
    return options[randomIndex];
  });
}

/**
 * 从记录对象创建宏存储
 * @param variables - 变量记录对象
 * @returns Map 形式的宏存储
 */
export function createMacroStore(variables?: Record<string, string>): Map<string, string> {
  const store = new Map<string, string>();
  
  if (variables) {
    for (const [key, value] of Object.entries(variables)) {
      store.set(key, value);
    }
  }
  
  return store;
}

/**
 * 将宏存储转换为记录对象
 * @param macroStore - 宏存储 Map
 * @returns 记录对象
 */
export function macroStoreToRecord(macroStore: Map<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  
  for (const [key, value] of macroStore.entries()) {
    result[key] = value;
  }
  
  return result;
}