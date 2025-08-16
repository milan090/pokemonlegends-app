export function getPaddedMonsterNumber(num: number): string {
  return num.toString().padStart(3, '0');
}

export function getMonsterSpriteType(num: number): string {
  return `pokemon${getPaddedMonsterNumber(num)}`;
}