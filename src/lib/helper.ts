// utils/prisma.helpers.ts
export const serializeMetadata = (metadata: Record<string, any> | null | undefined): string | null => {
  if (!metadata) return null;
  return JSON.stringify(metadata);
};

export const deserializeMetadata = (metadata: string | null | undefined): Record<string, any> | null => {
  if (!metadata) return null;
  try {
    return JSON.parse(metadata);
  } catch {
    return null;
  }
};