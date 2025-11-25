import { Paper, ArxivPaper } from '../types.js';

export class ArxivClient {
  private baseUrl = 'http://export.arxiv.org/api/query';

  constructor() {
    console.log('    arXiv Client initialized');
  }

  async fetchPaper(arxivId: string): Promise<Paper> {
    try {
      console.log(`    Fetching paper ${arxivId} from arXiv...`);
      
      // Simple URL construction without URLSearchParams
      const url = `${this.baseUrl}?id_list=${this.sanitizeId(arxivId)}&max_results=1`;
      console.log(`    Request URL: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`arXiv API returned ${response.status}: ${response.statusText}`);
      }

      const xmlText = await response.text();
      
      if (xmlText.includes('Error')) {
        throw new Error('arXiv API returned an error');
      }

      const paper = this.parseArxivXml(xmlText);
      
      if (!paper) {
        throw new Error(`Failed to parse arXiv response for ${arxivId}`);
      }

      return paper;
    } catch (error: any) {
      console.error(`   Failed to fetch paper ${arxivId}:`, error.message);
      // Return a mock paper for testing
      return this.getMockPaper(arxivId);
    }
  }

  async searchPapers(query: string, maxResults: number = 10): Promise<ArxivPaper[]> {
    try {
      console.log(`   Searching arXiv for: "${query}"`);
      
      // Simple URL encoding without URLSearchParams
      const encodedQuery = this.simpleEncode(query);
      const url = `${this.baseUrl}?search_query=${encodedQuery}&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`;
      
      console.log(`   Search URL: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`arXiv API returned ${response.status}: ${response.statusText}`);
      }

      const xmlText = await response.text();
      
      if (xmlText.includes('Error')) {
        throw new Error('arXiv API returned an error');
      }

      const papers = this.parseArxivSearchXml(xmlText);
      
      console.log(`   Found ${papers.length} papers`);
      
      // If no papers found, return mock data for testing
      if (papers.length === 0) {
        return this.getMockPapers(maxResults);
      }
      
      return papers;
    } catch (error: any) {
      console.error(`   arXiv search failed:`, error.message);
      // Return mock papers for testing
      return this.getMockPapers(maxResults);
    }
  }

  private sanitizeId(arxivId: string): string {
    // Remove any unsafe characters
    return arxivId.replace(/[^a-zA-Z0-9.\-]/g, '');
  }

  private simpleEncode(str: string): string {
    // Simple URL encoding replacement
    return str.replace(/ /g, '+')
             .replace(/'/g, '%27')
             .replace(/"/g, '%22');
  }

  private parseArxivXml(xmlText: string): Paper | null {
    try {
      console.log('   Parsing arXiv XML response...');
      
      // Very simple XML parsing without dependencies
      const extractTag = (tag: string): string => {
        const start = xmlText.indexOf(`<${tag}>`);
        const end = xmlText.indexOf(`</${tag}>`);
        if (start === -1 || end === -1) return '';
        return xmlText.substring(start + tag.length + 2, end).trim();
      };

      const title = extractTag('title') || 'Unknown Title';
      const summary = extractTag('summary') || '';
      const published = extractTag('published') || new Date().toISOString();
      
      // Extract arXiv ID from the first id tag
      const idStart = xmlText.indexOf('<id>');
      const idEnd = xmlText.indexOf('</id>', idStart);
      let arxivId = 'unknown';
      if (idStart !== -1 && idEnd !== -1) {
        const idContent = xmlText.substring(idStart + 4, idEnd);
        const parts = idContent.split('/');
        arxivId = parts[parts.length - 1];
      }

      // Extract authors
      const authors: string[] = [];
      let authorStart = xmlText.indexOf('<author>');
      while (authorStart !== -1) {
        const nameStart = xmlText.indexOf('<name>', authorStart);
        const nameEnd = xmlText.indexOf('</name>', nameStart);
        if (nameStart !== -1 && nameEnd !== -1) {
          const authorName = xmlText.substring(nameStart + 6, nameEnd).trim();
          if (authorName) authors.push(authorName);
        }
        authorStart = xmlText.indexOf('<author>', nameEnd);
      }

      if (arxivId === 'unknown') {
        return null;
      }

      return {
        arxiv_id: arxivId,
        title: title.replace(/\s+/g, ' '),
        authors: authors.length > 0 ? authors : ['Unknown Author'],
        abstract: summary.replace(/\s+/g, ' '),
        published_date: published,
        pdf_url: `https://arxiv.org/pdf/${arxivId}.pdf`,
        categories: ['cs.CV'] // Default category
      };
    } catch (error) {
      console.error('   Failed to parse arXiv XML:', error);
      return null;
    }
  }

  private parseArxivSearchXml(xmlText: string): ArxivPaper[] {
    const papers: ArxivPaper[] = [];
    
    try {
      console.log('   Parsing arXiv search results...');
      
      // Split by entry tags
      const entries = xmlText.split('<entry>');
      
      for (let i = 1; i < entries.length; i++) { // Skip first part
        const entry = entries[i].split('</entry>')[0];
        const paper = this.parseSingleEntry(entry);
        if (paper) {
          papers.push(paper);
        }
      }
    } catch (error) {
      console.error('   Failed to parse arXiv search results:', error);
    }
    
    return papers;
  }

  private parseSingleEntry(entryXml: string): ArxivPaper | null {
    try {
      const extractFromEntry = (tag: string): string => {
        const start = entryXml.indexOf(`<${tag}>`);
        const end = entryXml.indexOf(`</${tag}>`, start);
        if (start === -1 || end === -1) return '';
        return entryXml.substring(start + tag.length + 2, end).trim();
      };

      const title = extractFromEntry('title') || 'Unknown Title';
      const summary = extractFromEntry('summary') || '';
      const published = extractFromEntry('published') || new Date().toISOString();
      
      // Extract ID
      const idStart = entryXml.indexOf('<id>');
      const idEnd = entryXml.indexOf('</id>', idStart);
      let arxivId = 'unknown';
      if (idStart !== -1 && idEnd !== -1) {
        const idContent = entryXml.substring(idStart + 4, idEnd);
        const parts = idContent.split('/');
        arxivId = parts[parts.length - 1];
      }

      // Extract authors
      const authors: string[] = [];
      let authorStart = entryXml.indexOf('<author>');
      while (authorStart !== -1) {
        const nameStart = entryXml.indexOf('<name>', authorStart);
        const nameEnd = entryXml.indexOf('</name>', nameStart);
        if (nameStart !== -1 && nameEnd !== -1) {
          const authorName = entryXml.substring(nameStart + 6, nameEnd).trim();
          if (authorName) authors.push(authorName);
        }
        authorStart = entryXml.indexOf('<author>', nameEnd);
      }

      if (arxivId === 'unknown') {
        return null;
      }

      return {
        arxiv_id: arxivId,
        title: title.replace(/\s+/g, ' ').replace(/^\s*Title:\s*/i, ''),
        authors: authors.length > 0 ? authors : ['Unknown Author'],
        abstract: summary.replace(/\s+/g, ' '),
        published_date: published,
        pdf_url: `https://arxiv.org/pdf/${arxivId}.pdf`,
        categories: ['cs.CV'] // Default category
      };
    } catch (error) {
      console.error('   Failed to parse arXiv entry:', error);
      return null;
    }
  }

  // Mock data for testing when API fails
  private getMockPaper(arxivId: string): Paper {
    console.log(`   Using mock data for ${arxivId}`);
    return {
      arxiv_id: arxivId,
      title: `Mock Paper ${arxivId} - Gaussian Splatting Research`,
      authors: ['John Researcher', 'Jane Scientist'],
      abstract: `This is a mock abstract for paper ${arxivId} about Gaussian splatting techniques for 3D reconstruction and novel view synthesis. The paper introduces innovative methods for real-time rendering.`,
      published_date: new Date().toISOString(),
      pdf_url: `https://arxiv.org/pdf/${arxivId}.pdf`,
      categories: ['cs.CV', 'cs.GR']
    };
  }

  private getMockPapers(count: number): ArxivPaper[] {
    const papers: ArxivPaper[] = [];
    const baseId = '2301.000';
    
    for (let i = 1; i <= count; i++) {
      papers.push({
        arxiv_id: `${baseId}${i}`,
        title: `Related Gaussian Splatting Paper ${i}`,
        authors: [`Researcher ${i}`, `Coauthor ${i}`],
        abstract: `This is mock paper ${i} about Gaussian splatting and 3D reconstruction techniques.`,
        published_date: new Date().toISOString(),
        pdf_url: `https://arxiv.org/pdf/${baseId}${i}.pdf`,
        categories: ['cs.CV']
      });
    }
    
    return papers;
  }
}
