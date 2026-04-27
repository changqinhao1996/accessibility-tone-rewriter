@uc2
Feature: UC2 - Generate Image Alt Text


  # Use case: GenerateImageAltText
  # Actors: ContentDesigner (Initiator), AccessibilityChecker (Communicating Service)
  # Goal: Generate a WCAG-compliant Alt Text string for an image and attach it
  #       to image metadata upon ContentDesigner approval.

  Background:
    Given the ContentDesigner is logged in
    And the document contains an image without Alt Text
    And the AccessibilityChecker service is operational

  # ── Happy Path ──────────────────────────────────────────────────────────────

  Scenario: UC2-S01 Successfully generate and attach Alt Text with optional context
    When the ContentDesigner selects the image without Alt Text
    And the ContentDesigner provides the context "Diagram showing patient intake workflow"
    And the ContentDesigner submits the Alt Text generation request
    Then a descriptive Alt Text is generated for the image
    And the system displays the generated Alt Text for review
    And the ContentDesigner approves the Alt Text
    And the Alt Text is attached to the image metadata

  Scenario: UC2-S02 Successfully generate and attach Alt Text without context
    When the ContentDesigner selects the image without Alt Text
    And the ContentDesigner submits the Alt Text generation request without providing context
    Then a descriptive Alt Text is generated for the image
    And the system displays the generated Alt Text for review
    And the ContentDesigner approves the Alt Text
    And the Alt Text is attached to the image metadata

  # ── Persistence ─────────────────────────────────────────────────────────────

  Scenario: UC2-S03 Approved Alt Text is persisted to the image record
    When the ContentDesigner selects the image without Alt Text
    And the ContentDesigner submits the Alt Text generation request without providing context
    And the ContentDesigner approves the Alt Text
    Then the image record in the database has an approved Alt Text attached

  # ── Failure / Precondition Scenarios ────────────────────────────────────────

  Scenario: UC2-S04 Generation fails gracefully when image is too complex to auto-describe
    Given the document contains a highly complex image that cannot be auto-described
    When the ContentDesigner selects the complex image
    And the ContentDesigner submits the Alt Text generation request without providing context
    Then no Alt Text is generated
    And the system displays an error indicating the image requires manual description

  Scenario: UC2-S05 Submission is blocked when no eligible image exists
    Given all images in the document already have approved Alt Text
    When the ContentDesigner attempts to submit an Alt Text generation request
    Then the system displays an error indicating no eligible image is available
    And no Alt Text generation request is sent to the AccessibilityChecker

  # ── Quality / NFR ───────────────────────────────────────────────────────────

  Scenario: UC2-S06 Generated Alt Text complies with WCAG standards and is hallucination-free
    When the ContentDesigner selects the image without Alt Text
    And the ContentDesigner submits the Alt Text generation request without providing context
    Then a descriptive Alt Text is generated for the image
    And the generated Alt Text complies with WCAG accessibility standards
    And the generated Alt Text does not describe elements absent from the image
