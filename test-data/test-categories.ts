export const TEST_CATEGORIES = {
  positive: 'positive',
  negative: 'negative',
  boundary: 'boundary',
  validation: 'validation',
} as const;

export type TestCategory = typeof TEST_CATEGORIES[keyof typeof TEST_CATEGORIES];
