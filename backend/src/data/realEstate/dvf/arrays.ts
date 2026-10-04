// Opérations sur de GRANDS tableaux sans « spread » dans un appel de fonction.
// f(...tableau) place chaque élément dans la pile d'appels : au-delà d'environ 100 000 éléments, JavaScript lève « Maximum call stack size exceeded »
// (c'est ce qui arrivait avec 1,2 million de ventes). Ces fonctions utilisent des boucles : aucune limite de taille.
export const pushAll = <T>(target: T[], source: readonly T[]): T[] => {
  for (let i = 0; i < source.length; i++) target.push(source[i]);
  return target;
};

export const minOf = (values: readonly number[]): number => {
  let m = Infinity;
  for (let i = 0; i < values.length; i++) if (values[i] < m) m = values[i];
  return m;
};
export const maxOf = (values: readonly number[]): number => {
  let m = -Infinity;
  for (let i = 0; i < values.length; i++) if (values[i] > m) m = values[i];
  return m;
};
