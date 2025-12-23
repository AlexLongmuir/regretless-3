// lib/ai/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");

export const GEMINI_MODEL = "gemini-3-flash";
export const GEMINI_FLASH_MODEL = "gemini-3-flash";

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
  try {
    const model = client.getGenerativeModel({
      model: modelId,
      ...(systemInstruction ? { systemInstruction } : {}),
    });
    console.log(`[GEMINI] Initialized model: ${modelId}`);
    return model;
  } catch (error) {
    console.error(`[GEMINI] Failed to initialize model ${modelId}:`, error);
    throw new Error(`Failed to initialize Gemini model: ${modelId}. Error: ${error instanceof Error ? error.message : String(error)}`);
  }
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
  console.log('[GEMINI] Raw AI Response length:', text.length);
  console.log('[GEMINI] Raw AI Response (first 200 chars):', text.substring(0, 200));
  
  // Strip markdown code blocks if present (sometimes Gemini wraps JSON in ```json ... ```)
  text = text.trim();
  if (text.startsWith('```')) {
    console.log('[GEMINI] Detected markdown code block, stripping...');
    // Remove opening ```json or ```
    text = text.replace(/^```(?:json)?\s*\n?/, '');
    // Remove closing ```
    text = text.replace(/\n?```\s*$/, '');
    text = text.trim();
    console.log('[GEMINI] After stripping markdown (first 200 chars):', text.substring(0, 200));
  }
  
  // Remove any leading/trailing whitespace or newlines
  text = text.trim();
  
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
    // If we get an "unterminated string" error, try to fix it
    if (parseError instanceof Error && parseError.message.includes('Unterminated string')) {
      console.log('[GEMINI] Attempting to fix unterminated string error...');
      console.log('[GEMINI] Error position info:', parseError.message);
      
      // Extract position from error message if available
      const positionMatch = parseError.message.match(/position (\d+)/);
      const errorPosition = positionMatch ? parseInt(positionMatch[1]) : -1;
      
      if (errorPosition > 0 && errorPosition < text.length) {
        // Look at the context around the error position
        const contextStart = Math.max(0, errorPosition - 50);
        const contextEnd = Math.min(text.length, errorPosition + 50);
        const context = text.substring(contextStart, contextEnd);
        console.log('[GEMINI] Context around error:', context);
        
        // Try to find the unterminated string by looking backwards from the error position
        // Find the last opening quote before the error
        let quoteStart = text.lastIndexOf('"', errorPosition);
        if (quoteStart !== -1) {
          // Check if this quote is part of a key or value
          const beforeQuote = text.substring(Math.max(0, quoteStart - 10), quoteStart);
          if (beforeQuote.includes(':')) {
            // This is likely a value string that's unterminated
            // Try to find where it should end by looking for the next quote, comma, or brace
            let searchStart = quoteStart + 1;
            let foundEnd = false;
            let endPos = searchStart;
            
            // Look for the next quote that's followed by comma or brace
            while (endPos < text.length && !foundEnd) {
              const nextQuote = text.indexOf('"', endPos);
              if (nextQuote === -1) break;
              
              const afterQuote = text.substring(nextQuote + 1).trim();
              if (afterQuote.match(/^[,}\]]/)) {
                // Found the end
                foundEnd = true;
                endPos = nextQuote + 1;
              } else {
                endPos = nextQuote + 1;
              }
            }
            
            if (foundEnd) {
              // Extract the string content and escape any internal quotes
              const stringContent = text.substring(quoteStart + 1, endPos - 1);
              const escapedContent = stringContent.replace(/"/g, '\\"').replace(/\n/g, '\\n');
              const fixedText = text.substring(0, quoteStart + 1) + escapedContent + '"' + text.substring(endPos);
              
              try {
                const parsedData = JSON.parse(fixedText);
                console.log('[GEMINI] Successfully fixed unterminated string by escaping quotes');
                return { data: parsedData, usage };
              } catch (fixError) {
                console.error('[GEMINI] Fix attempt failed:', fixError);
              }
            }
          }
        }
      }
    }
    // Log error details in multiple statements to ensure Vercel captures them
    console.error('[GEMINI] JSON Parse Error:', parseError instanceof Error ? parseError.message : String(parseError));
    console.error('[GEMINI] Parse error stack:', parseError instanceof Error ? parseError.stack : 'N/A');
    console.error('[GEMINI] Raw text length:', text.length);
    
    // Split long text into chunks for Vercel logging (Vercel truncates very long logs)
    const chunkSize = 500;
    for (let i = 0; i < text.length; i += chunkSize) {
      const chunk = text.substring(i, i + chunkSize);
      console.error(`[GEMINI] Raw text chunk ${Math.floor(i / chunkSize) + 1}:`, chunk);
    }
    
    // Also log first and last parts separately for quick debugging
    console.error('[GEMINI] First 500 chars:', text.substring(0, 500));
    if (text.length > 500) {
      console.error('[GEMINI] Last 500 chars:', text.substring(text.length - 500));
    }
    
    // Try one more cleanup attempt with more aggressive fixes
    let aggressiveCleanup: string;
    try {
      // More aggressive cleanup - handle common AI JSON mistakes
      aggressiveCleanup = text
        // First, try to extract JSON from markdown if still present
        .replace(/^```(?:json)?\s*\n?/, '')
        .replace(/\n?```\s*$/, '')
        .trim()
        // Fix unquoted property names (e.g., { title: "..." } -> { "title": "..." })
        .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
        // Fix property names with quotes but wrong format
        .replace(/,\s*\n\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, ',\n      "$1":')
        .replace(/([0-9]+)\s*\n\s*,\s*\n\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1,\n      "$2":')
        // Remove trailing commas
        .replace(/,(\s*[}\]])/g, '$1')
        // Fix missing commas between properties
        .replace(/(")\s*\n\s*("[a-zA-Z_])/g, '$1,\n      $2')
        .replace(/([0-9])\s*\n\s*("[a-zA-Z_])/g, '$1,\n      $2')
        .replace(/(})\s*\n\s*({)/g, '$1,\n      $2')
        // Fix unescaped quotes in string values (common issue)
        .replace(/:\s*"([^"]*)"([^,}\]]*)/g, (match, content, rest) => {
          // If there's content after the closing quote that suggests an unterminated string, try to fix it
          if (rest && !rest.match(/^\s*[,}\]]/)) {
            // This might be an unterminated string, try to escape quotes in the content
            const escapedContent = content.replace(/"/g, '\\"');
            return `: "${escapedContent}"${rest}`;
          }
          return match;
        })
        // Fix newlines in string values (shouldn't happen but handle it)
        .replace(/:\s*"([^"]*)\n([^"]*)"/g, ': "$1 $2"')
        // Try to fix unterminated strings by finding the next quote and closing properly
        .replace(/:\s*"([^"]*?)(?=\s*[,}\]]|$)/g, (match, content) => {
          // If the match doesn't end with a quote, it might be unterminated
          if (!match.endsWith('"')) {
            // Try to find where the string should end
            return `: "${content.replace(/"/g, '\\"')}"`;
          }
          return match;
        })
      
      const parsedData = JSON.parse(aggressiveCleanup);
      console.log('✅ Successfully parsed after aggressive cleanup');
      return { data: parsedData, usage };
    } catch (secondParseError) {
      console.error('[GEMINI] Second parse attempt failed:', secondParseError instanceof Error ? secondParseError.message : String(secondParseError));
      console.error('[GEMINI] Second parse stack:', secondParseError instanceof Error ? secondParseError.stack : 'N/A');
      
      if (aggressiveCleanup) {
        // Log cleaned text in chunks
        const chunkSize = 500;
        for (let i = 0; i < aggressiveCleanup.length; i += chunkSize) {
          const chunk = aggressiveCleanup.substring(i, i + chunkSize);
          console.error(`[GEMINI] Cleaned text chunk ${Math.floor(i / chunkSize) + 1}:`, chunk);
        }
      } else {
        console.error('[GEMINI] No cleaned text available');
      }
      
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
      
      // Include both error messages for better debugging
      const errorDetails = `First error: ${parseError.message}; Second error: ${secondParseError instanceof Error ? secondParseError.message : String(secondParseError)}`;
      throw new Error(`AI returned invalid JSON: ${errorDetails}`);
    }
  }
}