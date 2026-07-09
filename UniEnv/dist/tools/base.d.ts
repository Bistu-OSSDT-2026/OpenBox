import { exec } from 'child_process';
export declare const asyncExec: typeof exec.__promisify__;
export interface ToolInfo {
    installed: boolean;
    version?: string;
    path?: string;
    error?: string;
}
export interface InstallProgress {
    stage: 'downloading' | 'installing' | 'configuring' | 'done';
    percent: number;
    message: string;
}
export type ProgressCallback = (p: InstallProgress) => void;
export interface ToolDef {
    id: string;
    displayName: string;
    icon: string;
    description: string;
    detect(installRoot: string): Promise<ToolInfo>;
    listVersions(): Promise<string[]>;
    install(version: string, installRoot: string, onProgress: ProgressCallback, opts?: InstallOptions): Promise<void>;
    uninstall(installRoot: string, onProgress: ProgressCallback): Promise<void>;
    switchVersion(version: string, installRoot: string): Promise<void>;
}
export interface InstallOptions {
    downloadMirror?: string;
}
export declare function fetchWithTimeout(url: string, timeoutMs?: number, retries?: number): Promise<globalThis.Response>;
export declare function downloadWithProgress(url: string, destPath: string, onProgress: ProgressCallback, stageLabel: string): Promise<void>;
export declare function downloadWithFallback(urls: Array<{
    url: string;
    label: string;
}>, destPath: string, onProgress: ProgressCallback): Promise<void>;
export declare function toolDir(installRoot: string, toolId: string): string;
export declare function versionDir(installRoot: string, toolId: string, version: string): string;
export declare function currentLink(installRoot: string, toolId: string): string;
export declare function extractZip(zipPath: string, destDir: string): Promise<void>;
export declare function createJunction(link: string, target: string): Promise<void>;
export declare function removeJunction(link: string): Promise<void>;
export declare function cleanupFile(filePath: string): void;
export declare function findTopDir(extractDir: string): string;
