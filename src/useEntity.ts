import { Entity, RequestParams, Response } from './index';
import useDrupal from './useDrupal';
import useSWR from 'swr';
import qs from 'qs';
import resolveRelationships from './resolveRelationships';

export default function useEntity(
  relData: Entity|null,
  params: RequestParams = {},
): {
  error?: unknown,
  data: Entity|null,
  isLoaded: boolean,
  isError: boolean,
} {
  const drupal = useDrupal();
  const key = !relData ? null : `${relData.type}:${relData.id}:${qs.stringify(params)}`;
  const swrResponse = useSWR<Response<Entity>|undefined>(
    key,
    async () => {
      if (!relData) {
        return undefined;
      }
      return drupal.loadEntity(relData, params);
    },
    {},
  );
  if (swrResponse.error) {
    return {
      error: swrResponse.error,
      data: null,
      isLoaded: false,
      isError: true,
    };
  }
  if (swrResponse.data) {
    const jsonApiResponse = swrResponse.data;
    if (!jsonApiResponse.data) {
      return {
        data: null,
        isLoaded: true,
        isError: false,
      };
    }
    if (jsonApiResponse.included) {
      resolveRelationships(jsonApiResponse.data, jsonApiResponse.included);
    }
    const entity = jsonApiResponse.data;
    return {
      error: swrResponse.error,
      data: entity as Entity,
      isLoaded: true,
      isError: false,
    };
  }
  return {
    data: null,
    isLoaded: false,
    isError: false,
  };
}
