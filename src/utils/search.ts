import { SearchRequest, SearchResult, SearchFilters, Card } from '../types/api';

export class SearchEngine {
  /**
   * Search cards within a board by text query and filters
   */
  static async searchCards(
    boardId: string,
    searchRequest: SearchRequest
  ): Promise<SearchResult> {
    const { find } = await import('./mockDatabase');
    const { CARDS_COLLECTION, LISTS_COLLECTION } = await import('./constants');

    // Get all lists for the board
    const lists = await find(LISTS_COLLECTION, { boardId, archived: false });
    const listIds = lists.map(list => list.id);

    // Get all cards in the board
    let cards = await find(CARDS_COLLECTION, { 
      listId: { $in: listIds },
      archived: false
    });

    // Apply text search
    if (searchRequest.query) {
      cards = this.applyTextSearch(cards, searchRequest.query);
    }

    // Apply filters
    if (searchRequest.filters) {
      cards = this.applyFilters(cards, searchRequest.filters);
    }

    // Sort by relevance (text matches first, then by creation date)
    cards = this.sortByRelevance(cards, searchRequest.query);

    // Apply pagination
    const { page = 1, limit = 20 } = searchRequest.pagination || {};
    const startIndex = (page - 1) * limit;
    const paginatedCards = cards.slice(startIndex, startIndex + limit);

    return {
      cards: paginatedCards,
      total: cards.length
    };
  }

  /**
   * Apply text search across card title, description, and labels
   */
  private static applyTextSearch(cards: Card[], query: string): Card[] {
    const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
    
    return cards.filter(card => {
      const searchableText = [
        card.title,
        card.description || '',
        ...card.labels.map(label => label.name),
        ...card.assignedTo // Assuming these are user names or emails
      ].join(' ').toLowerCase();

      return searchTerms.every(term => searchableText.includes(term));
    });
  }

  /**
   * Apply advanced filters to cards
   */
  private static applyFilters(cards: Card[], filters: SearchFilters): Card[] {
    let filteredCards = cards;

    // Filter by labels
    if (filters.labels && filters.labels.length > 0) {
      filteredCards = filteredCards.filter(card =>
        filters.labels!.some(labelId =>
          card.labels.some(label => label.id === labelId || label.name === labelId)
        )
      );
    }

    // Filter by assignees
    if (filters.assignees && filters.assignees.length > 0) {
      filteredCards = filteredCards.filter(card =>
        filters.assignees!.some(assigneeId =>
          card.assignedTo.includes(assigneeId)
        )
      );
    }

    // Filter by due date range
    if (filters.dueDate) {
      filteredCards = filteredCards.filter(card => {
        if (!card.dueDate) return false;
        
        const cardDueDate = new Date(card.dueDate);
        const fromDate = filters.dueDate!.from ? new Date(filters.dueDate!.from) : null;
        const toDate = filters.dueDate!.to ? new Date(filters.dueDate!.to) : null;

        if (fromDate && cardDueDate < fromDate) return false;
        if (toDate && cardDueDate > toDate) return false;
        
        return true;
      });
    }

    // Filter by priority
    if (filters.priority && filters.priority.length > 0) {
      filteredCards = filteredCards.filter(card =>
        filters.priority!.includes(card.priority)
      );
    }

    // Filter by archived status
    if (filters.archived !== undefined) {
      filteredCards = filteredCards.filter(card =>
        card.archived === filters.archived
      );
    }

    return filteredCards;
  }

  /**
   * Sort cards by search relevance
   */
  private static sortByRelevance(cards: Card[], query?: string): Card[] {
    if (!query) {
      // Sort by creation date (newest first) when no query
      return cards.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);

    return cards.sort((a, b) => {
      const scoreA = this.calculateRelevanceScore(a, searchTerms);
      const scoreB = this.calculateRelevanceScore(b, searchTerms);
      
      if (scoreA !== scoreB) {
        return scoreB - scoreA; // Higher score first
      }
      
      // If same relevance, sort by creation date
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  /**
   * Calculate relevance score for a card based on search terms
   */
  private static calculateRelevanceScore(card: Card, searchTerms: string[]): number {
    let score = 0;
    const title = card.title.toLowerCase();
    const description = (card.description || '').toLowerCase();
    const labels = card.labels.map(label => label.name.toLowerCase());

    searchTerms.forEach(term => {
      // Title matches are worth more
      if (title.includes(term)) {
        score += title.startsWith(term) ? 10 : 5; // Prefix matches worth more
      }
      
      // Description matches
      if (description.includes(term)) {
        score += 2;
      }
      
      // Label matches
      labels.forEach(label => {
        if (label.includes(term)) {
          score += label === term ? 4 : 2; // Exact match worth more
        }
      });
    });

    return score;
  }

  /**
   * Get search suggestions based on partial query
   */
  static async getSearchSuggestions(
    boardId: string,
    partialQuery: string,
    limit = 5
  ): Promise<string[]> {
    const { find } = await import('./mockDatabase');
    const { CARDS_COLLECTION, LISTS_COLLECTION } = await import('./constants');

    // Get all lists for the board
    const lists = await find(LISTS_COLLECTION, { boardId, archived: false });
    const listIds = lists.map(list => list.id);

    // Get all cards in the board
    const cards = await find(CARDS_COLLECTION, { 
      listId: { $in: listIds },
      archived: false
    });

    const suggestions = new Set<string>();
    const query = partialQuery.toLowerCase();

    // Extract suggestions from card titles
    cards.forEach(card => {
      const words = card.title.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.startsWith(query) && word.length > query.length) {
          suggestions.add(word);
        }
      });
    });

    // Extract suggestions from labels
    cards.forEach(card => {
      card.labels.forEach(label => {
        const labelName = label.name.toLowerCase();
        if (labelName.startsWith(query) && labelName.length > query.length) {
          suggestions.add(labelName);
        }
      });
    });

    return Array.from(suggestions).slice(0, limit);
  }

  /**
   * Get popular search terms for a board
   */
  static async getPopularSearchTerms(boardId: string, limit = 10): Promise<string[]> {
    const { find } = await import('./mockDatabase');
    const { CARDS_COLLECTION, LISTS_COLLECTION } = await import('./constants');

    // Get all lists for the board
    const lists = await find(LISTS_COLLECTION, { boardId, archived: false });
    const listIds = lists.map(list => list.id);

    // Get all cards in the board
    const cards = await find(CARDS_COLLECTION, { 
      listId: { $in: listIds },
      archived: false
    });

    const termFrequency = new Map<string, number>();

    // Count word frequency in titles and descriptions
    cards.forEach(card => {
      const text = `${card.title} ${card.description || ''}`.toLowerCase();
      const words = text.match(/\b\w{3,}\b/g) || []; // Words with 3+ characters
      
      words.forEach(word => {
        termFrequency.set(word, (termFrequency.get(word) || 0) + 1);
      });
    });

    // Count label frequency
    cards.forEach(card => {
      card.labels.forEach(label => {
        const labelName = label.name.toLowerCase();
        termFrequency.set(labelName, (termFrequency.get(labelName) || 0) + 2); // Labels weighted higher
      });
    });

    // Sort by frequency and return top terms
    return Array.from(termFrequency.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([term]) => term);
  }
}
