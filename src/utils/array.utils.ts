function onlyUnique(value, index, array) {
  return array.indexOf(value) === index;
}

export function unique(array:any[]) {
  return array.filter(onlyUnique)
}