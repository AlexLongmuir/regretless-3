// lib/ai/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");

export const GEMINI_MODEL = "gemini-3-flash-preview";
export const GEMINI_FLASH_MODEL = "gemini-3-flash-preview";

// Thinking budget presets for different use cases
export const THINKING_BUDGETS = {
  MINIMAL: 512,      // For simple tasks like feasibility analysis
  MODERATE: 1024,    // For area planning and general reasoning
  HIGH: 2048,        // For complex action planning
  MAXIMUM: 4096,     // For the most complex reasoning tasks
  DYNAMIC: -1,       // Let the model decide based on complexity
  DISABLED: 0        // Disable thinking entirely
} as const;

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export function getModel(systemInstruction?: string, modelId = GEMINI_MODEL) {
  return client.getGenerativeModel({
    model: modelId,
    ...(systemInstruction ? { systemInstruction } : {}),
  });
}

/**
 * Get the valid thinking budget range for a given model
 */
export function getThinkingBudgetRange(modelId: string): { min: number; max: number } {
  if (modelId.includes('pro')) {
    return { min: 128, max: 32768 };
  } else if (modelId.includes('flash-lite')) {
    return { min: 512, max: 24576 };
  } else if (modelId.includes('flash')) {
    return { min: 0, max: 24576 };
  }
  
  // Default to flash-lite range for unknown models
  return { min: 512, max: 24576 };
}

/**
 * Validate and clamp a thinking budget to the valid range for a model
 */
export function validateThinkingBudget(thinkingBudget: number, modelId: string): number {
  const { min, max } = getThinkingBudgetRange(modelId);
  
  // Special cases
  if (thinkingBudget === -1) return -1; // Dynamic
  if (thinkingBudget === 0) return 0;   // Disabled
  
  // Clamp to valid range
  return Math.max(min, Math.min(max, thinkingBudget));
}

/**
 * Generate JSON response from Gemini with optional thinking budget support
 * 
 * @param opts Configuration options
 * @param opts.system System instruction for the model
 * @param opts.messages Array of messages to send to the model
 * @param opts.schema JSON schema for the expected response format
 * @param opts.maxOutputTokens Maximum tokens for the response (default: 600)
 * @param opts.modelId Model to use (default: GEMINI_MODEL)
 * @param opts.enableThinking Enable thinking mode (default: false)
 * @param opts.thinkingBudget Number of tokens to allocate for thinking (default: THINKING_BUDGETS.MODERATE)
 * @returns Promise with parsed JSON data and usage metadata
 */
export async function generateJson(opts: {
  system?: string;
  messages: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }>;
  schema: any;
  maxOutputTokens?: number;
  modelId?: string;
  enableThinking?: boolean;
  thinkingBudget?: number;
}) {
  const model = getModel(opts.system, opts.modelId);
  
  // Build generation config with optional thinking support
  const generationConfig: any = {
    responseMimeType: "application/json",
    responseSchema: opts.schema,
    maxOutputTokens: opts.maxOutputTokens ?? 600,
  };

  // Add thinking configuration if enabled
  if (opts.enableThinking || opts.thinkingBudget !== undefined) {
    const modelId = opts.modelId ?? GEMINI_MODEL;
    const thinkingBudget = opts.thinkingBudget ?? THINKING_BUDGETS.MODERATE;
    
    // Validate and clamp thinking budget to valid range
    const validatedBudget = validateThinkingBudget(thinkingBudget, modelId);
    
    generationConfig.thinkingConfig = {
      thinkingBudget: validatedBudget
    };
    
    const budgetDescription = validatedBudget === -1 ? 'dynamic' : 
                             validatedBudget === 0 ? 'disabled' : 
                             `${validatedBudget} tokens`;
    console.log(`🧠 Using thinking budget: ${budgetDescription} for model: ${modelId}`);
  }

  const resp = await model.generateContent({
    contents: [{ role: "user", parts: opts.messages }] as any,
    generationConfig,
  });

  let text = resp.response.text(); // JSON string per schema
  const usage = resp.response.usageMetadata;
  
  // Log the raw response for debugging
  console.log('🤖 Raw AI Response:', text)
  
  // Check if JSON appears to be truncated
  const trimmedText = text.trim();
  if (!trimmedText.endsWith('}') && !trimmedText.endsWith(']')) {
    console.warn('⚠️ JSON appears to be truncated - attempting to fix');
    
    // Special case: if the text ends with a number (like "slice_count_target": 3), 
    // it's likely a truncated action that just needs closing braces
    if (trimmedText.match(/\d+\s*$/)) {
      console.log('🔧 Detected truncation after numeric value - adding closing braces');
      text = trimmedText + '\n      }\n    ]\n  }';
    } else {
      // Try to find the last complete object and close the JSON properly
    const lastCompleteBrace = trimmedText.lastIndexOf('}');
    const lastCompleteBracket = trimmedText.lastIndexOf(']');
    const lastComplete = Math.max(lastCompleteBrace, lastCompleteBracket);
    
    if (lastComplete > 0) {
      // Find the last complete action object
      const beforeLastComplete = trimmedText.substring(0, lastComplete + 1);
      const afterLastComplete = trimmedText.substring(lastComplete + 1);
      
      // If there's incomplete content after the last complete object, try to close it
      if (afterLastComplete.trim() && !afterLastComplete.includes('}')) {
        // This looks like a truncated action, try to close the JSON structure
        let fixedText = beforeLastComplete;
        
        // If we're in the middle of an action object, try to close it
        if (afterLastComplete.includes('"area_id"') || afterLastComplete.includes('"title"') || afterLastComplete.includes('"position"')) {
          // This is likely a truncated action, try to complete it properly
          if (afterLastComplete.includes('"position"') && !afterLastComplete.includes('}')) {
            // The action has position but is missing closing brace
            const positionMatch = afterLastComplete.match(/"position":\s*(\d+)/);
            if (positionMatch) {
              const position = positionMatch[1];
              fixedText += `,\n      "position": ${position}\n    }`;
            } else {
              fixedText += ',\n      "position": 999\n    }';
            }
          } else {
            // This is likely a truncated action, close it with minimal required fields
            fixedText += ',\n    {\n      "area_id": "truncated",\n      "title": "Complete remaining actions",\n      "est_minutes": 60,\n      "difficulty": "medium",\n      "acceptance_criteria": [{"title": "Action completed", "description": "Complete the remaining actions"}],\n      "position": 999\n    }';
          }
        }
        
        // Close the actions array and main object
        fixedText += '\n  ]\n}';
        
        console.log('🔧 Attempting to fix truncated JSON:', fixedText);
        text = fixedText;
      }
    }
    }
  }
  
  try {
    // Try to clean up common JSON formatting issues
    let cleanedText = text
      // Remove trailing commas before closing braces/brackets
      .replace(/,(\s*[}\]])/g, '$1')
      // Fix line breaks in the middle of objects
      .replace(/,\s*\n\s*([a-zA-Z_])/g, ',\n      "$1')
      // Ensure proper spacing around colons
      .replace(/:\s*([0-9]+)\s*\n\s*,\s*\n\s*([a-zA-Z_])/g, ': $1,\n      "$2')
    
    const parsedData = JSON.parse(cleanedText);
    return { data: parsedData, usage };
  } catch (parseError) {
    console.error('❌ JSON Parse Error:', parseError);
    console.error('❌ Raw text that failed to parse:', text);
    
    // Try one more cleanup attempt
    try {
      // More aggressive cleanup
      let aggressiveCleanup = text
        .replace(/,\s*\n\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, ',\n      "$1":')
        .replace(/([0-9]+)\s*\n\s*,\s*\n\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1,\n      "$2":')
        .replace(/,(\s*[}\]])/g, '$1')
      
      const parsedData = JSON.parse(aggressiveCleanup);
      console.log('✅ Successfully parsed after aggressive cleanup');
      return { data: parsedData, usage };
    } catch (secondParseError) {
      console.error('❌ Second parse attempt also failed:', secondParseError);
      
      // For AI review specifically, provide a fallback response
      if (opts.schema && opts.schema.properties && opts.schema.properties.rating && opts.schema.properties.feedback) {
        console.log('🔄 Providing fallback response for AI review');
        return { 
          data: { 
            rating: 50, 
            feedback: "Unable to process review due to technical issues." 
          }, 
          usage 
        };
      }
      
      throw new Error(`AI returned invalid JSON: ${parseError.message}`);
    }
  }
}