import resolveRelationships from './resolveRelationships';
import { DrupalInstance } from './DrupalClient';
import { Entity, File as DrupalFile, MediaImage, Response } from './index';
import { AxiosResponse } from 'axios';

export type MediaType = 'image'|'document'|'video'|'audio'|'icon';

export function assertIsMediaImage(type: MediaType): boolean {
  switch (type) {
    case 'icon':
    case 'image':
      return true;

    default:
      return false;
  }
}

export function getAllowedExtensions(type: MediaType): string[] {
  switch (type) {
    case 'icon':
    case 'image':
      return ['png', 'jpg', 'jpeg', 'gif'];

    case 'video':
      return ['mp4'];

    case 'audio':
      return ['mp3', 'wav', 'aac'];

    case 'document':
      return [
        'txt', 'rtf', 'doc', 'docx',
        'ppt', 'pptx', 'xls', 'xlsx',
        'pdf', 'odf', 'odg', 'odp',
        'ods', 'odt', 'fodt', 'fods',
        'fodp', 'fodg', 'key', 'numbers',
        'pages',
      ];

    default:
      return [];
  }
}

export function getMediaFileField(mediaType: MediaType): string {
  switch (mediaType) {
    case 'image':
    case 'icon':
      return 'field_media_image';

    case 'document':
      return 'field_media_document';

    case 'audio':
    case 'video':
      return `field_media_${mediaType}_file`;

    default:
      throw new Error(`Unsupported media type ${mediaType}`);
  }
}

export async function createFile(this: DrupalInstance, file: File, mediaType: MediaType): Promise<DrupalFile> {
  const fileField = getMediaFileField(mediaType);
  const csrfToken = (await this.get('/session/token')).data as string;
  const axiosResponse: AxiosResponse<Response<DrupalFile>> = await this.post(`/jsonapi/media/${mediaType}/${fileField}`, file, {
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `file; filename="${file.name}"`,
      'x-csrf-token': csrfToken,
    },
  });
  const jsonResponse = axiosResponse.data;
  return jsonResponse.data;
}

export function getExtension(filename: string): string {
  return filename.split('.').pop() || '';
}

export function validateFiles(files: File[], mediaType: MediaType): string[] {
  const errors: string[] = [];
  const allowedExtensions = getAllowedExtensions(mediaType);
  files.forEach((file) => {
    const fileExtension = getExtension(file.name);
    if (!fileExtension || allowedExtensions.indexOf(fileExtension) < 0) {
      errors.push(`
        The selected file ${file.name} cannot be uploaded. 
        Only files with the following extensions are allowed: ${allowedExtensions.join(' ')}
      `);
    }
  });
  return errors;
}

export async function deleteFile(this: DrupalInstance, fileId: string): Promise<void> {
  const csrfToken = (await this.get('/session/token')).data as string;
  await this.delete(`/jsonapi/file/file/${fileId}`, {
    headers: {
      Accept: 'application/vnd.api+json',
      'x-csrf-token': csrfToken,
    },
  });
}

export async function create<M, >(
  this: DrupalInstance,
  file: DrupalFile,
  mediaType: MediaType,
  meta?: M,
): Promise<Entity> {
  const fileField = getMediaFileField(mediaType);
  const csrfToken = (await this.get('/session/token')).data as string;
  const axiosResponse: AxiosResponse<Response<Entity>> = await this.post(`/jsonapi/media/${mediaType}`, {
    data: {
      type: `media--${mediaType}`,
      attributes: {
        name: file.attributes?.filename,
      },
      relationships: {
        [fileField]: {
          data: {
            id: file.id,
            type: file.type,
            meta,
          },
        },
      },
    },
  }, {
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      'x-csrf-token': csrfToken,
    },
  });
  const jsonApiMediaResponse = axiosResponse.data;
  return jsonApiMediaResponse.data;
}

export async function loadMultiple(
  this: DrupalInstance,
  ids: string[],
  mediaType: MediaType,
  fields?: Record<string, string>,
): Promise<Entity[]> {
  const response: AxiosResponse<Response<Entity[]>> = await this.get(`/jsonapi/media/${mediaType}`, {
    params: {
      filter: {
        id: {
          value: ids,
          operator: 'IN',
        },
      },
      fields,
      include: getMediaFileField(mediaType),
    },
  });
  const jsonApiResponse = response.data;
  const medias = jsonApiResponse.data;
  const included = jsonApiResponse.included || [];
  resolveRelationships(medias, included);
  return medias;
}

export function getImageUrl(media: MediaImage): string {
  const file = media?.relationships?.field_media_image?.data as DrupalFile;
  if (!file) {
    return '';
  }
  const uri = file.attributes?.uri.value;
  return uri || '';
}

const media = {
  assertIsMediaImage,
  getAllowedExtensions,
  getMediaFileField,
  createFile,
  validateFiles,
  deleteFile,
  create,
  loadMultiple,
  getImageUrl,
};

export type MediaMethods = typeof media;

export default media;
