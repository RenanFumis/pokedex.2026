export type PortugueseBundle = {
  genus: Record<string, string>;
  flavor: Record<string, string>;
  abilities: Record<string, { name: string; text: string }>;
};

let pending: Promise<PortugueseBundle | null> | null = null;

export function loadPortuguese(): Promise<PortugueseBundle | null> {
  if (pending) return pending;
  const url = `${import.meta.env.BASE_URL}pt-br.json`;
  pending = fetch(url)
    .then((response) => {
      if (!response.ok) {
        pending = null;
        return null;
      }
      return response.json() as Promise<PortugueseBundle>;
    })
    .catch(() => {
      pending = null;
      return null;
    });
  return pending;
}
