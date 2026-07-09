import type { PluginContext } from 'openbox-plugin-api';
declare const plugin: {
    activate(context: PluginContext): void;
    deactivate(): void;
    onMessage(msg: unknown): Promise<unknown>;
};
export default plugin;
