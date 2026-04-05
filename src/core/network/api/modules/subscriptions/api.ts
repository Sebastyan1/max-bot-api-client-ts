import { BaseApi } from '../../base-api';
import { FlattenReq } from '../types';
import type { CreateSubscriptionDTO, GetUpdatesDTO } from './types';

export class SubscriptionsApi extends BaseApi {
  create = async ({ ...body }: FlattenReq<CreateSubscriptionDTO>) => {
    return this._post('subscriptions', { body });
  };

  getUpdates = async ({ ...query }: FlattenReq<GetUpdatesDTO>) => {
    return this._get('updates', { query });
  };
}
