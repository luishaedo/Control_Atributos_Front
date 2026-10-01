import { pad2 } from './sku.js'

export function getNombre(listOrObj, cod) {
  if (!Array.isArray(listOrObj)) {
    const o = listOrObj;
    return o?.nombre ?? o?.name ?? o?.titulo ?? o?.title ?? "";
  }

  const c = pad2(cod);
  const it = listOrObj.find((x) => String(x.cod) === c);
  return it?.nombre ?? "";
}
