import { Paper, ExtractionResult, Concept, Method, Relationship, Dataset, Metric } from '../types.js';

export class ExtractionAgent {
  private apiKey: string;
  private baseUrl = 'https://api.mistral.ai/v1';

  constructor(apiKey: string) {
    if (!apiKey || apiKey === 'your_mistral_api_key_here') {
      throw new Error('VALID Mistral API key REQUIRED. Get one from: https://console.mistral.ai/');
    }
    this.apiKey = apiKey;
    console.log('   ExtractionAgent initialized (REAL Mistral AI ONLY)');
  }

  // Extract entities from a single paper
  async extractEntities(paper: Paper): Promise<ExtractionResult> {
    console.log(`   Analyzing paper with REAL Mistral AI...`);
    
    const prompt = this.buildAnalysisPrompt(paper);
    const response = await this.callMistralAPI(prompt);
    const extraction = this.parseAIResponse(response, paper);
    
    console.log(`   AI extraction completed: ${extraction.concepts.length} concepts, ${extraction.relationships.length} relationships`);
    return extraction;
  }

  // Extract entities from multiple papers
  async extractEntitiesFromMultiplePapers(papers: Paper[]): Promise<Map<string, ExtractionResult>> {
    console.log(`\n   Starting batch extraction for ${papers.length} papers...`);
    const results = new Map<string, ExtractionResult>();
    
    for (let i = 0; i < papers.length; i++) {
      const paper = papers[i];
      console.log(`\n   [${i + 1}/${papers.length}] Processing: "${paper.title}"`);
      
      try {
        const extraction = await this.extractEntities(paper);
        results.set(paper.arxiv_id, extraction);
        console.log(`   ✓ Successfully extracted from paper ${i + 1}`);
      } catch (error: any) {
        console.error(`   ✗ Failed to extract from paper ${i + 1}: ${error.message}`);
        // Store empty result to maintain consistency
        results.set(paper.arxiv_id, {
          concepts: [],
          methods: [],
          datasets: [],
          metrics: [],
          relationships: []
        });
      }
      
      // Add delay between papers to avoid rate limiting
      if (i < papers.length - 1) {
        console.log(`   Waiting 1s before next paper...`);
        await this.sleep(1000);
      }
    }
    
    console.log(`\n   Batch extraction complete: ${results.size}/${papers.length} papers processed`);
    return results;
  }

  // Extract entities from multiple papers in parallel (faster but may hit rate limits)
  async extractEntitiesInParallel(papers: Paper[], concurrency: number = 3): Promise<Map<string, ExtractionResult>> {
    console.log(`\n   Starting parallel extraction for ${papers.length} papers (concurrency: ${concurrency})...`);
    const results = new Map<string, ExtractionResult>();
    
    // Process papers in batches
    for (let i = 0; i < papers.length; i += concurrency) {
      const batch = papers.slice(i, i + concurrency);
      console.log(`\n   Processing batch ${Math.floor(i / concurrency) + 1} (papers ${i + 1}-${Math.min(i + concurrency, papers.length)})...`);
      
      const batchPromises = batch.map(async (paper) => {
        try {
          const extraction = await this.extractEntities(paper);
          return { paperId: paper.arxiv_id, extraction, success: true };
        } catch (error: any) {
          console.error(`   ✗ Failed to extract from "${paper.title}": ${error.message}`);
          return { 
            paperId: paper.arxiv_id, 
            extraction: {
              concepts: [],
              methods: [],
              datasets: [],
              metrics: [],
              relationships: []
            },
            success: false
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(result => {
        results.set(result.paperId, result.extraction);
      });
      
      // Add delay between batches
      if (i + concurrency < papers.length) {
        console.log(`   Waiting 2s before next batch...`);
        await this.sleep(2000);
      }
    }
    
    console.log(`\n   Parallel extraction complete: ${results.size}/${papers.length} papers processed`);
    return results;
  }

  private buildAnalysisPrompt(paper: Paper): string {
    return `Analyze this computer vision research paper and extract structured knowledge as JSON:

PAPER: "${paper.title}"
AUTHORS: ${paper.authors.join(', ')}
ABSTRACT: ${paper.abstract}

Extract the following information as VALID JSON:

1. CONCEPTS: Key technical concepts mentioned (include confidence 0-1)
2. METHODS: Specific algorithms or techniques (mark if baseline)
3. DATASETS: Evaluation datasets used  
4. METRICS: Performance metrics reported
5. RELATIONSHIPS: Semantic relationships between concepts with evidence from text

Return ONLY valid JSON in this exact structure:
{
  "concepts": [
    {
      "name": "concept name",
      "category": "method|technique|problem|domain|application|framework", 
      "description": "brief description",
      "confidence": 0.95
    }
  ],
  "methods": [
    {
      "name": "method name",
      "description": "what it does",
      "is_baseline": false,
      "confidence": 0.9
    }
  ],
  "datasets": [
    {
      "name": "dataset name", 
      "description": "what it contains"
    }
  ],
  "metrics": [
    {
      "name": "metric name",
      "unit": "optional unit",
      "higher_is_better": true
    }
  ],
  "relationships": [
    {
      "relationship_type": "introduces|extends|improves_on|evaluates|uses|compares|applies",
      "target_concept": "concept name",
      "evidence": "specific text evidence from abstract",
      "confidence": 0.9
    }
  ]
}

Focus on computer vision and 3D reconstruction concepts. Be precise and evidence-based.`;
  }

  private async callMistralAPI(prompt: string): Promise<string> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`   Mistral AI API attempt ${attempt}/3...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'mistral-large-latest',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 4000
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Mistral API ${response.status}: ${errorText.substring(0, 100)}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;
        
        if (!content) {
          throw new Error('Empty response content from Mistral AI');
        }

        console.log(`   Mistral AI response received (${content.length} chars)`);
        return content;

      } catch (error: any) {
        lastError = error;
        console.log(`     Mistral API attempt ${attempt} failed: ${error.message}`);
        
        if (attempt < 3) {
          const delay = 2000 * attempt;
          console.log(`   Retrying Mistral API in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    throw new Error(`FAILED to call Mistral AI API after 3 attempts. Last error: ${lastError!.message}`);
  }

  private parseAIResponse(response: string, paper: Paper): ExtractionResult {
    try {
      console.log(`   Parsing AI response...`);
      
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate all required arrays exist
      if (!parsed.concepts || !parsed.methods || !parsed.datasets || !parsed.metrics || !parsed.relationships) {
        throw new Error('Missing required arrays in AI response');
      }

      return {
        concepts: this.validateConcepts(parsed.concepts),
        methods: this.validateMethods(parsed.methods),
        datasets: this.validateDatasets(parsed.datasets),
        metrics: this.validateMetrics(parsed.metrics),
        relationships: this.validateRelationships(parsed.relationships, paper)
      };

    } catch (error: any) {
      throw new Error(`Failed to parse AI extraction: ${error.message}`);
    }
  }

  private validateConcepts(concepts: any[]): Concept[] {
    return concepts
      .filter(concept => concept && concept.name && concept.category && concept.description)
      .map(concept => ({
        name: concept.name.toString().trim(),
        category: this.validateCategory(concept.category),
        description: concept.description.toString().trim(),
        confidence: Math.min(1, Math.max(0, Number(concept.confidence) || 0.7))
      }))
      .filter(concept => concept.name.length > 1);
  }

  private validateMethods(methods: any[]): Method[] {
    return methods
      .filter(method => method && method.name && method.description)
      .map(method => ({
        name: method.name.toString().trim(),
        description: method.description.toString().trim(),
        is_baseline: Boolean(method.is_baseline),
        confidence: Math.min(1, Math.max(0, Number(method.confidence) || 0.7))
      }));
  }

  private validateDatasets(datasets: any[]): Dataset[] {
    return datasets
      .filter(dataset => dataset && dataset.name)
      .map(dataset => ({
        name: dataset.name.toString().trim(),
        description: (dataset.description || '').toString().trim(),
        task_type: dataset.task_type?.toString(),
        size: dataset.size?.toString()
      }));
  }

  private validateMetrics(metrics: any[]): Metric[] {
    return metrics
      .filter(metric => metric && metric.name)
      .map(metric => ({
        name: metric.name.toString().trim(),
        unit: metric.unit?.toString(),
        higher_is_better: Boolean(metric.higher_is_better),
        description: metric.description?.toString()
      }));
  }

  private validateRelationships(relationships: any[], paper: Paper): Relationship[] {
    return relationships
      .filter(rel => rel && rel.relationship_type && rel.target_concept && rel.evidence)
      .map(rel => ({
        relationship_type: this.validateRelationshipType(rel.relationship_type),
        target_concept: rel.target_concept.toString().trim(),
        evidence: rel.evidence.toString().trim(),
        confidence: Math.min(1, Math.max(0, Number(rel.confidence) || 0.7))
      }))
      .filter(rel => this.isEvidenceInPaper(rel.evidence, paper));
  }

  private validateCategory(category: string): Concept['category'] {
    const validCategories = ['method', 'technique', 'problem', 'domain', 'application', 'framework'];
    return validCategories.includes(category.toLowerCase()) ? category.toLowerCase() as any : 'technique';
  }

  private validateRelationshipType(type: string): Relationship['relationship_type'] {
    const validTypes = ['introduces', 'extends', 'improves_on', 'evaluates', 'uses', 'compares', 'applies'];
    return validTypes.includes(type.toLowerCase()) ? type.toLowerCase() as any : 'uses';
  }

  private isEvidenceInPaper(evidence: string, paper: Paper): boolean {
    const paperText = `${paper.title} ${paper.abstract}`.toLowerCase();
    return paperText.includes(evidence.toLowerCase().substring(0, 20));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
