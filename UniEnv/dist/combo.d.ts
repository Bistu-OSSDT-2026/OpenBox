import type { ToolDef } from './tools/base';
export interface ComboItem {
    toolId: string;
    version: string;
}
export interface ComboPack {
    id: string;
    name: string;
    description: string;
    items: ComboItem[];
}
export declare function getBuiltinCombos(): ComboPack[];
export declare function resolveTool(tools: Map<string, ToolDef>, toolId: string): ToolDef;
