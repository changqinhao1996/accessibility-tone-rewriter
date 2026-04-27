import type { PrismaClient } from "../../generated/prisma/client.js";
import type { IAccessibilityChecker } from "./IAccessibilityChecker.js";
import { wcagAltTextCheck } from "./wcagAltTextCheck.js";

/**
 * Response shape for GenerateAltTextService.generate()
 */
export interface GenerateAltTextResult {
  imageAltTextId: string | null;
  imageId: string;
  altText: string | null;
  wcagCompliant: boolean;
  status: "success" | "complex" | "validation_error";
  error?: string;
}

/**
 * Response shape for GenerateAltTextService.approve()
 */
export interface ApproveAltTextResult {
  imageId: string;
  altText: string;
  approved: true;
  status: "success";
}

/**
 * Application service for UC2: GenerateImageAltText.
 *
 * Orchestrates the alt-text generation workflow:
 * 1. Validates image eligibility (must exist and hasAltText === false)
 * 2. Delegates to AccessibilityChecker (injected via constructor)
 * 3. Handles complexity flag
 * 4. Runs WCAG compliance check
 * 5. Persists ImageAltText record (approved: false — awaiting explicit approval)
 *
 * A separate approve() method sets approved: true (A4: approval is explicit).
 */
export class GenerateAltTextService {
  private readonly accessibilityChecker: IAccessibilityChecker;
  private readonly prisma: PrismaClient;

  constructor(accessibilityChecker: IAccessibilityChecker, prisma: PrismaClient) {
    this.accessibilityChecker = accessibilityChecker;
    this.prisma = prisma;
  }

  /**
   * Generate alt text for the specified image.
   *
   * @param imageId  - ID of the DocumentImage to describe
   * @param context  - Optional context string describing image purpose
   */
  async generate(imageId: string, context?: string): Promise<GenerateAltTextResult> {
    // 1. Load and validate the image
    const image = await this.prisma.documentImage.findUnique({
      where: { id: imageId },
    });

    if (!image) {
      return {
        imageAltTextId: null,
        imageId,
        altText: null,
        wcagCompliant: false,
        status: "validation_error",
        error: "Image not found",
      };
    }

    // 2. Reject if already has approved Alt Text (UC2-S05)
    if (image.hasAltText) {
      return {
        imageAltTextId: null,
        imageId,
        altText: null,
        wcagCompliant: false,
        status: "validation_error",
        error: "This image already has approved Alt Text",
      };
    }

    // 3. Delegate to AccessibilityChecker
    const result = await this.accessibilityChecker.generate(imageId, context);

    // 4. Handle complexity flag (UC2-S04)
    if (result.complexityFlag) {
      const record = await this.prisma.imageAltText.create({
        data: {
          imageId,
          altText: null,
          wcagCompliant: false,
          approved: false,
          status: "complex",
        },
      });

      return {
        imageAltTextId: record.id,
        imageId,
        altText: null,
        wcagCompliant: false,
        status: "complex",
        error: "This image is too complex to auto-describe. Manual description required.",
      };
    }

    // 5. WCAG compliance check
    const compliant = wcagAltTextCheck(result.altText ?? "");

    // 6. Persist pending record (approved: false — waits for explicit approval)
    const record = await this.prisma.imageAltText.create({
      data: {
        imageId,
        altText: result.altText,
        wcagCompliant: compliant,
        approved: false,
        status: "success",
      },
    });

    return {
      imageAltTextId: record.id,
      imageId,
      altText: result.altText,
      wcagCompliant: compliant,
      status: "success",
    };
  }

  /**
   * Approve and attach a previously generated Alt Text.
   * Sets ImageAltText.approved = true and DocumentImage.hasAltText = true.
   *
   * @param imageAltTextId - ID of the ImageAltText record to approve
   */
  async approve(imageAltTextId: string): Promise<ApproveAltTextResult> {
    const altTextRecord = await this.prisma.imageAltText.findUnique({
      where: { id: imageAltTextId },
    });

    if (!altTextRecord || !altTextRecord.altText) {
      throw new Error(`ImageAltText record ${imageAltTextId} not found or has no alt text`);
    }

    // Update both tables atomically (A4 — attachment is explicit)
    await this.prisma.$transaction([
      this.prisma.imageAltText.update({
        where: { id: imageAltTextId },
        data: { approved: true },
      }),
      this.prisma.documentImage.update({
        where: { id: altTextRecord.imageId },
        data: { hasAltText: true },
      }),
    ]);

    return {
      imageId: altTextRecord.imageId,
      altText: altTextRecord.altText,
      approved: true,
      status: "success",
    };
  }
}
