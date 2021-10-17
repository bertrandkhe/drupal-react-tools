import { Entity, Relationship } from './index';

type Data = Entity | Entity[];

export default function resolveRelationships<
  E extends Data
  >(data: E, included: Entity[]): typeof data {
  const hashMap: Record<string, Entity> = [...(Array.isArray(data) ? data : [data]), ...included]
    .reduce((obj, entity) => ({
      ...obj,
      [entity.id]: entity,
    }), {});
  Object.keys(hashMap).forEach((id) => {
    const entity = hashMap[id];
    if (!entity.relationships) {
      return;
    }
    entity.relationships = Object.keys(entity.relationships).reduce((rels, key) => {
      const entityRel = entity.relationships?.[key] as Relationship;
      const listRel = (Array.isArray(entityRel.data) ? entityRel.data : [entityRel.data]) as Entity[];
      const resolvedListRel = listRel.map((rel) => {
        const resolvedRel = rel && hashMap[rel.id] ? hashMap[rel.id] : null;
        if (resolvedRel) {
          const keys = Object.keys(rel) as (keyof Entity)[];
          keys.forEach((relKey) => {
            if (relKey === 'id' || relKey === 'type' || relKey === 'links') {
              return;
            }
            if (resolvedRel[relKey] === undefined && rel[relKey] !== undefined) {
              if (relKey === 'relationships') {
                resolvedRel.relationships = rel.relationships;
                return;
              }
              resolvedRel[relKey] = rel[relKey];
            }
          });
          return resolvedRel;
        }
        return rel;
      });
      return {
        ...rels,
        [key]: {
          ...entityRel,
          data: Array.isArray(entityRel.data) ? resolvedListRel : resolvedListRel[0],
        },
      };
    }, {});
  });
  if (!Array.isArray(data)) {
    return hashMap[data.id] as E;
  }
  return data;
}
