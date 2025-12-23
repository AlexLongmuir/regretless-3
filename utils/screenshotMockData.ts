import type { 
  DreamsSummaryPayload, 
  DreamsWithStatsPayload, 
  TodayPayload, 
  ProgressPayload, 
  DreamDetailPayload
} from '../contexts/dataCache';
import type { ActionOccurrenceStatus, DreamWithStats, Dream, Area, Action, ActionOccurrence, AcceptanceCriterion } from '../backend/database/types';

// Base date: January 1, 2026 (for reference, but calculations use real today)
// Note: Day calculations use new Date() which is the real current date
const BASE_DATE = new Date('2026-01-01');
const REAL_TODAY = new Date(); // Real current date used by components

// Helper to get date string relative to base date
const getRelativeDate = (daysOffset: number): string => {
  const date = new Date(BASE_DATE);
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
};

const NOW = BASE_DATE.getTime();
const TODAY_STR = getRelativeDate(0); // 2026-01-01
const YESTERDAY_STR = getRelativeDate(-1);
const TOMORROW_STR = getRelativeDate(1);

// --- MOCK DREAMS ---

const mockDreams: DreamWithStats[] = [
  {
    id: 'mock-dream-1',
    user_id: 'mock-user',
    title: 'Get in the best shape of my life in 90 days',
    description: 'Transform my health and fitness through consistent training and nutrition',
    start_date: getRelativeDate(-20), // Dec 12, 2025 (Day 21 of 90)
    end_date: getRelativeDate(69), // March 11, 2026 (90 days total inclusive)
    activated_at: getRelativeDate(-20),
    created_at: getRelativeDate(-20),
    updated_at: getRelativeDate(-1),
    current_streak: 12,
    total_areas: 4,
    total_actions: 8,
    completed_today: 0,
    completed_total: 25,
    image_url: 'https://images.unsplash.com/photo-1483721310020-03333e577078?w=800&q=80', // Fitness (Running woman equivalent)
  },
  {
    id: 'mock-dream-2',
    user_id: 'mock-user',
    title: 'Travel to 3 new continents in 2026',
    description: 'Explore new cultures and create unforgettable memories',
    start_date: getRelativeDate(0), // Jan 1, 2026 (Day 1 of 365)
    end_date: '2026-12-31', // Dec 31, 2026 (365 days inclusive)
    activated_at: getRelativeDate(0),
    created_at: getRelativeDate(0),
    updated_at: getRelativeDate(-1),
    current_streak: 0,
    total_areas: 3,
    total_actions: 9,
    completed_today: 0,
    completed_total: 0,
    image_url: 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=800&q=80', // Adventure/Hiking
  },
  {
    id: 'mock-dream-3',
    user_id: 'mock-user',
    title: 'Launch my side project in 60 days',
    description: 'Build and ship a product that solves a real problem',
    start_date: getRelativeDate(-39), // Nov 23, 2025 (Day 40 of 135)
    end_date: getRelativeDate(95), // April 6, 2026 (135 days inclusive)
    activated_at: getRelativeDate(-39),
    created_at: getRelativeDate(-39),
    updated_at: getRelativeDate(-1),
    current_streak: 18,
    total_areas: 3,
    total_actions: 12,
    completed_today: 1,
    completed_total: 45,
    image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80', // Project
  },
  {
    id: 'mock-dream-4',
    user_id: 'mock-user',
    title: 'Build a meaningful morning routine',
    description: 'Create a consistent morning practice that sets me up for success',
    start_date: getRelativeDate(-29), // Dec 3, 2025 (Day 30 of 60)
    end_date: '2026-01-31', // Jan 31, 2026 (60 days inclusive)
    activated_at: getRelativeDate(-29),
    created_at: getRelativeDate(-29),
    updated_at: getRelativeDate(-1),
    current_streak: 31,
    total_areas: 3,
    total_actions: 6,
    completed_today: 1,
    completed_total: 87,
    image_url: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=800&q=80', // Morning
  }
];

// --- MOCK TODAY ACTIONS ---

const mockOccurrences: any[] = [
  {
    id: 'mock-occ-1',
    action_id: 'mock-action-1',
    occurrence_no: 1,
    planned_due_on: TODAY_STR,
    due_on: TODAY_STR,
    defer_count: 0,
    action_title: 'Build your personalised high protein eating plan for the week',
    difficulty: 'easy',
    est_minutes: 20,
    area_title: 'Reset & Build Foundation',
    area_icon: '🏋️',
    dream_title: 'Get in the best shape of my life in 90 days',
    is_done: false,
    is_overdue: false,
    overdue_days: 0,
    // @ts-ignore: Inserting partial data for UI that might be needed by some components expecting extended types
    actions: {
      title: 'Build your personalised high protein eating plan for the week',
      difficulty: 'easy',
      est_minutes: 20,
      acceptance_intro: "Take a moment to plan meals that will fuel your body and support your fitness goals this week",
      acceptance_criteria: [
        { 
          title: 'Find 3 high-protein meals', 
          description: 'Select 3 recipes that fit your schedule. Aim for 30-40g protein per meal.' 
        },
        { 
          title: 'Pick one fallback meal', 
          description: 'Choose one quick meal you can prepare in under 15 minutes for busy days.' 
        },
        { 
          title: 'Set daily protein anchors', 
          description: 'Choose 2-3 quick protein snacks you can grab throughout the day.' 
        }
      ],
      acceptance_outro: "You're done when you have a clear, actionable plan for the week ahead",
      areas: {
        title: 'Reset & Build Foundation',
        icon: '🏋️',
        dreams: {
          title: 'Get in the best shape of my life in 90 days',
          image_url: 'https://images.unsplash.com/photo-1483721310020-03333e577078?w=800&q=80'
        }
      }
    }
  },
  {
    id: 'mock-occ-2',
    action_id: 'mock-action-2',
    occurrence_no: 1,
    planned_due_on: TODAY_STR,
    due_on: TODAY_STR,
    defer_count: 0,
    action_title: 'Pick a country to visit in South America this year',
    difficulty: 'easy',
    est_minutes: 20,
    area_title: 'Plan The Adventure',
    area_icon: '✈️',
    dream_title: 'Travel to 3 new continents in 2026',
    is_done: false,
    is_overdue: false,
    overdue_days: 0,
    // @ts-ignore
    actions: {
      title: 'Pick a country to visit in South America this year',
      difficulty: 'easy',
      est_minutes: 20,
      acceptance_criteria: [
        { title: 'Read 2-3 blogs comparing SA destinations', description: '' },
        { title: 'Shortlist 3-5 countries with costs/timings', description: '' },
        { title: 'Rank top 3 by value and seasonality', description: '' }
      ],
      areas: {
        title: 'Plan The Adventure',
        icon: '✈️',
        dreams: {
          title: 'Travel to 3 new continents in 2026',
          image_url: 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=800&q=80'
        }
      }
    }
  },
  {
    id: 'mock-occ-3',
    action_id: 'mock-action-3',
    occurrence_no: 1,
    planned_due_on: TODAY_STR,
    due_on: TODAY_STR,
    defer_count: 0,
    action_title: 'Do 3 micro-wins in 20 minutes',
    difficulty: 'easy',
    est_minutes: 20,
    area_title: 'Daily Momentum',
    area_icon: '⚡',
    dream_title: 'Launch my side project in 60 days',
    is_done: false,
    is_overdue: false,
    overdue_days: 0,
    // @ts-ignore
    actions: {
      title: 'Do 3 micro-wins in 20 minutes',
      difficulty: 'easy',
      est_minutes: 20,
      acceptance_criteria: [
        { 
          title: 'One tiny build task', 
          description: 'For example, fix one screen, write one function, or add one button.' 
        },
        { 
          title: 'One tiny growth task', 
          description: 'For example, post one update or message one person.' 
        },
        { 
          title: 'One tiny proof task', 
          description: 'Take a screenshot or photo of what changed today.' 
        }
      ],
      acceptance_outro: 'Proof note: "Fixed signup copy, posted update, saved screenshot. Streak lives."',
      areas: {
        title: 'Daily Momentum',
        icon: '⚡',
        dreams: {
          title: 'Launch my side project in 60 days',
          image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80'
        }
      }
    }
  }
];

// --- MOCK PROGRESS ---

const mockProgress: ProgressPayload = {
  fetchedAt: NOW,
  overallStreak: 12,
  weeklyProgress: {
    monday: 'active',
    tuesday: 'active',
    wednesday: 'active',
    thursday: 'active', // Ticked for today
    friday: 'future',
    saturday: 'future',
    sunday: 'future'
  },
  thisWeekStats: {
    actionsPlanned: 8,
    actionsDone: 4,
    actionsOverdue: 0
  },
  historyStats: {
    week: { actionsComplete: 4, activeDays: 4, actionsOverdue: 0 },
    month: { actionsComplete: 28, activeDays: 13, actionsOverdue: 1 },
    year: { actionsComplete: 152, activeDays: 46, actionsOverdue: 5 },
    allTime: { actionsComplete: 450, activeDays: 120, actionsOverdue: 12 }
  },
  progressPhotos: [
    { id: 'p1', uri: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80', timestamp: new Date(getRelativeDate(-1)), dream_id: 'mock-dream-1' },
    { id: 'p2', uri: 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=400&q=80', timestamp: new Date(getRelativeDate(-2)), dream_id: 'mock-dream-2' },
    { id: 'p3', uri: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&q=80', timestamp: new Date(getRelativeDate(-3)), dream_id: 'mock-dream-3' },
    { id: 'p4', uri: 'https://images.unsplash.com/photo-1511690656952-34342d5c2895?w=400&q=80', timestamp: new Date(getRelativeDate(-4)), dream_id: 'mock-dream-1' },
    { id: 'p5', uri: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80', timestamp: new Date(getRelativeDate(-5)), dream_id: 'mock-dream-4' },
    { id: 'p6', uri: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&q=80', timestamp: new Date(getRelativeDate(-6)), dream_id: 'mock-dream-1' },
    { id: 'p7', uri: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=400&q=80', timestamp: new Date(getRelativeDate(-7)), dream_id: 'mock-dream-3' },
    { id: 'p8', uri: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400&q=80', timestamp: new Date(getRelativeDate(-8)), dream_id: 'mock-dream-2' },
    { id: 'p9', uri: 'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=400&q=80', timestamp: new Date(getRelativeDate(-9)), dream_id: 'mock-dream-1' },
    { id: 'p10', uri: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=400&q=80', timestamp: new Date(getRelativeDate(-10)), dream_id: 'mock-dream-1' },
    { id: 'p11', uri: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80', timestamp: new Date(getRelativeDate(-11)), dream_id: 'mock-dream-4' },
    { id: 'p12', uri: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&q=80', timestamp: new Date(getRelativeDate(-12)), dream_id: 'mock-dream-2' },
    { id: 'p13', uri: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80', timestamp: new Date(getRelativeDate(-13)), dream_id: 'mock-dream-3' },
    { id: 'p14', uri: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=400&q=80', timestamp: new Date(getRelativeDate(-14)), dream_id: 'mock-dream-2' },
    { id: 'p15', uri: 'https://images.unsplash.com/photo-1508962914676-134849a727f0?w=400&q=80', timestamp: new Date(getRelativeDate(-15)), dream_id: 'mock-dream-1' },
  ]
};

// --- MOCK DREAM 1 DETAIL (Get in the best shape of my life) ---

// Area 2: Build Strength & Endurance Actions
const area2ActionsData = [
  {
    title: "Plan your strength routine for the next 2 weeks",
    difficulty: "medium",
    est_minutes: 30,
    criteria: [
      { title: "Select main lift/focus for each session", description: "" },
      { title: "Define reps, sets, or progression style", description: "" },
      { title: "Schedule recovery days or light sessions", description: "" }
    ]
  },
  {
    title: "Build your personalised high-protein eating plan for the week",
    difficulty: "easy",
    est_minutes: 20,
    intro: "Take a moment to plan meals that will fuel your body and support your fitness goals this week",
    criteria: [
      { 
        title: 'Find 3 high-protein meals', 
        description: 'Select 3 recipes that fit your schedule. Aim for 30-40g protein per meal.' 
      },
      { 
        title: 'Pick one fallback meal', 
        description: 'Choose one quick meal you can prepare in under 15 minutes for busy days.' 
      },
      { 
        title: 'Set daily protein anchors', 
        description: 'Identify 2-3 quick protein snacks (Greek yogurt, protein shake, hard-boiled eggs) you can grab throughout the day.' 
      }
    ],
    outro: "You're done when you have a clear, actionable plan for the week ahead"
  },
  {
    title: "Do your strength & conditioning circuit",
    difficulty: "hard",
    est_minutes: 45,
    criteria: [
      { title: "Complete circuit at established baseline", description: "" },
      { title: "Increase reps, time, or difficulty", description: "" },
      { title: "Save results to track progress", description: "" }
    ]
  },
  {
    title: "Mobility & Stretching Routine",
    criteria: [
      { title: "10 mins full body foam rolling.", description: "" },
      { title: "Hold deep squat stretch for 2 mins.", description: "" },
      { title: "Pigeon pose stretch (2 mins per side).", description: "" },
      { title: "Doorway pec stretch (1 min per side).", description: "" }
    ]
  },
  {
    title: "Core Stability Circuit",
    criteria: [
      { title: "Plank hold (3 x 60s).", description: "" },
      { title: "Dead bugs (3 x 12 reps).", description: "" },
      { title: "Bird-dogs (3 x 12 reps).", description: "" }
    ]
  },
  {
    title: "Progressive Overload Check-in",
    criteria: [
      { title: "Review last week's weights.", description: "" },
      { title: "Plan 2.5kg increase for major lifts.", description: "" },
      { title: "Adjust volume if needed.", description: "" }
    ]
  },
  {
    title: "Protein Intake Tracking",
    criteria: [
      { title: "Log all meals in tracker app.", description: "" },
      { title: "Ensure hitting daily protein goal.", description: "" },
      { title: "Review macro split.", description: "" }
    ]
  },
  {
    title: "Active Recovery Walk",
    criteria: [
      { title: "Walk for 45 minutes.", description: "" },
      { title: "Keep heart rate in Zone 1.", description: "" },
      { title: "Listen to a podcast or audiobook.", description: "" }
    ]
  },
  {
    title: "Sleep Quality Review",
    criteria: [
      { title: "Review sleep duration average.", description: "" },
      { title: "Check sleep consistency.", description: "" },
      { title: "Plan adjustments for better rest.", description: "" }
    ]
  },
  {
    title: "Hydration Goal Check",
    criteria: [
      { title: "Drink 3 liters of water daily.", description: "" },
      { title: "Track intake in app.", description: "" },
      { title: "Limit caffeine after 2pm.", description: "" }
    ]
  },
  {
    title: "Form Check Video Review",
    criteria: [
      { title: "Record squat set.", description: "" },
      { title: "Compare form to instructional video.", description: "" },
      { title: "Identify one cue to improve.", description: "" }
    ]
  },
  {
    title: "Weekly Strength Log Update",
    criteria: [
      { title: "Update spreadsheet with weekly maxes.", description: "" },
      { title: "Note any pain points.", description: "" },
      { title: "Celebrate PBs.", description: "" }
    ]
  }
];

// Create actions from data
const area2Actions: Action[] = area2ActionsData.map((data, index) => ({
  id: `mock-action-area-2-${index}`,
  user_id: 'mock-user',
  dream_id: 'mock-dream-1',
  area_id: 'area-2',
  title: data.title,
  difficulty: (data.difficulty as any) || (index % 2 === 0 ? 'hard' : 'medium'),
  est_minutes: data.est_minutes || (index === 0 ? 60 : 45),
  position: index + 1,
  is_active: true,
  created_at: getRelativeDate(0),
  updated_at: getRelativeDate(-1),
  acceptance_criteria: data.criteria,
  acceptance_intro: (data as any).intro,
  acceptance_outro: (data as any).outro
}));

// Create actions for other areas
const area1Action: Action = {
  id: 'mock-action-area-1', user_id: 'mock-user', dream_id: 'mock-dream-1', area_id: 'area-1',
  title: 'Reset Foundation Checklist', difficulty: 'medium', est_minutes: 30, position: 1, is_active: true,
  created_at: getRelativeDate(0), updated_at: getRelativeDate(-1), 
  acceptance_criteria: [
    { title: "Clear pantry of junk food.", description: "" },
    { title: "Buy healthy staples.", description: "" },
    { title: "Set up meal prep containers.", description: "" }
  ]
};

const area3Action: Action = {
  id: 'mock-action-area-3', user_id: 'mock-user', dream_id: 'mock-dream-1', area_id: 'area-3',
  title: 'Physique Check-in', difficulty: 'medium', est_minutes: 15, position: 1, is_active: true,
  created_at: getRelativeDate(0), updated_at: getRelativeDate(-1), 
  acceptance_criteria: [
    { title: "Take front photo.", description: "" },
    { title: "Take side photo.", description: "" },
    { title: "Take back photo.", description: "" },
    { title: "Measure waist circumference.", description: "" }
  ]
};

const area4Action: Action = {
  id: 'mock-action-area-4', user_id: 'mock-user', dream_id: 'mock-dream-1', area_id: 'area-4',
  title: 'Long Term Health Review', difficulty: 'easy', est_minutes: 20, position: 1, is_active: true,
  created_at: getRelativeDate(0), updated_at: getRelativeDate(-1), 
  acceptance_criteria: [
    { title: "Review family health history.", description: "" },
    { title: "Schedule annual checkup.", description: "" },
    { title: "Check vaccination status.", description: "" }
  ]
};

const mockDreamDetailActions: Action[] = [area1Action, ...area2Actions, area3Action, area4Action];

// Generate occurrences
// Area 1: 8/8
// Area 2: 1/12 
const generateOccurrences = (): ActionOccurrence[] => {
  const occurrences: ActionOccurrence[] = [];
  
  // Helper for Area 1
  for (let i = 0; i < 8; i++) {
    occurrences.push({
      id: `occ-area-1-${i}`, action_id: 'mock-action-area-1', occurrence_no: i + 1,
      planned_due_on: getRelativeDate(-10 + i), due_on: getRelativeDate(-10 + i),
      defer_count: 0, created_at: getRelativeDate(-20), updated_at: getRelativeDate(-1),
      completed_at: getRelativeDate(-10 + i)
    });
  }

  // Helper for Area 2
  area2Actions.forEach((action, index) => {
    // Top one (Index 0): Plan Routine -> Complete
    // Middle (Index 1): High Protein -> Incomplete (Today)
    // End (Index 2): Strength Circuit -> Incomplete (3rd Jan)
    
    const isComplete = index === 0;
    let dueOn = getRelativeDate(0);
    
    if (isComplete) {
      dueOn = getRelativeDate(-1);
    } else if (index === 2) {
      dueOn = getRelativeDate(2); // 3rd Jan (Base is 1st Jan)
    }
    
    occurrences.push({
      id: `occ-area-2-${index}`, action_id: action.id, occurrence_no: 1,
      planned_due_on: dueOn, 
      due_on: dueOn,
      defer_count: 0, created_at: getRelativeDate(-20), updated_at: getRelativeDate(-1),
      completed_at: isComplete ? getRelativeDate(-1) : undefined
    });
  });

  // Helper for Area 3 (10 items, 0 complete)
  for (let i = 0; i < 10; i++) {
    occurrences.push({
      id: `occ-area-3-${i}`, action_id: 'mock-action-area-3', occurrence_no: i + 1,
      planned_due_on: getRelativeDate(i), due_on: getRelativeDate(i),
      defer_count: 0, created_at: getRelativeDate(-20), updated_at: getRelativeDate(-1),
      completed_at: undefined
    });
  }

  // Helper for Area 4 (6 items, 0 complete)
  for (let i = 0; i < 6; i++) {
    occurrences.push({
      id: `occ-area-4-${i}`, action_id: 'mock-action-area-4', occurrence_no: i + 1,
      planned_due_on: getRelativeDate(i), due_on: getRelativeDate(i),
      defer_count: 0, created_at: getRelativeDate(-20), updated_at: getRelativeDate(-1),
      completed_at: undefined
    });
  }

  return occurrences;
};

const mockDreamDetailOccurrences = generateOccurrences();

const mockDreamDetail: DreamDetailPayload = {
  fetchedAt: NOW,
  dream: mockDreams[0], // Get in the best shape of my life
  areas: [
    {
      id: 'area-1', dream_id: 'mock-dream-1', title: 'Reset & Build Foundation', icon: '🏋️', position: 1, created_at: getRelativeDate(0), updated_at: getRelativeDate(0)
    },
    {
      id: 'area-2', dream_id: 'mock-dream-1', title: 'Build Strength & Endurance', icon: '💪', position: 2, created_at: getRelativeDate(0), updated_at: getRelativeDate(0)
    },
    {
      id: 'area-3', dream_id: 'mock-dream-1', title: 'Level Up Physique & Conditioning', icon: '🔥', position: 3, created_at: getRelativeDate(0), updated_at: getRelativeDate(0)
    },
    {
      id: 'area-4', dream_id: 'mock-dream-1', title: 'Peak & Maintain Long-Term Health', icon: '🌟', position: 4, created_at: getRelativeDate(0), updated_at: getRelativeDate(0)
    }
  ],
  actions: mockDreamDetailActions,
  occurrences: mockDreamDetailOccurrences
};


// --- MOCK DREAM 2 DETAIL (Travel to 3 new continents) ---

const dream2Areas: Area[] = [
  { id: 'area-2-1', dream_id: 'mock-dream-2', title: 'Plan The Adventure', icon: '🗺️', position: 1, created_at: getRelativeDate(0), updated_at: getRelativeDate(0) },
  { id: 'area-2-2', dream_id: 'mock-dream-2', title: 'Fund The Journey', icon: '💰', position: 2, created_at: getRelativeDate(0), updated_at: getRelativeDate(0) },
  { id: 'area-2-3', dream_id: 'mock-dream-2', title: 'Master The Logistics', icon: '🛂', position: 3, created_at: getRelativeDate(0), updated_at: getRelativeDate(0) }
];

const dream2ActionsData = [
  // Area 1: Plan The Adventure
  {
    area_id: 'area-2-1',
    title: "Deep Dive Research Session",
    difficulty: "medium",
    est_minutes: 45,
    intro: "Knowledge is the first step to adventure. Let's find out where you're really going.",
    criteria: [
      { title: "Select 3 continents", description: "Choose the three continents that excite you most this year." },
      { title: "Top 2 countries per continent", description: "Narrow down to 2 candidate countries for each continent based on safety and season." },
      { title: "Ballpark budget check", description: "Quickly check flight prices to ensure they fit within 20% of your budget." }
    ],
    outro: "Great start! Now you have a target to aim for."
  },
  {
    area_id: 'area-2-1',
    title: "Draft Your 2026 Itinerary",
    difficulty: "hard",
    est_minutes: 60,
    criteria: [
      { title: "Map out optimal travel windows (weather/price).", description: "" },
      { title: "Block out dates on your annual calendar.", description: "" },
      { title: "Check for conflicts with work or family events.", description: "" }
    ]
  },
  {
    area_id: 'area-2-1',
    title: "Reach out to travel buddies",
    difficulty: "easy",
    est_minutes: 15,
    criteria: [
      { title: "Message 3 friends who might join.", description: "" },
      { title: "Gauge interest and dates.", description: "" },
      { title: "Create a shared chat group.", description: "" }
    ]
  },
  // Area 2: Fund The Journey
  {
    area_id: 'area-2-2',
    title: "Open dedicated 'Travel 2026' account",
    difficulty: "easy",
    est_minutes: 20,
    criteria: [
      { title: "Research high-interest savings accounts.", description: "" },
      { title: "Open account online.", description: "" },
      { title: "Deposit initial $100 anchor.", description: "" }
    ]
  },
  {
    area_id: 'area-2-2',
    title: "Automate your savings",
    difficulty: "medium",
    est_minutes: 30,
    criteria: [
      { title: "Calculate weekly savings needed for goal.", description: "" },
      { title: "Set up auto-transfer for payday.", description: "" },
      { title: "Cancel one unused subscription to boost fund.", description: "" }
    ]
  },
  {
    area_id: 'area-2-2',
    title: "Travel Hacking Audit",
    difficulty: "medium",
    est_minutes: 45,
    criteria: [
      { title: "Check credit card points balance.", description: "" },
      { title: "Research flight redemption sweet spots.", description: "" },
      { title: "Apply for a new travel card if beneficial.", description: "" }
    ]
  },
  // Area 3: Master The Logistics
  {
    area_id: 'area-2-3',
    title: "Passport & Visa Audit",
    difficulty: "easy",
    est_minutes: 15,
    criteria: [
      { title: "Check passport expiry (must be >6 months from return).", description: "" },
      { title: "List visa requirements for top 3 countries.", description: "" },
      { title: "Book renewal appointment if needed.", description: "" }
    ]
  },
  {
    area_id: 'area-2-3',
    title: "Gear Check",
    difficulty: "medium",
    est_minutes: 30,
    criteria: [
      { title: "Inspect suitcase/backpack condition.", description: "" },
      { title: "List essential missing gear (adaptors, power bank).", description: "" },
      { title: "Sell old gear to fund new gear.", description: "" }
    ]
  },
  {
    area_id: 'area-2-3',
    title: "Health & Safety Prep",
    difficulty: "medium",
    est_minutes: 30,
    criteria: [
      { title: "Check required vaccinations.", description: "" },
      { title: "Research travel insurance options.", description: "" },
      { title: "Save local emergency numbers.", description: "" }
    ]
  }
];

const dream2Actions: Action[] = dream2ActionsData.map((data, index) => ({
  id: `mock-action-dream-2-${index}`,
  user_id: 'mock-user',
  dream_id: 'mock-dream-2',
  area_id: data.area_id,
  title: data.title,
  difficulty: data.difficulty as any,
  est_minutes: data.est_minutes,
  position: index + 1,
  is_active: true,
  created_at: getRelativeDate(0),
  updated_at: getRelativeDate(-1),
  acceptance_criteria: data.criteria,
  acceptance_intro: (data as any).intro,
  acceptance_outro: (data as any).outro
}));

// Dream 2 Occurrences: Just started today. 0 completed.
const dream2Occurrences: ActionOccurrence[] = dream2Actions.map((action, index) => ({
  id: `occ-dream-2-${index}`,
  action_id: action.id,
  occurrence_no: 1,
  planned_due_on: index === 0 ? getRelativeDate(0) : getRelativeDate(index + 1), // Staggered future dates
  due_on: index === 0 ? getRelativeDate(0) : getRelativeDate(index + 1),
  defer_count: 0,
  created_at: getRelativeDate(0),
  updated_at: getRelativeDate(0),
  completed_at: undefined // None completed yet
}));

const mockDream2Detail: DreamDetailPayload = {
  fetchedAt: NOW,
  dream: mockDreams[1],
  areas: dream2Areas,
  actions: dream2Actions,
  occurrences: dream2Occurrences
};


// --- MOCK DREAM 3 DETAIL (Launch Side Project) ---

const dream3Areas: Area[] = [
  { id: 'area-3-1', dream_id: 'mock-dream-3', title: 'Validate & Plan', icon: '🎯', position: 1, created_at: getRelativeDate(-39), updated_at: getRelativeDate(-1) },
  { id: 'area-3-2', dream_id: 'mock-dream-3', title: 'Build Core Product', icon: '🛠️', position: 2, created_at: getRelativeDate(-39), updated_at: getRelativeDate(-1) },
  { id: 'area-3-3', dream_id: 'mock-dream-3', title: 'Launch & Iterate', icon: '🚀', position: 3, created_at: getRelativeDate(-39), updated_at: getRelativeDate(-1) }
];

const dream3ActionsData = [
  // Area 1: Validate & Plan
  { 
    area_id: 'area-3-1', 
    title: "Define Your Target Problem & User", 
    difficulty: 'medium', 
    est_minutes: 60,
    intro: "Before building anything, get crystal clear on who you're solving for and what pain you're addressing.",
    criteria: [
      { title: "Write one-sentence problem statement", description: "Be specific: 'Freelance designers waste 3 hours/week manually tracking client invoices because existing tools don't integrate with their workflow.'" },
      { title: "Define your ideal user persona", description: "Who exactly is this for? Include: role, income level, current solution, biggest frustration." },
      { title: "Research 3-5 competitors", description: "List what exists, their pricing, and why they fall short. What's your differentiator?" }
    ],
    outro: "You should be able to explain your idea in 30 seconds to a stranger."
  },
  { 
    area_id: 'area-3-1', 
    title: "Talk to 5 Potential Users", 
    difficulty: 'hard', 
    est_minutes: 150,
    intro: "The best validation is talking to real people. Don't pitch—listen to their problems.",
    criteria: [
      { title: "Find 5 people who fit your persona", description: "Reach out via LinkedIn, Twitter DMs, or communities like Indie Hackers. Offer a 15-min call." },
      { title: "Ask open-ended questions", description: "'How do you currently handle X?' 'What's the most frustrating part?' 'Have you tried solutions before?'" },
      { title: "Validate willingness to pay", description: "Ask: 'Would you pay $X/month for a solution that did Y?' Note their reaction, not just their words." }
    ],
    outro: "If 3+ people say they'd pay, you're onto something. If not, pivot before building."
  },
  { 
    area_id: 'area-3-1', 
    title: "Create Validation Landing Page", 
    difficulty: 'medium', 
    est_minutes: 90,
    intro: "A simple landing page lets you test demand before writing a single line of code.",
    criteria: [
      { title: "Build one-page site", description: "Use Carrd, Framer, or Webflow. Headline that states the problem, 3 key benefits, clear CTA button." },
      { title: "Set up email capture", description: "Connect ConvertKit, Mailchimp, or similar. Track conversion rate from visitor to signup." },
      { title: "Share in 2-3 relevant places", description: "Post in a subreddit, Slack community, or Twitter. Measure: How many clicks? How many signups?" }
    ],
    outro: "Aim for 10%+ conversion rate. If you get 50+ signups, you have validation to build."
  },
  { 
    area_id: 'area-3-1', 
    title: "Map Your MVP Feature Set", 
    difficulty: 'hard', 
    est_minutes: 75,
    intro: "The 'Scope Hammer'—cut everything that isn't essential. Your MVP should do ONE thing well.",
    criteria: [
      { title: "Define the core user journey", description: "Step-by-step: Sign up → First action → Get value → Return. Keep it to 3-5 steps max." },
      { title: "List all features you want", description: "Then cut 70% of them. No settings pages, no profiles, no dark mode. Just the core value." },
      { title: "Write a simple technical spec", description: "Choose your stack (e.g., Next.js + Supabase). List: database tables, API endpoints, key pages." }
    ],
    outro: "Your MVP should be buildable in 30-40 days. If it's not, cut more features."
  },
  // Area 2: Build Core Product
  { 
    area_id: 'area-3-2', 
    title: "Set Up Development Environment", 
    difficulty: 'medium', 
    est_minutes: 60,
    intro: "Get your foundation right. A solid setup saves hours of debugging later.",
    criteria: [
      { title: "Initialize repository & connect to GitHub", description: "Set up .gitignore, README, and basic project structure." },
      { title: "Set up deployment pipeline", description: "Connect to Vercel, Netlify, or Railway. Ensure auto-deploy on push to main." },
      { title: "Configure development database", description: "Set up local Supabase, PostgreSQL, or your chosen database. Test connection." }
    ],
    outro: "You should be able to deploy a 'Hello World' page in under 5 minutes."
  },
  { 
    area_id: 'area-3-2', 
    title: "Build Authentication & User System", 
    difficulty: 'medium', 
    est_minutes: 90,
    intro: "Users need to sign up and log in. Use a service to save time—don't build from scratch.",
    criteria: [
      { title: "Implement sign up flow", description: "Email/password or OAuth (Google/GitHub). Use Supabase Auth, Clerk, or Auth0." },
      { title: "Create login flow", description: "Handle errors gracefully. Add 'Forgot password' link." },
      { title: "Set up user profile in database", description: "Create users table. Store: email, name, created_at. Test creating a user." }
    ],
    outro: "Test: Can you sign up, log out, and log back in? If yes, you're ready for features."
  },
  { 
    area_id: 'area-3-2', 
    title: "Build Your Core Feature (The Steel Thread)", 
    difficulty: 'hard', 
    est_minutes: 240,
    intro: "This is the heart of your product. Build the minimum version that delivers value.",
    criteria: [
      { title: "Create the main input interface", description: "The primary way users interact with your product. Make it simple and clear." },
      { title: "Build the core processing logic", description: "The 'magic' that transforms input into value. This is what makes your product unique." },
      { title: "Display the output/results", description: "Where users see the value. Make it visually clear and shareable if relevant." }
    ],
    outro: "You should be able to complete the full user journey end-to-end, even if it's rough."
  },
  { 
    area_id: 'area-3-2', 
    title: "Add Essential Polish & Error Handling", 
    difficulty: 'medium', 
    est_minutes: 120,
    intro: "Polish isn't perfection—it's making sure nothing breaks and users know what to do.",
    criteria: [
      { title: "Add loading states everywhere", description: "Show spinners or skeletons when data is fetching. Never leave users wondering if something is broken." },
      { title: "Create empty states", description: "What does the app look like with zero data? Add helpful prompts like 'Get started by...'" },
      { title: "Handle errors gracefully", description: "Show user-friendly error messages. Log errors for debugging. Never show raw error codes." }
    ],
    outro: "Test with a fresh account. Can a new user figure out what to do without help?"
  },
  { 
    area_id: 'area-3-2', 
    title: "Create Simple Onboarding Flow", 
    difficulty: 'medium', 
    est_minutes: 60,
    intro: "First impressions matter. Guide users to their first 'aha moment' quickly.",
    criteria: [
      { title: "Build welcome screen or modal", description: "Explain what the product does in 1-2 sentences. Show one example or demo." },
      { title: "Add a 'Get Started' action", description: "Make it obvious what the first step is. Pre-fill example data if helpful." },
      { title: "Test the onboarding flow", description: "Have someone who's never seen your product try it. Can they reach value in under 2 minutes?" }
    ],
    outro: "If users are confused after onboarding, simplify it. Remove steps, not add them."
  },
  { 
    area_id: 'area-3-2', 
    title: "Ensure Mobile Responsiveness", 
    difficulty: 'easy', 
    est_minutes: 45,
    intro: "Most users will check your product on their phone first. It doesn't need to be perfect, just functional.",
    criteria: [
      { title: "Test on mobile device or emulator", description: "Open your app on a phone. Can you complete the core flow?" },
      { title: "Fix critical mobile issues", description: "Buttons too small? Text unreadable? Forms broken? Fix the blockers." },
      { title: "Optimize for touch interactions", description: "Make tap targets at least 44x44px. Ensure forms work with mobile keyboards." }
    ],
    outro: "It doesn't need to be a native mobile app, but it should work on a phone browser."
  },
  // Area 3: Launch & Iterate
  { 
    area_id: 'area-3-3', 
    title: "Set Up Analytics & Monitoring", 
    difficulty: 'easy', 
    est_minutes: 45,
    intro: "You can't improve what you don't measure. Track the metrics that matter.",
    criteria: [
      { title: "Install analytics tool", description: "PostHog, Plausible, or Mixpanel. Track: signups, key feature usage, drop-off points." },
      { title: "Set up error monitoring", description: "Use Sentry or similar. Get alerts when things break in production." },
      { title: "Create a simple dashboard", description: "Track: daily active users, signups, core feature usage. Check it weekly." }
    ],
    outro: "You should know within 24 hours if something breaks or if usage spikes."
  },
  { 
    area_id: 'area-3-3', 
    title: "Soft Launch to Waitlist (First 20 Users)", 
    difficulty: 'medium', 
    est_minutes: 90,
    intro: "Launch quietly first. Get real feedback from real users before going public.",
    criteria: [
      { title: "Email your waitlist personally", description: "Send individual emails (not a blast). 'Hey [Name], I built this thing. Want to try it?'" },
      { title: "Offer high-touch onboarding", description: "Offer to hop on a 15-min call to help them set up. You'll learn more than they will." },
      { title: "Collect feedback immediately", description: "After they use it, ask: 'What worked? What didn't? Would you pay for this?'" }
    ],
    outro: "If 5+ users say they'd pay, you're ready for public launch. If not, iterate based on feedback."
  },
  { 
    area_id: 'area-3-3', 
    title: "Fix Critical Bugs & Polish Based on Feedback", 
    difficulty: 'medium', 
    est_minutes: 120,
    intro: "Your first users will find bugs you never imagined. Fix the blockers fast.",
    criteria: [
      { title: "Prioritize bug fixes", description: "Critical: App crashes, data loss, can't complete core flow. Nice-to-have: UI tweaks, edge cases." },
      { title: "Address top 3 user complaints", description: "What did multiple users say was confusing or broken? Fix those first." },
      { title: "Test fixes with original users", description: "Reach out: 'I fixed X. Can you try it again?' Show you're listening." }
    ],
    outro: "Aim for zero critical bugs before public launch. Nice-to-haves can wait."
  },
  { 
    area_id: 'area-3-3', 
    title: "Create Launch Content & Assets", 
    difficulty: 'medium', 
    est_minutes: 120,
    intro: "Great products need great storytelling. Prepare your launch materials.",
    criteria: [
      { title: "Record a 60-second demo video", description: "Show the problem, then your solution. No fluff. Upload to YouTube or Loom." },
      { title: "Write your launch story", description: "Why did you build this? What problem did you face? Make it personal and relatable." },
      { title: "Create social media assets", description: "Screenshots, preview images, one-liner description. Make it easy for others to share." }
    ],
    outro: "Your launch post should make someone think 'I need this' within 30 seconds."
  },
  { 
    area_id: 'area-3-3', 
    title: "Public Launch: Share in 5 Places", 
    difficulty: 'medium', 
    est_minutes: 90,
    intro: "Launch day! Share where your target users hang out. Don't spam—add value.",
    criteria: [
      { title: "Post on Product Hunt", description: "Prepare your PH post: tagline, description, screenshots. Launch at midnight PT for best visibility." },
      { title: "Share on Twitter/X", description: "Post your story + demo video. Tag relevant communities. Engage with replies." },
      { title: "Post in 2-3 relevant communities", description: "Reddit, Indie Hackers, or niche forums. Read the rules. Add value, don't just promote." },
      { title: "Email your personal network", description: "Reach out to friends, former colleagues, anyone who might find it useful or share it." }
    ],
    outro: "Launch day is just the beginning. The real work is engaging with users and iterating."
  },
  { 
    area_id: 'area-3-3', 
    title: "Set Up Feedback Loop & Support System", 
    difficulty: 'easy', 
    est_minutes: 60,
    intro: "Make it easy for users to tell you what's wrong or what they want. Then actually listen.",
    criteria: [
      { title: "Add feedback mechanism", description: "Simple 'Feedback' button in your app. Use Typeform, Canny, or just an email link." },
      { title: "Set up support email", description: "Create support@yourdomain.com. Check it daily. Respond within 24 hours." },
      { title: "Create a public roadmap", description: "Show users what you're building next. Use Trello, GitHub Issues, or a simple page." }
    ],
    outro: "Users who feel heard become your best advocates. Respond to every piece of feedback."
  }
];

const dream3Actions: Action[] = dream3ActionsData.map((data, index) => ({
  id: `mock-action-dream-3-${index}`,
  user_id: 'mock-user',
  dream_id: 'mock-dream-3',
  area_id: data.area_id,
  title: data.title,
  difficulty: data.difficulty as any,
  est_minutes: data.est_minutes,
  position: index + 1,
  is_active: true,
  created_at: getRelativeDate(-39),
  updated_at: getRelativeDate(-1),
  acceptance_criteria: data.criteria
}));

// Dream 3 Occurrences: Day 40/60. Significant progress.
const dream3Occurrences: ActionOccurrence[] = dream3Actions.map((action, index) => {
  // Simulate progress: First 6 actions done. 7th active. Rest future.
  const isDone = index < 6;
  const isToday = index === 6;
  
  return {
    id: `occ-dream-3-${index}`,
    action_id: action.id,
    occurrence_no: 1,
    planned_due_on: isDone ? getRelativeDate(-30 + (index * 2)) : (isToday ? TODAY_STR : getRelativeDate(index - 5)),
    due_on: isDone ? getRelativeDate(-30 + (index * 2)) : (isToday ? TODAY_STR : getRelativeDate(index - 5)),
    defer_count: 0,
    created_at: getRelativeDate(-39),
    updated_at: getRelativeDate(-1),
    completed_at: isDone ? getRelativeDate(-30 + (index * 2)) : undefined
  };
});

const mockDream3Detail: DreamDetailPayload = {
  fetchedAt: NOW,
  dream: mockDreams[2],
  areas: dream3Areas,
  actions: dream3Actions,
  occurrences: dream3Occurrences
};


// --- MOCK DREAM 4 DETAIL (Morning Routine) ---

const dream4Areas: Area[] = [
  { id: 'area-4-1', dream_id: 'mock-dream-4', title: 'Mindset & Stillness', icon: '🧠', position: 1, created_at: getRelativeDate(-29), updated_at: getRelativeDate(-1) },
  { id: 'area-4-2', dream_id: 'mock-dream-4', title: 'Movement & Body', icon: '⚡', position: 2, created_at: getRelativeDate(-29), updated_at: getRelativeDate(-1) },
  { id: 'area-4-3', dream_id: 'mock-dream-4', title: 'Learning & Growth', icon: '📚', position: 3, created_at: getRelativeDate(-29), updated_at: getRelativeDate(-1) }
];

const dream4ActionsData = [
  // Area 1: Mindset
  { 
    area_id: 'area-4-1', 
    title: "5-Minute Gratitude Journaling", 
    difficulty: 'easy', 
    est_minutes: 5, 
    intro: "Start the day with abundance, not scarcity.",
    criteria: [{title: "Write 3 things you are grateful for.", description: ""}, {title: "Write 1 thing that would make today great.", description: ""}, {title: "Write 1 positive affirmation.", description: ""}] 
  },
  { 
    area_id: 'area-4-1', 
    title: "10-Minute Mindfulness Meditation", 
    difficulty: 'medium', 
    est_minutes: 10,
    criteria: [{title: "Sit in a quiet place.", description: ""}, {title: "Focus on breath.", description: ""}, {title: "No judgment on wandering thoughts.", description: ""}] 
  },
  // Area 2: Body
  { 
    area_id: 'area-4-2', 
    title: "Hydrate immediately (500ml)", 
    difficulty: 'easy', 
    est_minutes: 2,
    criteria: [{title: "Drink 1 full glass of water before coffee.", description: ""}, {title: "Add lemon/salt if desired.", description: ""}] 
  },
  { 
    area_id: 'area-4-2', 
    title: "Morning Sun & Movement", 
    difficulty: 'medium', 
    est_minutes: 15,
    criteria: [{title: "Get outside for 10 mins (light exposure).", description: ""}, {title: "Do 10 pushups or air squats.", description: ""}, {title: "Stretch tight areas.", description: ""}] 
  },
  // Area 3: Learning
  { 
    area_id: 'area-4-3', 
    title: "Read 10 pages of non-fiction", 
    difficulty: 'medium', 
    est_minutes: 20,
    intro: "Leaders are readers. Feed your mind before the world distracts it.",
    criteria: [{title: "Phone must be in another room.", description: ""}, {title: "Read with a pen/highlighter.", description: ""}, {title: "Note one actionable takeaway.", description: ""}] 
  },
  { 
    area_id: 'area-4-3', 
    title: "Review Daily Goals", 
    difficulty: 'easy', 
    est_minutes: 5,
    criteria: [{title: "Check calendar for today.", description: ""}, {title: "Identify the 'Big 3' tasks.", description: ""}, {title: "Visualize successful completion.", description: ""}] 
  }
];

const dream4Actions: Action[] = dream4ActionsData.map((data, index) => ({
  id: `mock-action-dream-4-${index}`,
  user_id: 'mock-user',
  dream_id: 'mock-dream-4',
  area_id: data.area_id,
  title: data.title,
  difficulty: data.difficulty as any,
  est_minutes: data.est_minutes,
  position: index + 1,
  is_active: true,
  created_at: getRelativeDate(-29),
  updated_at: getRelativeDate(-1),
  acceptance_criteria: data.criteria,
  acceptance_intro: (data as any).intro
}));

// Dream 4 Occurrences: Recurring daily actions. Day 30/60.
// We need to generate history for these daily actions.
const dream4Occurrences: ActionOccurrence[] = [];

// For each action, generate 30 days of history
dream4Actions.forEach((action) => {
  for (let day = 0; day <= 30; day++) {
    const relativeDay = -30 + day; // -30, -29 ... 0 (Today)
    const isToday = relativeDay === 0;
    // Simulate ~80% consistency
    const isDone = !isToday && Math.random() > 0.2; 
    
    dream4Occurrences.push({
      id: `occ-dream-4-${action.id}-${day}`,
      action_id: action.id,
      occurrence_no: day + 1,
      planned_due_on: getRelativeDate(relativeDay),
      due_on: getRelativeDate(relativeDay),
      defer_count: 0,
      created_at: getRelativeDate(-30),
      updated_at: getRelativeDate(relativeDay),
      completed_at: isDone ? getRelativeDate(relativeDay) : undefined
    });
  }
});

const mockDream4Detail: DreamDetailPayload = {
  fetchedAt: NOW,
  dream: mockDreams[3],
  areas: dream4Areas,
  actions: dream4Actions,
  occurrences: dream4Occurrences
};


// --- EXPORTED MOCK STATE ---

export const getScreenshotMockState = () => ({
  dreamsSummary: { dreams: mockDreams, fetchedAt: NOW },
  dreamsWithStats: { dreams: mockDreams, fetchedAt: NOW },
  today: { occurrences: mockOccurrences, fetchedAt: NOW },
  todayByDate: { [TODAY_STR]: { occurrences: mockOccurrences, fetchedAt: NOW } },
  loadingTodayByDate: {},
  progress: mockProgress,
  dreamDetail: {
    'mock-dream-1': mockDreamDetail,
    'mock-dream-2': mockDream2Detail,
    'mock-dream-3': mockDream3Detail,
    'mock-dream-4': mockDream4Detail
  }
});
