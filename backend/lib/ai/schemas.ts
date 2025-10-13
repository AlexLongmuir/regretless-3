export const PLAN_SCHEMA = {
    type: "object",
    properties: {
      dreamTitle: { type: "string" },
      areas: {
        type: "array",
        maxItems: 6,
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            actions: {
              type: "array",
              maxItems: 8,
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  est_minutes: { type: "integer", minimum: 5 },
                  difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                  acceptance_criteria: {
                    type: "array",
                    maxItems: 3,
                    items: { type: "string" }
                  },
                },
                required: ["title","est_minutes","difficulty","acceptance_criteria"]
              }
            }
          },
          required: ["title","actions"]
        }
      }
    },
    required: ["dreamTitle","areas"]
  };

export const GOAL_FEASIBILITY_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description: "Brief explanation of why the original goal needs improvement"
    },
    titleSuggestions: {
      type: "array",
      maxItems: 4,
      items: {
        type: "object",
        properties: {
          title: { type: "string", maxLength: 10 },
          emoji: { type: "string" },
          reasoning: { type: "string" }
        },
        required: ["title", "emoji", "reasoning"]
      }
    }
  },
  required: ["summary", "titleSuggestions"]
};

export const TIMELINE_FEASIBILITY_SCHEMA = {
  type: "object",
  properties: {
    assessment: {
      type: "string",
      description: "Assessment of whether the timeline is realistic"
    },
    suggestedEndDate: {
      type: "string",
      description: "Suggested end date in YYYY-MM-DD format"
    },
    reasoning: {
      type: "string",
      description: "Clear reasoning for the assessment and suggested date"
    }
  },
  required: ["assessment", "suggestedEndDate", "reasoning"]
};

export const AREAS_SCHEMA = {
  type: "object",
  properties: {
    areas: {
      type: "array",
      minItems: 2,
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          emoji: { type: "string" },
          reasoning: { type: "string" }
        },
        required: ["title", "emoji", "reasoning"]
      }
    }
  },
  required: ["areas"]
};

export const ACTIONS_SCHEMA = {
  type: "object",
  properties: {
    actions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          area_id: { type: "string" },
          title: { type: "string" },
          est_minutes: { type: "integer" },
          difficulty: { type: "string" },
          repeat_every_days: { type: "integer" },
          slice_count_target: { type: "integer" },
          acceptance_criteria: {
            type: "array",
            items: { type: "string" }
          },
          position: { type: "integer" }
        },
        required: ["area_id", "title", "est_minutes", "difficulty", "acceptance_criteria", "position"]
      }
    }
  },
  required: ["actions"]
};

export const AI_REVIEW_SCHEMA = {
  type: "object",
  properties: {
    rating: {
      type: "integer",
      minimum: 0,
      maximum: 100,
      description: "Overall rating out of 100 based on how well the submission meets the action criteria"
    },
    feedback: {
      type: "string",
      maxLength: 200,
      description: "Brief, constructive feedback on the submission"
    }
  },
  required: ["rating", "feedback"]
};
  