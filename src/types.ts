export interface Paper {
  arxiv_id: string;
  title: string;
  authors: string[];
  abstract: string;
  published_date: string;
  pdf_url: string;
  categories: string[];
}

export interface ArxivPaper extends Paper {
  // Additional fields if needed
}

export interface Concept {
  name: string;
  category: 'method' | 'technique' | 'problem' | 'domain' | 'application' | 'framework';
  description: string;
  confidence: number;
}

export interface Method {
  name: string;
  description: string;
  is_baseline: boolean;
  confidence: number;
}

export interface Dataset {
  name: string;
  description?: string;
  task_type?: string;
  size?: string;
}

export interface Metric {
  name: string;
  unit?: string;
  higher_is_better: boolean;
  description?: string;
}

export interface Relationship {
  relationship_type: 'introduces' | 'extends' | 'improves_on' | 'evaluates' | 'uses' | 'compares' | 'applies';
  target_concept: string;
  evidence: string;
  confidence: number;
}

export interface ExtractionResult {
  concepts: Concept[];
  methods: Method[];
  datasets: Dataset[];
  metrics: Metric[];
  relationships: Relationship[];
}

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  issues: string[];
  extraction: ExtractionResult;
}

export interface DatabaseStats {
  papers: number;
  concepts: number;
  relationships: number;
  methods: number;
  datasets: number;
  metrics: number;
}
