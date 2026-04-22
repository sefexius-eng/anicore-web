export function isAdult(
  birthDate: Date | string | null | undefined,
  referenceDate = new Date(),
): boolean {
  if (!birthDate) {
    return false;
  }

  const parsedBirthDate =
    birthDate instanceof Date ? birthDate : new Date(birthDate);

  if (Number.isNaN(parsedBirthDate.getTime())) {
    return false;
  }

  const currentYear = referenceDate.getUTCFullYear();
  const birthYear = parsedBirthDate.getUTCFullYear();
  let age = currentYear - birthYear;

  const currentMonth = referenceDate.getUTCMonth();
  const birthMonth = parsedBirthDate.getUTCMonth();
  const currentDay = referenceDate.getUTCDate();
  const birthDay = parsedBirthDate.getUTCDate();

  if (
    currentMonth < birthMonth ||
    (currentMonth === birthMonth && currentDay < birthDay)
  ) {
    age -= 1;
  }

  return age >= 18;
}
