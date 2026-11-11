// Which players a fixture is open to: 'mixed' | 'men' | 'women'.
// Members without a matching gender on their membership cannot sign up or be picked.

export const FIXTURE_GENDER_OPTIONS = [
  { value: 'mixed', label: 'Mixed — all members' },
  { value: 'men', label: 'Men — male members only' },
  { value: 'women', label: 'Women — female members only' },
];

export function fixtureGender(value) {
  return value === 'men' || value === 'women' ? value : 'mixed';
}

export function memberMatchesFixtureGender(fixtureGenderValue, memberGender) {
  const g = fixtureGender(fixtureGenderValue);
  if (g === 'mixed') return true;
  const m = String(memberGender || '').toLowerCase();
  return g === 'men' ? m === 'male' : m === 'female';
}

export function fixtureGenderLabel(value) {
  const g = fixtureGender(value);
  if (g === 'men') return "Men's fixture";
  if (g === 'women') return "Women's fixture";
  return '';
}