export type RequestParams = {
  include?: string|string[],
  page?: {
    limit?: number,
    offset?: number,
  },
  filter?: Record<string, unknown>,
  fields?: Record<string, string|string[]>,
  resourceVersion?: string,
  sort?: string,
};

export type EntityRelationships = Record<string, Relationship|undefined>;
export type EntityAttributes = Record<string, unknown>;
export type EntityMeta = Record<string, unknown>

export interface Entity<
  Type extends string = string,
  Attributes extends EntityAttributes = EntityAttributes,
  Relationships extends EntityRelationships = EntityRelationships,
  Meta extends EntityMeta = EntityMeta,
  > {
  id: string,
  type: Type,
  attributes?: Attributes & EntityAttributes,
  relationships?: Relationships & EntityRelationships,
  links?: Links,
  meta?: Meta & EntityMeta,
}

export type Metatag = {
  tag: string,
  attributes: {
    name?: string,
    rel?: string,
    content?: string,
    hreflang?: string,
    href?: string,
  },
}

export type FileUri = {
  url: string,
  value: string,
};

export type FileAttributes = {
  filemime: string,
  filename: string,
  filesize: number,
  langcode: string,
  status: boolean,
  uri: FileUri,
};

export type FileMeta = {
  alt: string,
  title: string,
  width: number,
  height: number
}

export type File = Entity<'file--file', FileAttributes, EntityRelationships, FileMeta>

export type Links = {
  self: {
    href: string,
  }
  related?: {
    href: string,
  },
  next?: {
    href: string,
  },
  prev?: {
    href: string,
  },
}

export interface Relationship {
  data?: Entity | Entity[] | null,
  links?: Links,
}

export interface Error {
  id?: string,
  status?: string,
  code?: string,
  title?: string,
  detail?: string,
  source?: Record<string, string>,
  meta?: Record<string, unknown>,
}

export interface Response<
  D extends Entity|Entity[] = Entity | Entity[],
  I extends Entity[] = Entity[]
  > {
  jsonapi?: {
    version: string,
    meta?: unknown,
  },
  data: D,
  included?: I,
  links: Links,
  errors?: Error[],
}

export type FieldLink = {
  uri: string,
  url?: string,
  title: string,
  options: never[] | {
    attributes: Record<string, unknown>
  },
}

export type FieldPath = {
  alias: string,
  langcode: string,
  pid: number,
};


export type MediaAttributes = {
  name?: string,
};

export type MediaImage = Entity<
  'media--image',
  MediaAttributes,
  {
    field_media_image: {
      data: File,
    },
  }
  >

export type MediaVideo = Entity<
  'media--video',
  MediaAttributes,
  {
    field_media_video_file: {
      data: File,
    },
  }
  >
export type MediaDocument = Entity<
  'media--document',
  MediaAttributes,
  {
    field_media_document: {
      data: File,
    },
  }>


export type TaxonomyTermAttributes = {
  drupal_internal__tid?: number,
  drupal_internal__revision_id?: number,
  changed?: string,
  defaultLangcode?: boolean,
  langcode: string,
  name: string,
  metatag_normalized?: Metatag[],
  path: FieldPath,
  status?: boolean,
  weight: number,
} & Entity['attributes'];

export type TaxonomyTermRelationships = {
  parent: {
    data: TaxonomyTerm[],
  },
} & Entity['relationships'];

export type TaxonomyTerm<
  Type extends string = string,
  Attributes extends EntityAttributes = EntityAttributes,
  Relationships extends EntityRelationships = EntityRelationships,
  Meta extends EntityMeta = EntityMeta
  > = Entity<
  Type,
  Attributes & TaxonomyTermAttributes,
  Relationships & TaxonomyTermRelationships,
  Meta & EntityMeta
  >;


export type NodeAttributes = {
  drupal_internal__nid?: number,
  drupal_internal__vid?: number,
  langcode: string,
  revision_timestamp?: string,
  status?: boolean,
  title: string,
  created?: string,
  changed?: string,
  promote?: boolean,
  sticky?: boolean,
  defaultLangcode?: boolean,
  metatag_normalized?: Metatag[],
  path: FieldPath,
};

export type NodeRelationships = {

};

export type Node<
  Type extends string = string,
  Attributes extends EntityAttributes = EntityAttributes,
  Relationships extends EntityRelationships = EntityRelationships,
  Meta extends EntityMeta = EntityMeta
  > = Entity<
  Type,
  Attributes & NodeAttributes,
  Relationships & NodeRelationships,
  Meta
  >;
