import { Paper, ArxivPaper } from '../types.js';

export class ArxivAgent {
  private baseUrl = 'http://export.arxiv.org/api/query';

  constructor() {
    console.log('   ArxivAgent initialized ');
  }

  async fetchPaper(arxivId: string): Promise<Paper> {
    console.log(`   Fetching paper ${arxivId} from arXiv...`);
    
    const query = `id_list=${arxivId}&max_results=1`;
    const url = `${this.baseUrl}?${query}`;
    
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`   Attempt ${attempt}/3: ${url}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch(url, { 
          signal: controller.signal,
          headers: {
            'User-Agent': 'AcademicKnowledgeGraph/1.0'
          }
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const text = await response.text();
        
        if (!text || text.length < 100) {
          throw new Error('Empty response from arXiv API');
        }

        console.log(`   Raw response length: ${text.length} characters`);
        
        const paper = this.parseArxivResponse(text, arxivId);
        
        if (!paper) {
          throw new Error('Failed to parse arXiv XML response');
        }

        // Validate required fields
        if (!paper.authors || paper.authors.length === 0) {
          throw new Error('No authors extracted from arXiv response');
        }
        if (!paper.title || paper.title.trim().length === 0) {
          throw new Error('No title extracted from arXiv response');
        }
        if (!paper.abstract || paper.abstract.trim().length === 0) {
          throw new Error('No abstract extracted from arXiv response');
        }

        console.log(`   Successfully retrieved: "${paper.title}"`);
        console.log(`   Authors: ${paper.authors.slice(0, 3).join(', ')}${paper.authors.length > 3 ? '...' : ''}`);
        return paper;

      } catch (error: any) {
        lastError = error;
        console.log(`     Attempt ${attempt} failed: ${error.message}`);
        
        if (attempt < 3) {
          const delay = 2000 * attempt;
          console.log(`   ⏳ Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    throw new Error(`FAILED to fetch paper ${arxivId} from arXiv. Last error: ${lastError!.message}`);
  }

  private parseArxivResponse(xmlText: string, arxivId: string): Paper {
    try {
      console.log(`   Parsing arXiv XML response...`);
      
      // Extract title
      const titleMatch = xmlText.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim().replace(/^\s*Title:\s*/i, '') : '';
      
      // Extract summary/abstract
      const abstractMatch = xmlText.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i);
      const abstract = abstractMatch ? abstractMatch[1].replace(/\s+/g, ' ').trim() : '';
      
      // Extract published date
      const publishedMatch = xmlText.match(/<published[^>]*>([\s\S]*?)<\/published>/i);
      const published = publishedMatch ? publishedMatch[1].trim() : new Date().toISOString();

      // Extract authors using robust regex
      const authors: string[] = [];
      const authorRegex = /<author>[\s\S]*?<name>([^<]+)<\/name>[\s\S]*?<\/author>/gi;
      let authorMatch;
      
      while ((authorMatch = authorRegex.exec(xmlText)) !== null) {
        if (authorMatch[1] && authorMatch[1].trim()) {
          authors.push(authorMatch[1].trim());
        }
      }

      // If no authors found with first method, try alternative method
      if (authors.length === 0) {
        const altAuthorRegex = /<name>([^<]+)<\/name>/gi;
        let altMatch;
        while ((altMatch = altAuthorRegex.exec(xmlText)) !== null) {
          // Skip if it's inside other tags that aren't author names
          const context = xmlText.substring(Math.max(0, altMatch.index - 50), Math.min(xmlText.length, altMatch.index + 50));
          if (!context.includes('<journal>') && !context.includes('<book>')) {
            authors.push(altMatch[1].trim());
          }
        }
      }

      // Extract categories
      const categories: string[] = [];
      const categoryRegex = /<category[^>]*term="([^"]*)"/gi;
      let categoryMatch;
      while ((categoryMatch = categoryRegex.exec(xmlText)) !== null) {
        if (categoryMatch[1]) {
          categories.push(categoryMatch[1]);
        }
      }

      // Ensure we have at least one author
      if (authors.length === 0) {
        authors.push('Unknown Author');
        console.log(`     No authors found, using default`);
      }

      // Validate critical fields
      if (!title) {
        throw new Error('Could not extract title from arXiv response');
      }
      if (!abstract) {
        throw new Error('Could not extract abstract from arXiv response');
      }

      const paper: Paper = {
        arxiv_id: arxivId,
        title,
        authors,
        abstract,
        published_date: published,
        pdf_url: `https://arxiv.org/pdf/${arxivId}.pdf`,
        categories: categories.length > 0 ? categories : ['cs.CV']
      };

      console.log(`   Parsed: "${paper.title.substring(0, 60)}..."`);
      console.log(`   Found ${paper.authors.length} authors`);
      console.log(`   Abstract: ${paper.abstract.length} chars`);
      
      return paper;

    } catch (error: any) {
      console.error(`   XML parsing failed: ${error.message}`);
      
      // Log a sample of the XML for debugging
      const sample = xmlText.substring(0, 500);
      console.log(`    XML sample: ${sample}...`);
      
      throw new Error(`Failed to parse arXiv response: ${error.message}`);
    }
  }

  async searchRelatedPapers(
    seminalPaperId: string, 
    limit: number = 50,
    keywords: string[] = ['gaussian splatting', '3DGS', 'radiance field']
  ): Promise<ArxivPaper[]> {
    console.log(`   Searching arXiv for Gaussian Splatting papers...`);
    
    const searchTerms = keywords.map(term => `all:"${term}"`).join(' OR ');
    const query = `search_query=${encodeURIComponent(searchTerms)}&start=0&max_results=${limit}&sortBy=submittedDate&sortOrder=descending`;
    const url = `${this.baseUrl}?${query}`;
    
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`   Search attempt ${attempt}/3`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        
        const response = await fetch(url, { 
          signal: controller.signal,
          headers: {
            'User-Agent': 'AcademicKnowledgeGraph/1.0'
          }
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const text = await response.text();
        
        if (!text || text.length < 100) {
          throw new Error('Empty response from arXiv search');
        }

        const papers = this.parseSearchResponse(text);
        
        // Filter out seminal paper and ensure relevance
        const relevantPapers = papers
          .filter(paper => paper.arxiv_id !== seminalPaperId)
          .filter(paper => this.isRelevantToGaussianSplatting(paper))
          .slice(0, limit);

        console.log(`   Found ${relevantPapers.length} relevant papers`);
        return relevantPapers;

      } catch (error: any) {
        lastError = error;
        console.log(`     Search attempt ${attempt} failed: ${error.message}`);
        
        if (attempt < 3) {
          const delay = 3000 * attempt;
          console.log(`   Retrying search in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    throw new Error(`FAILED to search arXiv for related papers. Last error: ${lastError!.message}`);
  }

  private parseSearchResponse(xmlText: string): ArxivPaper[] {
    const papers: ArxivPaper[] = [];
    
    try {
      console.log(`   Parsing search response...`);
      
      // Split by entry tags
      const entries = xmlText.split('<entry>');
      
      for (let i = 1; i < entries.length; i++) { // Skip first part (before first <entry>)
        const entry = entries[i].split('</entry>')[0]; // Get content before closing tag
        if (entry) {
          try {
            const paper = this.parseSearchEntry(entry);
            if (paper) {
              papers.push(paper);
            }
          } catch (error) {
            console.log(`     Failed to parse one entry: ${error}`);
          }
        }
      }

      if (papers.length === 0) {
        throw new Error('No valid papers found in search response');
      }

      return papers;

    } catch (error: any) {
      throw new Error(`Failed to parse search response: ${error.message}`);
    }
  }

  private parseSearchEntry(entryXml: string): ArxivPaper {
    try {
      // Extract title
      const titleMatch = entryXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim().replace(/^\s*Title:\s*/i, '') : '';
      
      // Extract summary/abstract
      const abstractMatch = entryXml.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i);
      const abstract = abstractMatch ? abstractMatch[1].replace(/\s+/g, ' ').trim() : '';
      
      // Extract published date
      const publishedMatch = entryXml.match(/<published[^>]*>([\s\S]*?)<\/published>/i);
      const published = publishedMatch ? publishedMatch[1].trim() : new Date().toISOString();
      
      // Extract ID
      const idMatch = entryXml.match(/<id[^>]*>([\s\S]*?)<\/id>/i);
      const idContent = idMatch ? idMatch[1].trim() : '';
      const arxivId = idContent.split('/').pop() || '';

      // Extract authors
      const authors: string[] = [];
      const authorRegex = /<author>[\s\S]*?<name>([^<]+)<\/name>[\s\S]*?<\/author>/gi;
      let authorMatch;
      
      while ((authorMatch = authorRegex.exec(entryXml)) !== null) {
        if (authorMatch[1] && authorMatch[1].trim()) {
          authors.push(authorMatch[1].trim());
        }
      }

      // Ensure we have at least one author
      if (authors.length === 0) {
        authors.push('Unknown Author');
      }

      // Validate required fields
      if (!title) {
        throw new Error('Missing title in search entry');
      }
      if (!abstract) {
        throw new Error('Missing abstract in search entry');
      }
      if (!arxivId) {
        throw new Error('Missing arXiv ID in search entry');
      }

      // Extract categories
      const categories: string[] = [];
      const categoryRegex = /<category[^>]*term="([^"]*)"/gi;
      let categoryMatch;
      while ((categoryMatch = categoryRegex.exec(entryXml)) !== null) {
        if (categoryMatch[1]) {
          categories.push(categoryMatch[1]);
        }
      }

      return {
        arxiv_id: arxivId,
        title,
        authors,
        abstract,
        published_date: published,
        pdf_url: `https://arxiv.org/pdf/${arxivId}.pdf`,
        categories: categories.length > 0 ? categories : ['cs.CV']
      };
    } catch (error: any) {
      throw new Error(`Failed to parse search entry: ${error.message}`);
    }
  }

  private isRelevantToGaussianSplatting(paper: ArxivPaper): boolean {
    const content = `${paper.title} ${paper.abstract}`.toLowerCase();
    const primaryKeywords = ['gaussian splatting', '3dgs', 'gaussian splat'];
    const secondaryKeywords = ['radiance field', 'novel view synthesis', '3d reconstruction', 'neural rendering'];
    
    const isRelevant = primaryKeywords.some(keyword => content.includes(keyword)) ||
                      secondaryKeywords.some(keyword => content.includes(keyword));
    
    if (!isRelevant) {
      console.log(`   Filtered out irrelevant paper: ${paper.title.substring(0, 60)}...`);
    }
    
    return isRelevant;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
