export const isDailyMilkCancelled = (value) => {
  if (value === null || value === undefined || value === false) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized !== '' && normalized !== '0' && normalized !== 'false' && normalized !== 'null';
};

export const getDailyMilkCancellationReason = (value) => {
  if (!isDailyMilkCancelled(value)) return null;
  const normalized = String(value).trim();
  return normalized === '1' || normalized.toLowerCase() === 'true' ? null : normalized;
};
