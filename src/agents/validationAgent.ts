import { Paper, ExtractionResult, Concept, Relationship, ValidationResult } from '../types.js';

export class ValidationAgent {
  constructor() {
    console.log('   ValidationAgent initialized (REAL validation only)');
  }

  async validateExtraction(extraction: ExtractionResult, paper: Paper): Promise<ValidationResult> {
    console.log(`   Validating extraction quality...`);
    
    const issues: string[] = [];
    let overallConfidence = 0;
    let validEntityCount = 0;

    // Validate concepts - REAL validation only
    const validConcepts: Concept[] = [];
    for (const concept of extraction.concepts) {
      if (this.validateConcept(concept, paper)) {
        validConcepts.push(concept);
        overallConfidence += concept.confidence;
        validEntityCount++;
      } else {
        issues.push(`Low-confidence concept: ${concept.name}`);
      }
    }

    // Validate relationships - REAL validation only
    const validRelationships: Relationship[] = [];
    for (const relationship of extraction.relationships) {
      if (this.validateRelationship(relationship, paper)) {
        validRelationships.push(relationship);
        overallConfidence += relationship.confidence;
        validEntityCount++;
      } else {
        issues.push(`Weak relationship: ${relationship.relationship_type} -> ${relationship.target_concept}`);
      }
    }

    // Calculate overall confidence
    overallConfidence = validEntityCount > 0 ? overallConfidence / validEntityCount : 0;

    const isValid = validConcepts.length > 0 && overallConfidence >= 0.6;

    if (!isValid) {
      console.log(`     Validation issues: ${issues.join(', ')}`);
    }

    return {
      isValid,
      confidence: overallConfidence,
      issues,
      extraction: {
        ...extraction,
        concepts: validConcepts,
        relationships: validRelationships
      }
    };
  }

  private validateConcept(concept: Concept, paper: Paper): boolean {
    // Real validation logic - no mock fallback
    if (concept.confidence < 0.4) return false;
    if (concept.name.length < 2 || concept.name.length > 100) return false;
    if (!this.isConceptRelevant(concept, paper)) return false;
    return true;
  }

  private validateRelationship(relationship: Relationship, paper: Paper): boolean {
    // Real validation logic - no mock fallback
    if (relationship.confidence < 0.5) return false;
    if (relationship.evidence.length < 10) return false;
    if (!this.isRelationshipSensible(relationship, paper)) return false;
    return true;
  }

  private isConceptRelevant(concept: Concept, paper: Paper): boolean {
    const content = `${paper.title} ${paper.abstract}`.toLowerCase();
    const conceptLower = concept.name.toLowerCase();
    return content.includes(conceptLower) || this.hasSemanticOverlap(concept.name, content);
  }

  private isRelationshipSensible(relationship: Relationship, paper: Paper): boolean {
    const content = `${paper.title} ${paper.abstract}`.toLowerCase();
    const evidence = relationship.evidence.toLowerCase();
    return content.includes(evidence) || evidence.length > 20;
  }

  private hasSemanticOverlap(concept: string, content: string): boolean {
    const keywords = concept.toLowerCase().split(' ');
    return keywords.some(keyword => keyword.length > 3 && content.includes(keyword));
  }
}
