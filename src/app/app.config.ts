import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { jwtInterceptor, serverErrorInterceptor } from '@lib/interceptors';
import { ETHEREUM } from '@lib/providers';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(routes, withComponentInputBinding()),
        provideHttpClient(withInterceptors([serverErrorInterceptor, jwtInterceptor])),
        {
            provide: ETHEREUM,
            useFactory: () => {
                const w = typeof window !== 'undefined' ? (window as any) : undefined;
                const eth = w?.ethereum as any;
                if (!eth) return undefined;
                const providers = eth.providers as any[] | undefined;
                if (Array.isArray(providers)) {
                    const metamask = providers.find((p) => p && p.isMetaMask);
                    return metamask ?? providers[0];
                }
                return eth;
            },
        },
    ],
};
