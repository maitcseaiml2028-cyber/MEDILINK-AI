// Calculate Euclidean distance between two vectors of numbers
export function euclideanDistance(desc1: number[], desc2: number[]): number {
  if (desc1.length !== desc2.length) {
    throw new Error("Descriptors must be of the same length.");
  }
  
  let sum = 0;
  for (let i = 0; i < desc1.length; i++) {
    const diff = desc1[i] - desc2[i];
    sum += diff * diff;
  }
  
  return Math.sqrt(sum);
}
