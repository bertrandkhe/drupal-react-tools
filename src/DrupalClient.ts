/* eslint-disable no-await-in-loop */
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { stringify } from 'qs';
import media from './media';
import type {
  Entity,
  Response,
  Node,
  FileUri,
  RequestParams,
} from './index';

export type ResourceConfig = {
  resourceName: string,
  config: AxiosRequestConfig
};

export type DrupalArgs = {
  axiosConfig: AxiosRequestConfig,
  publicURL: string,
  page?: Response,
  resources?: ResourceConfig[],
};

export type PathTranslation = {
  resolved: string,
  isHomePath: boolean,
  entity: {
    canonical: string,
    type: string,
    bundle: string,
    id: string,
    uuid: string,
  },
  label: string,
  jsonapi: {
    individual: string,
    resourceName: string,
    pathPrefix: string,
    basePath: string,
    entryPoint: string,
  },
};

export const serializeParams = (params: RequestParams) => {
  const newParams: typeof params = { ...params };
  if (params.include) {
    newParams.include = Array.isArray(params.include)
      ? params.include.sort().join(',')
      : params.include.split(',').sort().join(',');
  }
  if (params.fields) {
    const { fields } = params;
    const newFields: Record<string, string> = {};
    Object.keys(fields).forEach((type: keyof (typeof fields)) => {
      const fieldsForType = fields[type];
      newFields[type] = Array.isArray(fieldsForType)
        ? fieldsForType.sort().join(',')
        : fieldsForType.split(',').sort().join(',');
    });
    newParams.fields = newFields;
  }
  return stringify(newParams);
};

export class DrupalClient {
  protected client: AxiosInstance;

  public interceptors: AxiosInstance['interceptors'];

  public get: AxiosInstance['get'];

  public post: AxiosInstance['post'];

  public put: AxiosInstance['put'];

  public delete: AxiosInstance['delete'];

  public axiosConfig: AxiosInstance['defaults'];

  public media: typeof media & DrupalInstance;

  public publicURL: string;

  public page?: Response;

  public resources: ResourceConfig[];

  constructor(args: DrupalArgs) {
    const { axiosConfig } = args;
    axiosConfig.paramsSerializer = serializeParams;
    this.client = axios.create(args.axiosConfig);
    this.interceptors = this.client.interceptors;
    this.publicURL = args.publicURL;
    this.get = this.client.get;
    this.post = this.client.post;
    this.put = this.client.put;
    this.delete = this.client.delete;
    this.axiosConfig = this.client.defaults;
    this.media = { ...this, ...media };
    this.page = args.page;
    this.resources = args.resources || [];
  }

  getFileUrl(uri: string|FileUri): string {
    const [uri1, url] = typeof uri === 'string' ? [uri, uri] : [uri.value, uri.url];
    if (uri1.startsWith('public:/')) {
      return uri1.replace('public:/', this.publicURL);
    }
    return url;
  }

  findEntitiesDataFromIncluded(relData: Entity[]|Entity): Entity[]|Entity|null {
    const isArray = Array.isArray(relData);
    const items = (isArray ? relData : [relData]) as Entity[];
    if (items.length === 0) {
      return relData;
    }
    const ids = items.map((item) => item.id);
    if (!this.page) {
      throw new Error('Page is not set');
    }
    const includedEntities = this.page.included?.filter((e) => ids.indexOf(e.id) >= 0) || [];
    if (includedEntities.length === ids.length) {
      if (isArray) {
        return includedEntities;
      }
      return includedEntities[0];
    }
    return null;
  }

  async getEntities(
    relData: Entity[]|Entity,
    include: Record<string, string> = {},
    fields: Record<string, string> = {},
    sort?: string,
  ): Promise<{ data: Entity[]|Entity|null, included?: Entity[] }> {
    const items = Array.isArray(relData) ? relData : [relData];
    const idsByTypes: string[][] = [];
    const types: string[] = [];
    items.forEach((item) => {
      let i = types.indexOf(item.type);
      if (i < 0) {
        i = types.push(item.type) - 1;
        idsByTypes.push([]);
      }
      idsByTypes[i].push(item.id);
    });
    const entities: Entity[] = [];
    const included: Entity[] = [];
    await Promise.all(types.map(async (type, i) => {
      const idsForType = idsByTypes[i];
      const [entityType, bundle] = type.split('--');
      const httpResponse = await this.get(`/jsonapi/${entityType}/${bundle}`, {
        params: {
          fields,
          include: include[type],
          filter: {
            id: {
              value: idsForType,
              operator: 'IN',
            },
          },
          sort,
        },
      });
      const jsonResponse = httpResponse.data as Response;
      if (jsonResponse.included) {
        jsonResponse.included.forEach((e) => included.push(e));
      }
      const jsonResData = jsonResponse.data as Entity[];
      jsonResData.forEach((e) => {
        entities.push(e);
      });
    }));
    if (Array.isArray(relData)) {
      return {
        data: items.map((item) => {
          const entity = entities.find((e) => e.id === item.id);
          if (!entity) {
            return item;
          }
          return entity;
        }),
        included,
      };
    }
    if (entities.length === 1) {
      return {
        data: entities[0],
        included,
      };
    }
    return {
      data: null,
    };
  }

  async index<E extends Entity>(entityType: string, params?: RequestParams): Promise<Response<E[]>> {
    const path = entityType.split('--').join('/');

    const response = await this.get<Response<E[]>>(`/jsonapi/${path}`, {
      params,
    });
    return response.data;
  }

  async indexAll<E extends Entity>(entityType: string, params?: RequestParams): Promise<Response<E[]>> {
    const result: Response<E[]> = {
      data: [],
      included: [],
      links: {
        self: {
          href: '',
        },
      },
    };
    let jsonResponse: Response<E[]> | undefined;
    const includedIds = new Set<string>();
    const path = entityType.split('--').join('/');
    do {
      const response = jsonResponse?.links.next
        ? await this.get<Response<E[]>>(jsonResponse.links.next.href)
        : await this.get<Response<E[]>>(`/jsonapi/${path}`, {
          params,
        });
      jsonResponse = response.data;
      jsonResponse.data.forEach((e: E) => result.data.push(e));
      if (jsonResponse.included) {
        jsonResponse.included.forEach((e) => {
          if (includedIds.has(e.id)) {
            return;
          }
          includedIds.add(e.id);
          result.included?.push(e);
        });
      }
    } while (jsonResponse?.links.next);
    return result;
  }

  async resolvePath(path: string): Promise<PathTranslation> {
    const response = await this.get('/router/translate-path', {
      params: { path },
    });
    return response.data as PathTranslation;
  }

  async loadNodeFromPathTranslation(pathTranslation: PathTranslation): Promise<Response<Node>> {
    const { jsonapi } = pathTranslation;
    const { resourceName, individual } = jsonapi;
    const config = this.resources.find((c) => c.resourceName === resourceName);
    const response = await this.get(individual, config?.config || {});
    return response.data as Response<Node>;
  }

  async loadEntity(entityRel: { id: string, type: string }, params?: RequestParams): Promise<Response<Entity>> {
    const resource = this.resources.find((c) => c.resourceName === entityRel.type);
    const individual = `/jsonapi/${entityRel.type.split('--').join('/')}/${entityRel.id}`;
    const requestConfig = resource?.config || {};
    if (params) {
      requestConfig.params = params;
    }
    const response = await this.get(individual, requestConfig);
    return response.data as Response<Entity>;
  }

  async loadPreview({ id, bundle }: { id: string, bundle: string }): Promise<Response<Node>> {
    const config = this.resources.find((c) => c.resourceName === bundle);
    const response = await this.get(`/jsonapi/node_preview/${id}`, config?.config || {});
    return response.data as Response<Node>;
  }
}

export function createDrupal(args: DrupalArgs): DrupalInstance {
  return new DrupalClient(args);
}

export type DrupalInstance = typeof DrupalClient.prototype;
