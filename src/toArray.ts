const toArray = <D, >(data: D): D|D[] => {
  if (Array.isArray(data)) {
    return data;
  }
  if (data === null || data === undefined) {
    return [];
  }
  return [data];
};

export default toArray;
