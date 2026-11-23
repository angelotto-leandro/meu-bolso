export const DEFAULT_CATEGORIES = [
  'Alimentação',
  'Transporte',
  'Mercado',
  'Lazer',
  'Casa',
  'Saúde',
  'Educação',
  'Serviços',
  'Outros',
];

export function allCategoryNames(customCategories = []) {
  const lower = DEFAULT_CATEGORIES.map((n) => n.toLowerCase());
  return [...DEFAULT_CATEGORIES, ...customCategories.map((c) => c.name).filter((n) => !lower.includes(n.toLowerCase()))];
}
