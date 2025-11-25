[README.md](https://github.com/user-attachments/files/23752703/README.md)
# Academic Paper Knowledge Graph System

## Overview

An agentic system that constructs semantic knowledge graphs from academic papers in the Gaussian Splatting domain. Uses **Mistral AI** to extract concepts, methods, and relationships from unstructured research papers and stores them in a queryable PostgreSQL graph database.

## Key Features

-  **Agentic Extraction**: Mistral-powered entity and relationship extraction
-  **Graph Database**: PostgreSQL with optimized schema for graph traversal
-  **Semantic Relationships**: Beyond citations - captures "improves_on", "extends", "introduces"
-  **Validation**: Multi-layer quality checks with confidence scoring
-  **Scalable**: Clear path from 50 papers to 1M+ papers

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+ (or Supabase account)
- Mistral AI API key ([Get one here](https://console.mistral.ai/))

### Installation

```bash
# Clone repository
git clone <your-repo>
cd paper-graph-system

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Mistral API key and database URL

# Set up database
createdb paper_graph
psql paper_graph < src/database/schema.sql
# OR use Supabase SQL editor

# Build and run
npm run build
npm start
```

### Environment Variables

Create a `.env` file with:

```bash
MISTRAL_API_KEY=your_mistral_api_key_here
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/paper_graph
```

Get your Mistral API key from: https://console.mistral.ai/

## Architecture

```
┌─────────────────────────────────────┐
│     Pipeline Orchestrator           │
│  (Coordinates agent workflow)       │
└──────────┬──────────────────────────┘
           │
   ┌───────┼───────┐
   │       │       │
   ▼       ▼       ▼
┌──────┐ ┌────┐ ┌──────┐
│ArXiv │ │LLM │ │Valid.│
│Agent │ │Extr│ │Agent │
└──┬───┘ └─┬──┘ └───┬──┘
   │       │        │
   └───────┴────────┘
           │
     (Mistral AI)
           │
           ▼
    ┌─────────────┐
    │  PostgreSQL │
    └─────────────┘
```

### Core Components

1. **ArxivClient**: Fetches papers from ArXiv API
2. **ExtractionAgent**: Uses Mistral Large to extract entities and relationships
3. **DatabaseClient**: Manages PostgreSQL operations
4. **Orchestrator**: Coordinates the pipeline workflow

## Database Schema

### Core Tables

- **papers**: Academic publications with metadata
- **concepts**: Extracted ideas, methods, techniques
- **relationships**: Semantic connections between entities
- **paper_concepts**: Links papers to their concepts

### Example Queries

```sql
-- Find papers that improve on original 3DGS
SELECT p.title, r.evidence, r.confidence
FROM papers p
JOIN relationships r ON r.source_id = p.id
WHERE r.relationship_type = 'improves_on'
ORDER BY r.confidence DESC;

-- Most influential concepts
SELECT name, category, frequency
FROM concepts
ORDER BY frequency DESC
LIMIT 10;

-- Papers with extracted concepts
SELECT p.title, c.name, pc.confidence
FROM papers p
JOIN paper_concepts pc ON pc.paper_id = p.id
JOIN concepts c ON c.id = pc.concept_id
ORDER BY pc.confidence DESC;
```

## Design Decisions

### Why PostgreSQL over Neo4j?
- Production-proven at scale (Facebook TAO)
- JSONB for schema flexibility
- Better tooling and operational experience
- Strong ACID guarantees

### Why Sequential Processing (PoC)?
- Simpler implementation and debugging
- Respects API rate limits naturally
- Clear path to parallel processing (Redis queue)

### Why Confidence Scoring?
- Handles LLM uncertainty
- Enables quality filtering
- Supports human review prioritization

### Why Mistral's JSON Mode?
- Guarantees valid JSON output (no parsing errors)
- More consistent than prompt-based JSON generation
- Reduces hallucination in structured output



## Testing

```bash
# Quick test with 3 papers
# Edit src/main.ts: buildGaussianSplattingGraph(3)
npm start

# Test database connection
psql $DATABASE_URL -c "SELECT COUNT(*) FROM papers;"

# Run example queries
psql $DATABASE_URL < examples/queries.sql
```

For questions: [joedimos@gmail.com]
