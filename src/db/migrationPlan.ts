/**
 * Decide quais arquivos de migração ainda precisam ser aplicados.
 * Considera apenas arquivos .sql e os ordena pelo nome (001_, 002_, ...).
 */
export function pendingMigrations(
  files: readonly string[],
  applied: ReadonlySet<string>,
): string[] {
  return files
    .filter((file) => file.toLowerCase().endsWith('.sql'))
    .filter((file) => !applied.has(file))
    .sort((left, right) => left.localeCompare(right, 'en'));
}
