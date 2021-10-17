import { TaxonomyTerm } from './index';

const sortTermsByWeight = (terms: TaxonomyTerm[]) => (terms.sort((t1: TaxonomyTerm, t2: TaxonomyTerm) => {
  const weight1 = t1.attributes?.weight || 0;
  const weight2 = t2.attributes?.weight || 0;
  const name1 = t1.attributes?.name || '';
  const name2 = t2.attributes?.name || '';
  if (weight1 === weight2) {
    return name1 > name2 ? 1 : -1;
  }
  return weight1 > weight2 ? 1 : -1;
}));

export default sortTermsByWeight;
