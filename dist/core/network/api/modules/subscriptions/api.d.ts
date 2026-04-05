import { BaseApi } from '../../base-api';
import { FlattenReq } from '../types';
import type { CreateSubscriptionDTO, GetUpdatesDTO } from './types';
export declare class SubscriptionsApi extends BaseApi {
    create: ({ ...body }: FlattenReq<CreateSubscriptionDTO>) => Promise<import("./types").CreateSubscriptionResponse>;
    getUpdates: ({ ...query }: FlattenReq<GetUpdatesDTO>) => Promise<import("./types").GetUpdatesResponse>;
}
