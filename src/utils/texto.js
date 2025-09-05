export function getNombre(listOrObj, cod) {
  if (!Array.isArray(listOrObj)) {
    const o = listOrObj;
    return o?.nombre ?? o?.name ?? o?.titulo ?? o?.title ?? "";
  }

  const pad2 = (v) =>
    String(v ?? "")
      .padStart(2, "0")
      .slice(-2);
  const c = pad2(cod);
  const it = listOrObj.find((x) => String(x.cod) === c);
  return it?.nombre ?? "";
}
