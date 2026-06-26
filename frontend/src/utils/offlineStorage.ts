import localforage from 'localforage';

export interface CachedRecommendation {
  id: string;
  farmId: string;
  timestamp: number;
  data: any; // The payload from the API
}

// Initialize the store
const fertilizerStore = localforage.createInstance({
  name: 'AgronavisDB',
  storeName: 'fertilizer_recommendations',
  description: 'Cache for fertilizer recommendations',
});

/**
 * Save a recommendation to the local cache.
 * Limits the history to 20 items per farm to save space.
 */
export const saveRecommendation = async (farmId: string, data: any): Promise<CachedRecommendation> => {
  const timestamp = Date.now();
  const id = `${farmId}_${timestamp}`;
  const newRec: CachedRecommendation = { id, farmId, timestamp, data };

  try {
    // Get existing history to prepend
    const existing = await getRecommendationHistory(farmId);
    
    // Add to the front
    const updatedHistory = [newRec, ...existing];
    
    // Limit to last 20 for this farm
    const limitedHistory = updatedHistory.slice(0, 20);
    
    await fertilizerStore.setItem(farmId, limitedHistory);
    return newRec;
  } catch (error) {
    console.error('Failed to save recommendation to IndexedDB:', error);
    throw error;
  }
};

/**
 * Retrieves the most recent recommendation for a given farm.
 */
export const getLatestRecommendation = async (farmId: string): Promise<CachedRecommendation | null> => {
  try {
    const history = await getRecommendationHistory(farmId);
    return history.length > 0 ? history[0] : null;
  } catch (error) {
    console.error('Failed to get latest recommendation from IndexedDB:', error);
    return null;
  }
};

/**
 * Retrieves all cached recommendations for a farm, newest first.
 */
export const getRecommendationHistory = async (farmId: string): Promise<CachedRecommendation[]> => {
  try {
    const history: CachedRecommendation[] | null = await fertilizerStore.getItem(farmId);
    return history || [];
  } catch (error) {
    console.error('Failed to get recommendation history from IndexedDB:', error);
    return [];
  }
};

/**
 * Deletes a specific recommendation from the cache for a farm.
 */
export const deleteRecommendation = async (farmId: string, id: string): Promise<void> => {
  try {
    const history = await getRecommendationHistory(farmId);
    const updatedHistory = history.filter(item => item.id !== id);
    await fertilizerStore.setItem(farmId, updatedHistory);
  } catch (error) {
    console.error('Failed to delete recommendation from IndexedDB:', error);
    throw error;
  }
};
