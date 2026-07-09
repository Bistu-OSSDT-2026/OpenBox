import React from 'react';
export default function UniEnvUI({ config, onConfigChange, api, }: {
    config: Record<string, unknown>;
    onConfigChange: (config: Record<string, unknown>) => void;
    api: {
        sendToBackend(message: unknown): Promise<unknown>;
        notify(title: string, body?: string): void;
        onBackendMessage(handler: (msg: unknown) => void): () => void;
    };
}): React.JSX.Element;
