import { InjectionToken } from '@angular/core';

export interface EthereumProvider {
    request<T = unknown>(args: { method: string; params?: unknown[] | object }): Promise<T>;
    on?(event: string, listener: (...args: unknown[]) => void): void;
    removeListener?(event: string, listener: (...args: unknown[]) => void): void;
    isMetaMask?: boolean;
}

export const ETHEREUM = new InjectionToken<EthereumProvider | undefined>('ETHEREUM');


