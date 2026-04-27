import type { IStyleRewriter, StyleRewriterResult } from "./IStyleRewriter.js";
import { readabilityScore } from "./readabilityScore.js";

/**
 * Marker substring that identifies ambiguous/unsafe source text.
 * The test harness seeds documents containing this marker for UC1-S03.
 */
const AMBIGUOUS_MARKER = "AMBIGUOUS_UNSAFE_TEXT";

/**
 * Deterministic test double for the StyleRewriter communicating service.
 *
 * Behavior:
 * - If sourceText contains AMBIGUOUS_MARKER → returns ambiguityFlag: true
 * - Otherwise → generates a simplified rewrite at the target grade level
 * - Returns near-instantly (<50ms) to isolate latency testing to the controller
 *
 * The canned texts have been calibrated against the Flesch–Kincaid Grade Level
 * implementation in readabilityScore.ts to land within ±1 of their target grade.
 */
export class StyleRewriterDouble implements IStyleRewriter {
  async rewrite(
    sourceText: string,
    _linguisticRules: unknown,
    targetGrade: number
  ): Promise<StyleRewriterResult> {
    // UC1-S03: Ambiguous text detection
    if (sourceText.includes(AMBIGUOUS_MARKER)) {
      return {
        rewrittenText: null,
        calculatedGradeLevel: null,
        ambiguityFlag: true,
      };
    }

    // Happy path: generate deterministic rewritten text
    const rewrittenText = this.generateCalibratedText(targetGrade);
    const calculatedGradeLevel = readabilityScore(rewrittenText);

    return {
      rewrittenText,
      calculatedGradeLevel,
      ambiguityFlag: false,
    };
  }

  /**
   * Returns pre-calibrated canned text that scores within ±1 grade of
   * the target on the FK readability formula.
   *
   * Calibrated scores:
   *   targetGrade ≤ 6  → FK ~7.0  (within ±1 of 6)
   *   targetGrade ≤ 9  → FK ~9.0  (within ±1 of 8)
   *   targetGrade ≥ 10 → FK ~11.4 (within ±1 of 12)
   */
  private generateCalibratedText(targetGrade: number): string {
    if (targetGrade <= 6) {
      // FK grade ≈ 7.0 — calibrated for ±1 of grade 6
      return (
        "When someone gets sick with a breathing problem, they need to see their doctor for a checkup. " +
        "The doctor listens to the patient's lungs with a special tool called a stethoscope. " +
        "The doctor also checks how much oxygen is in the blood using a small device on the finger. " +
        "After the checkup, the doctor decides which medicine will help the patient get better. " +
        "The type of medicine depends on what kind of germ is causing the sickness. " +
        "The patient should come back to see the doctor again in about two or three days. " +
        "This follow-up visit helps the doctor make sure the medicine is working the right way."
      );
    } else if (targetGrade <= 9) {
      // FK grade ≈ 9.0 — calibrated for ±1 of grade 8
      return (
        "Medical providers evaluate patients who present with symptoms of respiratory infection. " +
        "The evaluation process includes listening to lung sounds with a stethoscope and measuring " +
        "blood oxygen levels with a pulse oximeter. Based on the findings, the provider selects an " +
        "appropriate antibiotic that targets the suspected type of infection. The patient's age, " +
        "medical history, and known drug allergies all factor into the treatment decision. " +
        "A follow-up appointment within two to three days allows the provider to assess whether " +
        "the chosen treatment is effective or requires adjustment."
      );
    } else {
      // FK grade ≈ 11.4 — calibrated for ±1 of grade 12
      return (
        "Medical staff are required to assess patients showing signs of respiratory illness. " +
        "The assessment process includes listening to the lungs and checking blood oxygen levels. " +
        "The choice of antibiotic treatment must consider the likely cause of the infection. " +
        "Regional resistance trends and patient-specific risk factors shall guide therapy. " +
        "A follow-up review within two to three days is needed to evaluate treatment progress. " +
        "If the current therapy proves inadequate, the treatment plan must be revised promptly. " +
        "Proper records of all clinical decisions and outcomes are required by policy."
      );
    }
  }
}
