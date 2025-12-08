import type { 
  DreamsSummaryPayload, 
  DreamsWithStatsPayload, 
  TodayPayload, 
  ProgressPayload, 
  DreamDetailPayload 
} from '../contexts/dataCache';
import type { ActionOccurrenceStatus, DreamWithStats, Dream, Area, Action, ActionOccurrence } from '../backend/database/types';

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
    time_commitment: { hours: 1, minutes: 0 }
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
    total_areas: 2,
    total_actions: 6,
    completed_today: 0,
    completed_total: 12,
    image_url: 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=800&q=80', // Adventure/Hiking
    time_commitment: { hours: 0, minutes: 30 }
  },
  {
    id: 'mock-dream-3',
    user_id: 'mock-user',
    title: 'Launch my first personal project',
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
    time_commitment: { hours: 2, minutes: 0 }
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
    total_areas: 2,
    total_actions: 5,
    completed_today: 1,
    completed_total: 10,
    image_url: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=800&q=80', // Morning
    time_commitment: { hours: 0, minutes: 45 }
  }
];

// --- MOCK TODAY ACTIONS ---

const mockOccurrences: ActionOccurrenceStatus[] = [
  {
    id: 'mock-occ-1',
    action_id: 'mock-action-1',
    occurrence_no: 1,
    planned_due_on: TODAY_STR,
    due_on: TODAY_STR,
    defer_count: 0,
    created_at: getRelativeDate(-1),
    updated_at: getRelativeDate(-1),
    is_done: false,
    is_overdue: false,
    overdue_days: 0,
    action_title: 'Build your personalised high protein eating plan for the week',
    difficulty: 'easy',
    est_minutes: 20,
    area_title: 'Reset & Build Foundation',
    area_icon: '🏋️',
    dream_title: 'Get in the best shape of my life in 90 days',
    // @ts-ignore: Inserting partial data for UI
    actions: {
      title: 'Build your personalised high protein eating plan for the week',
      difficulty: 'easy',
      est_minutes: 20,
      recurrence_rule: 'RRULE:FREQ=WEEKLY',
      acceptance_intro: "Take a moment to plan meals that will fuel your body and support your fitness goals this week",
      acceptance_criteria: [
        'Find 3 cookable high-protein meals',
        'Pick one simple fallback meal',
        'Set daily "protein anchors" (snacks/quick wins)'
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
    created_at: getRelativeDate(-1),
    updated_at: getRelativeDate(-1),
    is_done: false,
    is_overdue: false,
    overdue_days: 0,
    action_title: 'Pick a country to visit in South America this year',
    difficulty: 'easy',
    est_minutes: 20,
    area_title: 'Plan The Adventure',
    area_icon: '✈️',
    dream_title: 'Travel to 3 new continents in 2026',
    // @ts-ignore: Inserting partial data for UI
    actions: {
      title: 'Pick a country to visit in South America this year',
      difficulty: 'easy',
      est_minutes: 20,
      acceptance_criteria: [
        'Read 2-3 blogs comparing SA destinations',
        'Shortlist 3-5 countries with costs/timings',
        'Rank top 3 by value and seasonality'
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
    created_at: getRelativeDate(-1),
    updated_at: getRelativeDate(-1),
    is_done: false,
    is_overdue: false,
    overdue_days: 0,
    action_title: 'Improve your landing page so it’s ready to show people',
    difficulty: 'medium',
    est_minutes: 25,
    area_title: 'Launch Preparation',
    area_icon: '🚀',
    dream_title: 'Launch my first personal project',
    // @ts-ignore: Inserting partial data for UI
    actions: {
      title: 'Improve your landing page so it’s ready to show people',
      difficulty: 'medium',
      est_minutes: 25,
      acceptance_criteria: [
        'Sharpen headline/subheading for clarity',
        'Improve one section (features/FAQ)',
        'Make CTA clear and prominent'
      ],
      areas: {
        title: 'Launch Preparation',
        icon: '🚀',
        dreams: {
          title: 'Launch my first personal project',
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

// --- MOCK DREAM DETAIL (Get in the best shape of my life) ---

// Area 2: Build Strength & Endurance Actions
const area2ActionsData = [
  {
    title: "Plan your strength routine for the next 2 weeks",
    difficulty: "medium",
    est_minutes: 30,
    criteria: [
      "Select main lift/focus for each session",
      "Define reps, sets, or progression style",
      "Schedule recovery days or light sessions"
    ]
  },
  {
    title: "Build your personalised high-protein eating plan for the week",
    difficulty: "easy",
    est_minutes: 20,
    recurrence_rule: 'RRULE:FREQ=WEEKLY',
    intro: "Take a moment to plan meals that will fuel your body and support your fitness goals this week",
    criteria: [
      "Find 3 cookable high-protein meals",
      "Pick one simple fallback meal",
      "Set daily 'protein anchors' (snacks/quick wins)"
    ],
    outro: "You're done when you have a clear, actionable plan for the week ahead"
  },
  {
    title: "Do your strength & conditioning circuit",
    difficulty: "hard",
    est_minutes: 45,
    criteria: [
      "Complete circuit at established baseline",
      "Increase reps, time, or difficulty",
      "Save results to track progress"
    ]
  },
  {
    title: "Mobility & Stretching Routine",
    criteria: [
      "10 mins full body foam rolling.",
      "Hold deep squat stretch for 2 mins.",
      "Pigeon pose stretch (2 mins per side).",
      "Doorway pec stretch (1 min per side)."
    ]
  },
  {
    title: "Core Stability Circuit",
    criteria: ["Plank hold (3 x 60s).", "Dead bugs (3 x 12 reps).", "Bird-dogs (3 x 12 reps)."]
  },
  {
    title: "Progressive Overload Check-in",
    criteria: ["Review last week's weights.", "Plan 2.5kg increase for major lifts.", "Adjust volume if needed."]
  },
  {
    title: "Protein Intake Tracking",
    criteria: ["Log all meals in tracker app.", "Ensure hitting daily protein goal.", "Review macro split."]
  },
  {
    title: "Active Recovery Walk",
    criteria: ["Walk for 45 minutes.", "Keep heart rate in Zone 1.", "Listen to a podcast or audiobook."]
  },
  {
    title: "Sleep Quality Review",
    criteria: ["Review sleep duration average.", "Check sleep consistency.", "Plan adjustments for better rest."]
  },
  {
    title: "Hydration Goal Check",
    criteria: ["Drink 3 liters of water daily.", "Track intake in app.", "Limit caffeine after 2pm."]
  },
  {
    title: "Form Check Video Review",
    criteria: ["Record squat set.", "Compare form to instructional video.", "Identify one cue to improve."]
  },
  {
    title: "Weekly Strength Log Update",
    criteria: ["Update spreadsheet with weekly maxes.", "Note any pain points.", "Celebrate PBs."]
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
  recurrence_rule: data.recurrence_rule,
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
  acceptance_criteria: ["Clear pantry of junk food.", "Buy healthy staples.", "Set up meal prep containers."]
};

const area3Action: Action = {
  id: 'mock-action-area-3', user_id: 'mock-user', dream_id: 'mock-dream-1', area_id: 'area-3',
  title: 'Physique Check-in', difficulty: 'medium', est_minutes: 15, position: 1, is_active: true,
  created_at: getRelativeDate(0), updated_at: getRelativeDate(-1), 
  acceptance_criteria: ["Take front photo.", "Take side photo.", "Take back photo.", "Measure waist circumference."]
};

const area4Action: Action = {
  id: 'mock-action-area-4', user_id: 'mock-user', dream_id: 'mock-dream-1', area_id: 'area-4',
  title: 'Long Term Health Review', difficulty: 'easy', est_minutes: 20, position: 1, is_active: true,
  created_at: getRelativeDate(0), updated_at: getRelativeDate(-1), 
  acceptance_criteria: ["Review family health history.", "Schedule annual checkup.", "Check vaccination status."]
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
      completed_at: getRelativeDate(-10 + i), is_skipped: false
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
      completed_at: isComplete ? getRelativeDate(-1) : null,
      is_skipped: false
    });
  });

  // Helper for Area 3 (10 items, 0 complete)
  for (let i = 0; i < 10; i++) {
    occurrences.push({
      id: `occ-area-3-${i}`, action_id: 'mock-action-area-3', occurrence_no: i + 1,
      planned_due_on: getRelativeDate(i), due_on: getRelativeDate(i),
      defer_count: 0, created_at: getRelativeDate(-20), updated_at: getRelativeDate(-1),
      completed_at: null, is_skipped: false
    });
  }

  // Helper for Area 4 (6 items, 0 complete)
  for (let i = 0; i < 6; i++) {
    occurrences.push({
      id: `occ-area-4-${i}`, action_id: 'mock-action-area-4', occurrence_no: i + 1,
      planned_due_on: getRelativeDate(i), due_on: getRelativeDate(i),
      defer_count: 0, created_at: getRelativeDate(-20), updated_at: getRelativeDate(-1),
      completed_at: null, is_skipped: false
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
    'mock-dream-2': { ...mockDreamDetail, dream: mockDreams[1], areas: [], actions: [], occurrences: [] }, // Partial for others
    'mock-dream-3': { ...mockDreamDetail, dream: mockDreams[2], areas: [], actions: [], occurrences: [] },
    'mock-dream-4': { ...mockDreamDetail, dream: mockDreams[3], areas: [], actions: [], occurrences: [] }
  }
});
