export type RecommendationType = 'blog' | 'tweet' | 'music' | 'art';

export interface DailyRecommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  author?: string;
  link?: string;
  imageUrl?: string; // For art or cover art
}

export const MOCK_RECOMMENDATIONS: DailyRecommendation[] = [
  {
    id: '1',
    type: 'art',
    title: 'Starry Night',
    description: 'A masterpiece of post-impressionist painting.',
    author: 'Vincent van Gogh',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1200px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
  },
  {
    id: '2',
    type: 'music',
    title: 'Clair de Lune',
    description: 'A soothing classical piece for your morning.',
    author: 'Claude Debussy',
    link: 'https://open.spotify.com/track/6nfB2Y0qB0eR4XU9Q2WJ6p',
  },
  {
    id: '3',
    type: 'blog',
    title: 'The Art of Slow Living',
    description: 'Why doing less can mean achieving more in the long run.',
    author: 'Mindful Daily',
    link: 'https://example.com/slow-living',
  },
  {
    id: '4',
    type: 'tweet',
    title: 'Daily Wisdom',
    description: 'Success is not final, failure is not fatal: it is the courage to continue that counts.',
    author: 'Winston Churchill',
  },
];

export const getDailyRecommendation = (): DailyRecommendation => {
  // Rotate based on day of year to ensure consistency for the day
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
  const index = dayOfYear % MOCK_RECOMMENDATIONS.length;
  return MOCK_RECOMMENDATIONS[index];
};
