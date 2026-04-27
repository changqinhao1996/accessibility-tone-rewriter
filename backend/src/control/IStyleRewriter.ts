/**
 * Result returned by a StyleRewriter implementation.
 */
export interface StyleRewriterResult {
  rewrittenText: string | null;
  calculatedGradeLevel: number | null;
  ambiguityFlag: boolean;
}

/**
 * Interface for the StyleRewriter communicating service.
 * Production implementations call an external AI/NLP service.
 * Test doubles return deterministic canned responses.
 */
export interface IStyleRewriter {
  rewrite(
    sourceText: string,
    linguisticRules: unknown,
    targetGrade: number
  ): Promise<StyleRewriterResult>;
}
