import { Injectable, NgZone, Signal, WritableSignal, computed, signal } from '@angular/core';
import { EthereumProvider } from '@lib/providers';

@Injectable({ providedIn: 'root' })
export class WalletService {

    private readonly _address: WritableSignal<string | null> = signal<string | null>(null);
    private readonly _chainId: WritableSignal<string | null> = signal<string | null>(null);

    readonly address: Signal<string | null> = this._address.asReadonly();
    readonly chainId: Signal<string | null> = this._chainId.asReadonly();
    readonly isConnected: Signal<boolean> = computed(() => !!this._address());

    private listenersAttached = false;
    private pollTimer: number | null = null;

    private resolveProvider(): EthereumProvider | undefined {
        const w = typeof window !== 'undefined' ? (window as any) : undefined;
        const eth = w?.ethereum as any;
        if (!eth) return undefined;
        const providers = eth.providers as any[] | undefined;
        if (Array.isArray(providers)) {
            const metamask = providers.find((p) => p && p.isMetaMask);
            return (metamask ?? providers[0]) as EthereumProvider;
        }
        return eth as EthereumProvider;
    }

    get isProviderAvailable(): boolean {
        const provider = this.resolveProvider();
        return !!provider && typeof provider.request === 'function';
    }

    async connect(): Promise<string | null> {
        const provider = this.resolveProvider();
        if (!provider || typeof provider.request !== 'function') return null;
        try {
            const accounts = await provider.request<string[]>({ method: 'eth_requestAccounts' });
            const account = accounts && accounts.length > 0 ? accounts[0] : null;
            this._address.set(account);
            await this.refreshChainId(provider);
            this.attachListeners();
            return account;
        } catch (error) {
            return null;
        }
    }

    private async refreshChainId(provider?: EthereumProvider): Promise<void> {
        const p = provider ?? this.resolveProvider();
        if (!p || typeof p.request !== 'function') return;
        try {
            const id = await p.request<string>({ method: 'eth_chainId' });
            this._zone.run(() => this._chainId.set(id ?? null));
        } catch {
            this._zone.run(() => this._chainId.set(null));
        }
    }

    private attachListeners(): void {
        if (this.listenersAttached) return;
        const provider = this.resolveProvider();
        if (!provider || typeof provider.on !== 'function') return;
        provider.on('accountsChanged', (accounts: unknown) => {
            const arr = Array.isArray(accounts) ? (accounts as string[]) : [];
            this._zone.run(() => this._address.set(arr.length > 0 ? arr[0] : null));
        });
        provider.on('chainChanged', (chainId: unknown) => {
            const id = typeof chainId === 'string' ? chainId : null;
            this._zone.run(() => this._chainId.set(id));
        });
        provider.on?.('connect', (info: unknown) => {
            const id = (info as { chainId?: string } | undefined)?.chainId ?? null;
            this._zone.run(() => {
                if (id) this._chainId.set(id);
            });
        });
        provider.on?.('disconnect', () => {
            this._zone.run(() => this._address.set(null));
        });
        this.listenersAttached = true;
        void this.refreshChainId(provider);
    }

    // Supported networks and labels
    private readonly supportedChainIds = new Set([
        '0x1',       // Ethereum Mainnet
        '0x5',       // Goerli Testnet (deprecated)
        '0xaa36a7',  // Sepolia Testnet
        '0x3',       // Ropsten (deprecated)
        '0x4',       // Rinkeby (deprecated)
        '0x89',      // Polygon Mainnet
        '0x2105',    // Base Mainnet (8453)
        '0xe708',    // Linea Mainnet (59144)
    ]);
    readonly isSupportedNetwork: Signal<boolean> = computed(() => {
        const id = this._chainId();
        return id ? this.supportedChainIds.has(id.toLowerCase()) : true;
    });
    readonly networkLabel: Signal<string> = computed(() => this.getNetworkLabel(this._chainId()));

    private getNetworkLabel(chainId: string | null): string {
        switch (chainId?.toLowerCase()) {
            case '0x1':
                return 'Ethereum Mainnet';
            case '0x5':
                return 'Goerli Testnet';
            case '0xaa36a7':
                return 'Sepolia Testnet';
            case '0x89':
                return 'Polygon Mainnet';
            case '0x2105':
                return 'Base Mainnet';
            case '0xe708':
                return 'Linea Mainnet';
            case '0x3':
                return 'Ropsten (deprecated)';
            case '0x4':
                return 'Rinkeby (deprecated)';
            case undefined:
            case null:
                return 'Unknown';
            default:
                return `Chain ${chainId}`;
        }
    }

    constructor(private readonly _zone: NgZone) {
        // Initialize listeners and load initial state in case wallet is already connected
        this.attachListeners();
        void this.bootstrapState();
        this.startPolling();
    }

    private async bootstrapState(): Promise<void> {
        const provider = this.resolveProvider();
        if (!provider || typeof provider.request !== 'function') return;
        try {
            const accounts = await provider.request<string[]>({ method: 'eth_accounts' });
            const account = accounts && accounts.length > 0 ? accounts[0] : null;
            this._zone.run(() => this._address.set(account));
        } catch {
            // ignore
        }
        await this.refreshChainId(provider);
    }

    private startPolling(): void {
        if (this.pollTimer !== null) return;
        const intervalMs = 1000;
        this.pollTimer = window.setInterval(async () => {
            const provider = this.resolveProvider();
            if (!provider || typeof provider.request !== 'function') return;
            
            try {
                // Check if we still have accounts
                const accounts = await provider.request<string[]>({ method: 'eth_accounts' });
                const currentAddress = this._address();
                const newAddress = accounts && accounts.length > 0 ? accounts[0] : null;
                
                // Update address if it changed
                if (newAddress !== currentAddress) {
                    this._zone.run(() => this._address.set(newAddress));
                }
                
                // Update chain ID
                const chainId = await provider.request<string>({ method: 'eth_chainId' });
                const currentChainId = this._chainId();
                if (chainId !== currentChainId) {
                    this._zone.run(() => this._chainId.set(chainId ?? null));
                }
            } catch {
                // ignore polling errors
            }
        }, intervalMs);
    }
}


