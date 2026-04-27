@uc1
Feature: UC1 - Rewrite Content For Target Audience


  Background:
    Given the ContentDesigner is logged in
    And a document containing source text is loaded
    And the StyleRewriter service is operational

  Scenario: UC1-S01 Successfully generate a rewritten draft for a specific audience
    When the ContentDesigner selects the audience profile "Pediatric"
    And the ContentDesigner specifies a target reading grade level of "6"
    And the ContentDesigner submits the rewrite request
    Then a rewritten draft is generated preserving the original semantic intent
    And the system presents the rewritten draft alongside the original text
    And the calculated reading level of the draft is within 1 grade of "6"

  Scenario: UC1-S02 Rewrite generation completes within required latency threshold
    When the ContentDesigner selects the audience profile "Legal"
    And the ContentDesigner specifies a target reading grade level of "12"
    And the ContentDesigner submits the rewrite request
    Then the rewritten draft must be generated in under 700 milliseconds

  Scenario: UC1-S03 Generation fails gracefully due to ambiguous source text
    Given the loaded document contains highly ambiguous, unsafe text
    When the ContentDesigner submits the rewrite request
    Then no rewritten draft is generated
    And the system displays an error indicating the text is too ambiguous to rewrite safely

  Scenario: UC1-S04 Validation prevents submission of invalid source text
    Given the loaded document is empty
    When the ContentDesigner submits the rewrite request
    Then the system displays a validation error regarding the missing source text
