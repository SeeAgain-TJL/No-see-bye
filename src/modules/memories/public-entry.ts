export function memoryHref(id: string, publicScope = false) {
  return `/memories/${id}${publicScope ? "?scope=public" : ""}`;
}
