// lib/ai/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");

export const GEMINI_MODEL = "gemini-3-flash-preview";
export const GEMINI_FLASH_MODEL = "gemini-3-flash-preview";
export const GEMINI_IMAGE_MODEL = "gemini-3-pro-image-preview";

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
 * Check if a response is truncated based on finishReason and response length
 * @param response The Gemini API response
 * @param text The extracted text from the response
 * @param maxOutputTokens The maximum output tokens that were requested
 * @returns Object with isTruncated flag and details
 */
function checkTruncation(
  response: any,
  text: string,
  maxOutputTokens: number
): { isTruncated: boolean; finishReason?: string; details: string } {
  // Check finishReason from candidates (indicates MAX_TOKENS truncation)
  const finishReason = response?.candidates?.[0]?.finishReason;
  const usageMetadata = response?.usageMetadata;
  const outputTokens = usageMetadata?.candidatesTokenCount || 0;

  if (finishReason === 'MAX_TOKENS') {
    return {
      isTruncated: true,
      finishReason: 'MAX_TOKENS',
      details: `Response truncated due to MAX_TOKENS limit. Output tokens: ${outputTokens}/${maxOutputTokens}`
    };
  }

  // Heuristic: If response is suspiciously short compared to maxOutputTokens
  // Rough estimate: 1 token ≈ 4 characters for JSON, so 10% of expected length is suspicious
  const expectedMinLength = (maxOutputTokens * 4) * 0.1;
  if (text.length < expectedMinLength && outputTokens >= maxOutputTokens * 0.9) {
    return {
      isTruncated: true,
      finishReason: finishReason || 'UNKNOWN',
      details: `Response appears truncated: length ${text.length} chars, output tokens ${outputTokens}/${maxOutputTokens}. Finish reason: ${finishReason || 'UNKNOWN'}`
    };
  }

  // Check if JSON appears incomplete (doesn't end with proper closing)
  const trimmedText = text.trim();
  if (!trimmedText.endsWith('}') && !trimmedText.endsWith(']')) {
    return {
      isTruncated: true,
      finishReason: finishReason || 'INCOMPLETE_JSON',
      details: `Response appears incomplete: JSON doesn't end properly. Finish reason: ${finishReason || 'UNKNOWN'}, output tokens: ${outputTokens}/${maxOutputTokens}`
    };
  }

  return {
    isTruncated: false,
    finishReason: finishReason || 'STOP',
    details: `Response appears complete. Finish reason: ${finishReason || 'STOP'}, output tokens: ${outputTokens}/${maxOutputTokens}`
  };
}

/**
 * Validate that a response text appears to be complete JSON
 * @param text The text to validate
 * @returns Object with isValid flag and reason if invalid
 */
function validateResponseCompleteness(text: string): { isValid: boolean; reason?: string } {
  const trimmed = text.trim();
  
  // Must start with { or [
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return { isValid: false, reason: 'Response does not start with { or [' };
  }
  
  // Must end with } or ]
  if (!trimmed.endsWith('}') && !trimmed.endsWith(']')) {
    return { isValid: false, reason: 'Response does not end with } or ]' };
  }
  
  // Basic bracket matching check
  const openBraces = (trimmed.match(/\{/g) || []).length;
  const closeBraces = (trimmed.match(/\}/g) || []).length;
  const openBrackets = (trimmed.match(/\[/g) || []).length;
  const closeBrackets = (trimmed.match(/\]/g) || []).length;
  
  if (openBraces !== closeBraces) {
    return { isValid: false, reason: `Brace mismatch: ${openBraces} open, ${closeBraces} close` };
  }
  
  if (openBrackets !== closeBrackets) {
    return { isValid: false, reason: `Bracket mismatch: ${openBrackets} open, ${closeBrackets} close` };
  }
  
  return { isValid: true };
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
  const modelId = opts.modelId ?? GEMINI_MODEL;
  const MAX_RETRIES = 2;
  const MAX_OUTPUT_TOKENS_CAP = 8192;
  let currentMaxOutputTokens = opts.maxOutputTokens ?? 600;
  
  // Retry loop with exponential backoff on maxOutputTokens
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const model = getModel(opts.system, modelId);
    
    // Build generation config with optional thinking support
    const generationConfig: any = {
      responseMimeType: "application/json",
      responseSchema: opts.schema,
      maxOutputTokens: currentMaxOutputTokens,
    };

    // Add thinking configuration if enabled
    if (opts.enableThinking || opts.thinkingBudget !== undefined) {
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

    if (attempt > 0) {
      console.log(`[GEMINI] Retry attempt ${attempt}/${MAX_RETRIES} with maxOutputTokens=${currentMaxOutputTokens}`);
    }

    let resp;
    try {
      resp = await model.generateContent({
        contents: [{ role: "user", parts: opts.messages }] as any,
        generationConfig,
      });
      console.log(`[GEMINI] API call successful (attempt ${attempt + 1})`);
    } catch (apiError) {
      console.error(`[GEMINI] API call failed (attempt ${attempt + 1}):`, apiError);
      console.error('[GEMINI] API error details:', {
        message: apiError instanceof Error ? apiError.message : String(apiError),
        stack: apiError instanceof Error ? apiError.stack : 'N/A',
        name: apiError instanceof Error ? apiError.name : 'Unknown'
      });
      // Don't retry on API errors (these are different from truncation)
      throw new Error(`Gemini API call failed: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
    }

    let text: string;
    try {
      text = resp.response.text(); // JSON string per schema
      console.log(`[GEMINI] Successfully extracted text from response (attempt ${attempt + 1})`);
    } catch (textError) {
      console.error(`[GEMINI] Failed to extract text from response (attempt ${attempt + 1}):`, textError);
      console.error('[GEMINI] Response object keys:', Object.keys(resp.response || {}));
      console.error('[GEMINI] Response structure:', JSON.stringify(resp.response, null, 2).substring(0, 500));
      // Don't retry on text extraction errors
      throw new Error(`Failed to extract text from Gemini response: ${textError instanceof Error ? textError.message : String(textError)}`);
    }
    
    const usage = resp.response.usageMetadata;
    
    // Log the raw response for debugging
    console.log(`[GEMINI] Raw AI Response length: ${text.length} (attempt ${attempt + 1})`);
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
    
    // Check for truncation using finishReason and response completeness
    const truncationCheck = checkTruncation(resp.response, text, currentMaxOutputTokens);
    console.log(`[GEMINI] Truncation check (attempt ${attempt + 1}):`, truncationCheck.details);
    
    // Validate response completeness
    const completenessCheck = validateResponseCompleteness(text);
    if (!completenessCheck.isValid) {
      console.warn(`[GEMINI] Response completeness check failed (attempt ${attempt + 1}):`, completenessCheck.reason);
    }
    
    // If truncated and we have retries left, retry with increased maxOutputTokens
    if ((truncationCheck.isTruncated || !completenessCheck.isValid) && attempt < MAX_RETRIES) {
      const newMaxOutputTokens = Math.min(currentMaxOutputTokens * 2, MAX_OUTPUT_TOKENS_CAP);
      if (newMaxOutputTokens > currentMaxOutputTokens) {
        console.warn(`[GEMINI] Response truncated or incomplete. Retrying with maxOutputTokens=${newMaxOutputTokens} (was ${currentMaxOutputTokens})`);
        console.warn(`[GEMINI] Finish reason: ${truncationCheck.finishReason}, Completeness: ${completenessCheck.isValid ? 'valid' : completenessCheck.reason}`);
        currentMaxOutputTokens = newMaxOutputTokens;
        continue; // Retry with increased token limit
      }
    }
    
    // If we've exhausted retries or response appears complete, proceed with parsing
    // Check if JSON appears to be truncated (legacy check for fallback handling)
    const trimmedText = text.trim();
    if (!trimmedText.endsWith('}') && !trimmedText.endsWith(']')) {
      console.warn(`⚠️ JSON appears to be truncated (attempt ${attempt + 1}) - attempting to fix`);
    
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
      console.error(`[GEMINI] JSON Parse Error (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, parseError instanceof Error ? parseError.message : String(parseError));
      console.error('[GEMINI] Parse error stack:', parseError instanceof Error ? parseError.stack : 'N/A');
      console.error('[GEMINI] Raw text length:', text.length);
      console.error('[GEMINI] Finish reason:', truncationCheck.finishReason);
      console.error('[GEMINI] Token usage:', {
        outputTokens: usage?.candidatesTokenCount || 0,
        inputTokens: usage?.promptTokenCount || 0,
        totalTokens: usage?.totalTokenCount || 0,
        maxOutputTokens: currentMaxOutputTokens
      });
      
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
        const retryInfo = attempt < MAX_RETRIES ? ` (after ${attempt + 1} attempts)` : ` (after ${attempt + 1} attempts, max retries reached)`;
        const truncationInfo = truncationCheck.isTruncated ? ` Truncation: ${truncationCheck.details}` : '';
        
        // If we have retries left and this looks like a truncation issue (even if finishReason didn't indicate it),
        // retry with increased tokens
        if (attempt < MAX_RETRIES && (parseError.message.includes('Unterminated') || parseError.message.includes('Unexpected end'))) {
          const newMaxOutputTokens = Math.min(currentMaxOutputTokens * 2, MAX_OUTPUT_TOKENS_CAP);
          if (newMaxOutputTokens > currentMaxOutputTokens) {
            console.warn(`[GEMINI] Parse error suggests truncation. Retrying with maxOutputTokens=${newMaxOutputTokens} (was ${currentMaxOutputTokens})`);
            currentMaxOutputTokens = newMaxOutputTokens;
            continue; // Retry with increased token limit
          }
        }
        
        throw new Error(`AI returned invalid JSON${retryInfo}: ${errorDetails}.${truncationInfo} Finish reason: ${truncationCheck.finishReason}`);
      }
    }
  }
  
  // This should never be reached because we return on successful parse or throw on error
  throw new Error('Failed to generate JSON after all retry attempts');
}

/**
 * Generate an image using Gemini image generation model
 * 
 * @param opts Configuration options
 * @param opts.prompt Text prompt describing the image to generate
 * @param opts.referenceImage Optional base64-encoded reference image (for figurine adaptation)
 * @param opts.modelId Model to use (default: GEMINI_IMAGE_MODEL)
 * @returns Promise with image data as base64 string and usage metadata
 */
export async function generateImage(opts: {
  prompt: string;
  referenceImage?: { data: string; mimeType: string };
  modelId?: string;
}): Promise<{ imageData: string; usage: any }> {
  const modelId = opts.modelId ?? GEMINI_IMAGE_MODEL;
  const model = getModel(undefined, modelId);
  
  try {
    console.log(`[GEMINI] Generating image with model: ${modelId}`);
    console.log(`[GEMINI] Prompt: ${opts.prompt.substring(0, 200)}...`);
    
    // Build the parts array for the request
    const parts: any[] = [{ text: opts.prompt }];
    
    // Add reference image if provided
    if (opts.referenceImage) {
      parts.push({
        inlineData: {
          data: opts.referenceImage.data,
          mimeType: opts.referenceImage.mimeType
        }
      });
      console.log(`[GEMINI] Using reference image (${opts.referenceImage.mimeType})`);
    }
    
    // Generate image
    const result = await model.generateContent({
      contents: [{ role: "user", parts }] as any,
    });
    
    // Extract image from response
    // Gemini image generation returns images in the response
    const response = result.response;
    const usage = response.usageMetadata;
    
    // Check if response contains image data
    // The response structure may vary, so we need to handle different formats
    let imageData: string | null = null;
    
    // Try to extract image from candidates
    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      
      // Check for inline data (base64 image)
      if (candidate.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.data) {
            imageData = part.inlineData.data;
            break;
          }
        }
      }
    }
    
    if (!imageData) {
      // If no image data found, try alternative extraction methods
      // Some Gemini models return images differently
      console.warn('[GEMINI] Image data not found in expected location, checking alternative formats...');
      
      // Try to get text response and check if it's base64
      try {
        const textResponse = response.text();
        // If the response is base64-encoded image data, use it
        if (textResponse && textResponse.length > 100) {
          // Check if it looks like base64 image data
          const base64Pattern = /^[A-Za-z0-9+/=]+$/;
          if (base64Pattern.test(textResponse.trim())) {
            imageData = textResponse.trim();
            console.log('[GEMINI] Found image data in text response');
          }
        }
      } catch (e) {
        // Text extraction failed, which is expected for image responses
      }
    }
    
    if (!imageData) {
      throw new Error('No image data found in Gemini response. Response structure may have changed.');
    }
    
    console.log(`[GEMINI] Successfully generated image (${imageData.length} bytes)`);
    console.log('[GEMINI] Token usage:', {
      inputTokens: usage?.promptTokenCount || 0,
      outputTokens: usage?.candidatesTokenCount || 0,
      totalTokens: usage?.totalTokenCount || 0
    });
    
    return { imageData, usage };
  } catch (error) {
    console.error('[GEMINI] Image generation failed:', error);
    throw new Error(`Gemini image generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}