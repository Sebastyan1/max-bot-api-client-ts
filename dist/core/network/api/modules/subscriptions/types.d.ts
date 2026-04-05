import type { Update, UpdateType } from '../../types';
export type CreateSubscriptionDTO = {
    body: {
        url: string;
        update_types?: UpdateType[];
        secret?: string;
    };
};
export type CreateSubscriptionResponse = {
    success: boolean;
    message?: string;
};
export type GetUpdatesDTO = {
    query: {
        limit?: number;
        timeout?: number;
        marker?: number;
        types?: string;
    };
};
export type GetUpdatesResponse = {
    updates: Update[];
    marker: number;
};
