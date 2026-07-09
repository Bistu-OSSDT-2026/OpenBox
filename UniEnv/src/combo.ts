import type { ToolDef } from './tools/base'

export interface ComboItem {
  toolId: string
  version: string
}

export interface ComboPack {
  id: string
  name: string
  description: string
  items: ComboItem[]
}

export function getBuiltinCombos(): ComboPack[] {
  return [
    {
      id: 'python-fullstack',
      name: 'Python 全栈',
      description: 'Python 3.11 + Node 18 + Git',
      items: [
        { toolId: 'python', version: '3.11.9' },
        { toolId: 'node', version: '18.20.4' },
        { toolId: 'git', version: '2.46.0' }
      ]
    },
    {
      id: 'java-dev',
      name: 'Java 开发',
      description: 'JDK 21 + Git',
      items: [
        { toolId: 'java', version: '21.0.3' },
        { toolId: 'git', version: '2.46.0' }
      ]
    },
    {
      id: 'go-dev',
      name: 'Go 开发',
      description: 'Go 1.23 + Git',
      items: [
        { toolId: 'go', version: '1.23.0' },
        { toolId: 'git', version: '2.46.0' }
      ]
    },
    {
      id: 'frontend-dev',
      name: '前端开发',
      description: 'Node 20 + Git',
      items: [
        { toolId: 'node', version: '20.15.1' },
        { toolId: 'git', version: '2.46.0' }
      ]
    },
    {
      id: 'fullstack-universal',
      name: '全栈通用',
      description: 'Python 3.11 + Node 18 + Go 1.22 + Git',
      items: [
        { toolId: 'python', version: '3.11.9' },
        { toolId: 'node', version: '18.20.4' },
        { toolId: 'go', version: '1.22.4' },
        { toolId: 'git', version: '2.46.0' }
      ]
    }
  ]
}

export function resolveTool(
  tools: Map<string, ToolDef>,
  toolId: string
): ToolDef {
  const tool = tools.get(toolId)
  if (!tool) {
    throw new Error(`未知工具: ${toolId}`)
  }
  return tool
}
