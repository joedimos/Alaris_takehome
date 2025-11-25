import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Paper, Concept, Relationship, Method, Dataset, Metric, DatabaseStats } from '../types.js';

export class DatabaseClient {
  private supabase: SupabaseClient;

  constructor(dbUrl: string) {
    if (!dbUrl) {
      throw new Error('DATABASE_URL is required');
    }
    
    const supabaseKey = process.env.SUPABASE_KEY;
    if (!supabaseKey) {
      throw new Error('SUPABASE_KEY is required');
    }
    
    this.supabase = createClient(dbUrl, supabaseKey);
    console.log('    DatabaseClient: REAL Supabase connection established');
  }

  async findPaperByArxivId(arxivId: string): Promise<Paper | null> {
    const { data, error } = await this.supabase
      .from('papers')
      .select('*')
      .eq('arxiv_id', arxivId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Database query failed: ${error.message}`);
    }

    return data as Paper;
  }

  async insertPaper(paper: Paper): Promise<string> {
  const { data, error } = await this.supabase
    .from('papers')
    .insert({
      arxiv_id: paper.arxiv_id,
      title: paper.title,
      abstract: paper.abstract,
      published_date: paper.published_date,
      pdf_url: paper.pdf_url
      // Remove categories line
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to insert paper: ${error.message}`);
  }

  console.log(`   Paper stored: "${paper.title.substring(0, 60)}..."`);
  return data.id;
}
  async insertConcept(concept: Concept): Promise<string> {
    // First try to find existing concept
    const { data: existing } = await this.supabase
      .from('concepts')
      .select('id')
      .eq('name', concept.name)
      .eq('category', concept.category)
      .single();

    if (existing) {
      return existing.id;
    }

    // Insert new concept
    const { data, error } = await this.supabase
      .from('concepts')
      .insert({
        name: concept.name,
        category: concept.category,
        description: concept.description
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to insert concept: ${error.message}`);
    }

    console.log(`    Concept stored: "${concept.name}"`);
    return data.id;
  }

  async linkPaperConcept(paperId: string, conceptId: string, relationship: string, confidence: number): Promise<void> {
    const { error } = await this.supabase
      .from('paper_concepts')
      .insert({
        paper_id: paperId,
        concept_id: conceptId,
        relationship: relationship,
        confidence_score: confidence
      });

    if (error) {
      throw new Error(`Failed to link paper-concept: ${error.message}`);
    }
  }

  async insertRelationship(paperId: string, relationship: Relationship): Promise<void> {
    const { error } = await this.supabase
      .from('relationships')
      .insert({
        source_paper_id: paperId,
        relationship_type: relationship.relationship_type,
        target_concept: relationship.target_concept,
        evidence: relationship.evidence,
        confidence_score: relationship.confidence
      });

    if (error) {
      throw new Error(`Failed to insert relationship: ${error.message}`);
    }

    console.log(`    Relationship stored: ${relationship.relationship_type} -> ${relationship.target_concept}`);
  }

  async getStats(): Promise<DatabaseStats> {
    const [
      papersResult,
      conceptsResult,
      relationshipsResult,
      methodsResult,
      datasetsResult,
      metricsResult
    ] = await Promise.all([
      this.supabase.from('papers').select('*', { count: 'exact', head: true }),
      this.supabase.from('concepts').select('*', { count: 'exact', head: true }),
      this.supabase.from('relationships').select('*', { count: 'exact', head: true }),
      this.supabase.from('methods').select('*', { count: 'exact', head: true }),
      this.supabase.from('datasets').select('*', { count: 'exact', head: true }),
      this.supabase.from('metrics').select('*', { count: 'exact', head: true })
    ]);

    return {
      papers: papersResult.count || 0,
      concepts: conceptsResult.count || 0,
      relationships: relationshipsResult.count || 0,
      methods: methodsResult.count || 0,
      datasets: datasetsResult.count || 0,
      metrics: metricsResult.count || 0
    };
  }

  async close(): Promise<void> {
    console.log('    Database connection closed');
  }
}
