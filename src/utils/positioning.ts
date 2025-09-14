// Stable positioning system for lists and cards
export class PositionManager {
  private static readonly POSITION_GAP = 1000;
  private static readonly MIN_POSITION = 1;
  private static readonly REBALANCE_THRESHOLD = 0.001;

  /**
   * Calculate position for inserting item between two positions
   */
  static calculatePosition(previousPosition?: number, nextPosition?: number): number {
    // First item
    if (!previousPosition && !nextPosition) {
      return this.POSITION_GAP;
    }
    
    // Insert at beginning
    if (!previousPosition) {
      return Math.max(nextPosition! / 2, this.MIN_POSITION);
    }
    
    // Insert at end
    if (!nextPosition) {
      return previousPosition + this.POSITION_GAP;
    }
    
    // Insert between two items
    const midpoint = (previousPosition + nextPosition) / 2;
    
    // Check if we need rebalancing
    if (nextPosition - previousPosition < this.REBALANCE_THRESHOLD) {
      throw new Error('REBALANCE_REQUIRED');
    }
    
    return midpoint;
  }

  /**
   * Generate positions for bulk operations
   */
  static generateBulkPositions(count: number, startPosition = this.POSITION_GAP): number[] {
    const positions: number[] = [];
    for (let i = 0; i < count; i++) {
      positions.push(startPosition + (i * this.POSITION_GAP));
    }
    return positions;
  }

  /**
   * Rebalance positions when they get too close
   */
  static rebalancePositions(items: { id: string; position: number }[]): { id: string; position: number }[] {
    const sortedItems = [...items].sort((a, b) => a.position - b.position);
    const rebalanced: { id: string; position: number }[] = [];
    
    sortedItems.forEach((item, index) => {
      rebalanced.push({
        id: item.id,
        position: this.POSITION_GAP * (index + 1)
      });
    });
    
    return rebalanced;
  }

  /**
   * Update positions when moving item to new position
   */
  static updatePositionsForMove(
    items: { id: string; position: number }[],
    movedItemId: string,
    targetPosition: number
  ): { id: string; position: number }[] {
    const updates: { id: string; position: number }[] = [];
    const movedItem = items.find(item => item.id === movedItemId);
    
    if (!movedItem) {
      throw new Error('Item not found');
    }

    const otherItems = items.filter(item => item.id !== movedItemId);
    const sortedOthers = otherItems.sort((a, b) => a.position - b.position);

    // Find insertion point
    let insertIndex = 0;
    for (let i = 0; i < sortedOthers.length; i++) {
      if (sortedOthers[i].position < targetPosition) {
        insertIndex = i + 1;
      } else {
        break;
      }
    }

    // Calculate new position
    const prevItem = sortedOthers[insertIndex - 1];
    const nextItem = sortedOthers[insertIndex];
    
    try {
      const newPosition = this.calculatePosition(
        prevItem?.position,
        nextItem?.position
      );
      
      updates.push({ id: movedItemId, position: newPosition });
    } catch (error) {
      // Need rebalancing
      const allItems = [...otherItems, { ...movedItem, position: targetPosition }];
      const rebalanced = this.rebalancePositions(allItems);
      updates.push(...rebalanced);
    }

    return updates;
  }
}

// Position validation utilities
export class PositionValidator {
  static validatePosition(position: number): boolean {
    return typeof position === 'number' && 
           position >= PositionManager['MIN_POSITION'] && 
           isFinite(position);
  }

  static validatePositionOrder(items: { position: number }[]): boolean {
    for (let i = 1; i < items.length; i++) {
      if (items[i].position <= items[i - 1].position) {
        return false;
      }
    }
    return true;
  }

  static detectRebalanceNeeded(items: { position: number }[]): boolean {
    const sorted = [...items].sort((a, b) => a.position - b.position);
    
    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i].position - sorted[i - 1].position;
      if (gap < PositionManager['REBALANCE_THRESHOLD']) {
        return true;
      }
    }
    
    return false;
  }
}
