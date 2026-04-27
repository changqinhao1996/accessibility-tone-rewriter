/**
 * Flesch–Kincaid Grade Level readability scorer.
 *
 * Formula: FKGL = 0.39 × (words/sentences) + 11.8 × (syllables/words) − 15.59
 *
 * Returns a grade level number (e.g., 6.2 means ~6th grade).
 * Used by the service layer to report calculatedGradeLevel,
 * and by acceptance tests to independently verify ±1 grade tolerance.
 */

/**
 * Count syllables in a single word using a heuristic approach.
 */
function countSyllables(word: string): number {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, "");
  if (cleaned.length === 0) return 0;
  if (cleaned.length <= 2) return 1;

  let count = 0;
  const vowels = "aeiouy";
  let prevWasVowel = false;

  for (let i = 0; i < cleaned.length; i++) {
    const isVowel = vowels.includes(cleaned[i]!);
    if (isVowel && !prevWasVowel) {
      count++;
    }
    prevWasVowel = isVowel;
  }

  // Adjust for silent 'e' at end
  if (cleaned.endsWith("e") && count > 1) {
    count--;
  }

  // Adjust for common endings
  if (cleaned.endsWith("le") && cleaned.length > 2 && !vowels.includes(cleaned[cleaned.length - 3]!)) {
    count++;
  }

  return Math.max(1, count);
}

/**
 * Calculate the Flesch–Kincaid Grade Level for a given text.
 *
 * @param text - The text to analyze
 * @returns The grade level as a number (e.g., 6.2)
 */
export function readabilityScore(text: string): number {
  if (!text || text.trim().length === 0) {
    return 0;
  }

  // Split into sentences (period, exclamation, question mark)
  const sentences = text
    .split(/[.!?]+/)
    .filter((s) => s.trim().length > 0);
  const totalSentences = Math.max(1, sentences.length);

  // Split into words
  const words = text
    .split(/\s+/)
    .filter((w) => w.replace(/[^a-zA-Z]/g, "").length > 0);
  const totalWords = Math.max(1, words.length);

  // Count total syllables
  const totalSyllables = words.reduce(
    (sum, word) => sum + countSyllables(word),
    0
  );

  // Flesch–Kincaid Grade Level formula
  const grade =
    0.39 * (totalWords / totalSentences) +
    11.8 * (totalSyllables / totalWords) -
    15.59;

  // Clamp to reasonable range (0–20)
  return Math.round(Math.max(0, Math.min(20, grade)) * 10) / 10;
}
