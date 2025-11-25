import * as dotenv from 'dotenv';
import { PipelineOrchestrator } from './orchestrator.js';

dotenv.config();

async function main() {
  console.log('Academic Paper Knowledge Graph Builder');
  console.log('Powered by Mistral');
  console.log('==========================================');

  console.log('Step 1: Loading environment variables...');
  const apiKey = process.env.MISTRAL_API_KEY;
  const dbUrl = process.env.DATABASE_URL;

  if (!apiKey || apiKey.trim() === '') {
    console.error('Error: MISTRAL_API_KEY not set in .env file');
    console.error('   Get your API key from: https://console.mistral.ai/');
    process.exit(1);
  }

  if (!dbUrl || dbUrl.trim() === '') {
    console.error('Error: DATABASE_URL not set in .env file');
    console.error('   Example: postgresql://user:pass@localhost:5432/knowledge_graph');
    process.exit(1);
  }

  console.log('Environment variables loaded');

  console.log('Step 2: Initializing agentic system...');
  const orchestrator = new PipelineOrchestrator(apiKey, dbUrl);
  console.log('Agentic system initialized');

  try {
    console.log('Step 3: Building Gaussian Splatting Knowledge Graph...');
    console.log('Target: 50-100 related papers');
    console.log('Starting with seminal paper: 2308.04079');
    
    await orchestrator.buildGaussianSplattingGraph(50);
    
    console.log('Knowledge Graph construction completed successfully!');
    console.log('Example queries you can run:');
    console.log('   psql $DATABASE_URL');
    console.log('   SELECT * FROM papers WHERE arxiv_id = \'2308.04079\';');
    console.log('   SELECT concept_name, COUNT(*) FROM paper_concepts GROUP BY concept_name ORDER BY count DESC;');
    console.log('   SELECT * FROM relationships WHERE relationship_type = \'improves_on\';');
    
  } catch (error: any) {
    console.error('Pipeline failed:', error.message);
    process.exit(1);
  } finally {
    console.log('Step 4: Closing system connections...');
    await orchestrator.close();
    console.log('All connections closed');
  }
}

console.log('Starting Agentic Knowledge Graph System...');
main().then(() => {
  console.log('System execution finished');
  process.exit(0);
}).catch((error) => {
  console.error('Unhandled system error:', error);
  process.exit(1);
});
