import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService, WalletService } from '@lib/services';
import { LogoComponent } from '../logo/logo.component';

@Component({
    selector: 'app-navbar',
    standalone: true,
    imports: [CommonModule, RouterModule, LogoComponent],
    templateUrl: './navbar.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
    private readonly _router = inject(Router);
    private readonly _authService = inject(AuthService);
    private readonly _walletService = inject(WalletService);

    readonly address = this._walletService.address;
    readonly chainId = this._walletService.chainId;
    readonly isConnected = this._walletService.isConnected;
    readonly isMetaMask = computed(() => this._walletService.isProviderAvailable);
    readonly networkLabel = this._walletService.networkLabel;
    readonly isSupportedNetwork = this._walletService.isSupportedNetwork;

    onClickSignOut(): void {
        this._authService.logout();
        this._router.navigate(['/auth/login']);
    }

    async onClickConnectWallet(): Promise<void> {
        if (!this._walletService.isProviderAvailable) {
            window.open('https://metamask.io/download/', '_blank');
            window.location.reload();
        }
        await this._walletService.connect();
    }
}
