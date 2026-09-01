import { describe, it, expect } from 'vitest';
import { cosineSimilarity } from '../prediction';

describe('Prediction Engine - Vector Cosine Similarity', () => {
  it('should return 1 for identical vectors', () => {
    const vec = [1, 2, 3, 4, 5];
    expect(cosineSimilarity(vec, vec)).toBe(1);
  });

  it('should return 0 for orthogonal vectors', () => {
    const vecA = [1, 0];
    const vecB = [0, 1];
    expect(cosineSimilarity(vecA, vecB)).toBe(0);
  });

  it('should compute high similarity for aligned behavioral deviations', () => {
    const burnoutTarget = [-2.0, 2.5, 2.8, -0.8, 0.6];
    const observedTolga = [-1.8, 2.2, 3.0, -0.5, 0.4];
    const similarity = cosineSimilarity(observedTolga, burnoutTarget);
    expect(similarity).toBeGreaterThan(0.95);
  });
});
