export const dreamCategories = [
  { id: 'tech', label: 'Tech' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'finance', label: 'Finance' },
  { id: 'design', label: 'Design' },
  { id: 'healthcare', label: 'Healthcare' },
  { id: 'self-development', label: 'Self-Development' },
  { id: 'popular', label: 'Popular' },
];

export const popularDreams = [
  // Popular dreams
  {
    id: 'guitar',
    title: 'Learn to play guitar and perform at an open mic night',
    category: 'popular',
  },
  {
    id: 'marathon',
    title: 'Run a half marathon in under 2 hours',
    category: 'popular',
  },
  {
    id: 'cooking',
    title: 'Master cooking and host dinner parties',
    category: 'popular',
  },
  {
    id: 'photography',
    title: 'Learn photography and create a stunning portfolio',
    category: 'popular',
  },
  {
    id: 'fitness',
    title: 'Get in the best shape of my life',
    category: 'popular',
  },
  
  // Tech dreams
  {
    id: 'app',
    title: 'Build and launch my first mobile app',
    category: 'tech',
  },
  {
    id: 'coding',
    title: 'Learn to code and switch to a tech career',
    category: 'tech',
  },
  {
    id: 'ai',
    title: 'Master AI and machine learning fundamentals',
    category: 'tech',
  },
  {
    id: 'website',
    title: 'Create a professional website from scratch',
    category: 'tech',
  },
  {
    id: 'blockchain',
    title: 'Understand blockchain and cryptocurrency',
    category: 'tech',
  },
  
  // Finance dreams
  {
    id: 'business',
    title: 'Start a side business and make $1000/month',
    category: 'finance',
  },
  {
    id: 'investing',
    title: 'Learn investing and build a portfolio',
    category: 'finance',
  },
  {
    id: 'debt',
    title: 'Pay off all my debt and become debt-free',
    category: 'finance',
  },
  {
    id: 'emergency',
    title: 'Build a 6-month emergency fund',
    category: 'finance',
  },
  {
    id: 'property',
    title: 'Save for and buy my first property',
    category: 'finance',
  },
  
  // Design dreams
  {
    id: 'graphic',
    title: 'Master graphic design and create stunning visuals',
    category: 'design',
  },
  {
    id: 'ux',
    title: 'Learn UX/UI design and land a design job',
    category: 'design',
  },
  {
    id: 'illustration',
    title: 'Develop my illustration skills and style',
    category: 'design',
  },
  {
    id: 'branding',
    title: 'Create a complete brand identity system',
    category: 'design',
  },
  {
    id: 'portfolio',
    title: 'Build a professional design portfolio',
    category: 'design',
  },
  
  // Self-development dreams
  {
    id: 'spanish',
    title: 'Learn Spanish fluently for travel',
    category: 'self-development',
  },
  {
    id: 'meditation',
    title: 'Establish a daily meditation practice',
    category: 'self-development',
  },
  {
    id: 'reading',
    title: 'Read 50 books this year',
    category: 'self-development',
  },
  {
    id: 'confidence',
    title: 'Build unshakeable self-confidence',
    category: 'self-development',
  },
  {
    id: 'speaking',
    title: 'Overcome fear of public speaking',
    category: 'self-development',
  },
  
  // Marketing dreams
  {
    id: 'social',
    title: 'Build a strong social media presence',
    category: 'marketing',
  },
  {
    id: 'content',
    title: 'Create viral content and grow my audience',
    category: 'marketing',
  },
  {
    id: 'brand',
    title: 'Launch and market my personal brand',
    category: 'marketing',
  },
  {
    id: 'newsletter',
    title: 'Start a successful email newsletter',
    category: 'marketing',
  },
  {
    id: 'influencer',
    title: 'Become an influencer in my niche',
    category: 'marketing',
  },
  
  // Healthcare dreams
  {
    id: 'nutrition',
    title: 'Master nutrition and transform my health',
    category: 'healthcare',
  },
  {
    id: 'sleep',
    title: 'Improve my sleep quality and energy levels',
    category: 'healthcare',
  },
  {
    id: 'yoga',
    title: 'Become proficient in yoga and mindfulness',
    category: 'healthcare',
  },
  {
    id: 'mental',
    title: 'Improve my mental health and wellbeing',
    category: 'healthcare',
  },
  {
    id: 'habits',
    title: 'Build healthy daily habits that stick',
    category: 'healthcare',
  },
];

export const dayOptions = [
  { id: '30', label: '30 days' },
  { id: '60', label: '60 days' },
  { id: '90', label: '90 days' },
];

export const getStartDateOptions = () => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(today.getDate() + 2);

  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  const getDayName = (date: Date) => date.toLocaleDateString('en-US', { weekday: 'long' });

  return [
    { id: formatDate(today), label: 'Today' },
    { id: formatDate(tomorrow), label: 'Tomorrow' },
    { id: formatDate(dayAfterTomorrow), label: getDayName(dayAfterTomorrow) },
  ];
};

export const formatDateDisplay = (dateString: string) => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();
    
    return `${weekday} ${day} ${month} ${year}`;
  } catch {
    return dateString;
  }
};

export const arisAvatar = `<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<!-- Uploaded to: SVG Repo, www.svgrepo.com, Transformed by: SVG Repo Mixer Tools -->
<svg width="800px" height="800px" viewBox="0 0 64 64" id="wizard" xmlns="http://www.w3.org/2000/svg" fill="#000000">
<g id="SVGRepo_bgCarrier" stroke-width="0"/>
<g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"/>
<g id="SVGRepo_iconCarrier">
<title>wizard</title>
<circle cx="33" cy="23" r="23" style="fill:#D1E9F1"/>
<line x1="7" y1="17" x2="7" y2="19" style="fill:none;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<line x1="7" y1="23" x2="7" y2="25" style="fill:none;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<path d="M21.778,47H47.222A8.778,8.778,0,0,1,56,55.778V61a0,0,0,0,1,0,0H13a0,0,0,0,1,0,0V55.778A8.778,8.778,0,0,1,21.778,47Z" style="fill:#0F2A3F;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<polygon points="32 61 28 61 34 49 38 49 32 61" style="fill:#ffffff;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<path d="M59,39H11v4.236A5.763,5.763,0,0,0,16.764,49L34,55l19.236-6A5.763,5.763,0,0,0,59,43.236Z" style="fill:#0F2A3F;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<line x1="3" y1="21" x2="5" y2="21" style="fill:none;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<line x1="9" y1="21" x2="11" y2="21" style="fill:none;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<circle cx="55.5" cy="6.5" r="2.5" style="fill:none;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<circle cx="13.984" cy="6.603" r="1.069" style="fill:#091A2B"/>
<ellipse cx="35" cy="39" rx="24" ry="6" style="fill:#091A2B;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<circle cx="5.984" cy="30.603" r="1.069" style="fill:#091A2B"/>
<path d="M48,13V10.143A6.143,6.143,0,0,0,41.857,4H27.143A6.143,6.143,0,0,0,21,10.143V13" style="fill:#0F2A3F;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<rect x="20" y="17.81" width="29" height="14.19" style="fill:#ffe8dc;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<path d="M41.972,13H48a4,4,0,0,1,4,4h0a4,4,0,0,1-4,4H21a4,4,0,0,1-4-4h0a4,4,0,0,1,4-4H37" style="fill:#ffffff;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<circle cx="39.5" cy="25.5" r="1.136" style="fill:#091A2B"/>
<circle cx="29.5" cy="25.5" r="1.136" style="fill:#091A2B"/>
<path d="M43.875,32a6.472,6.472,0,0,0-5.219-2.2A5.2,5.2,0,0,0,35,31.974,5.2,5.2,0,0,0,31.344,29.8,6.472,6.472,0,0,0,26.125,32H20v4.5a14.5,14.5,0,0,0,29,0V32Z" style="fill:#ffffff;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<line x1="33" y1="36" x2="37" y2="36" style="fill:none;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
<rect x="32" y="10" width="5" height="5" transform="translate(1.266 28.056) rotate(-45)" style="fill:#75BDD5;stroke:#091A2B;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px"/>
</g>
</svg>`;