import type { EthereumProvider } from './app/lib/providers/ethereum.token';

declare global {
    interface Window {
        ethereum?: EthereumProvider;
    }
}

export { };


