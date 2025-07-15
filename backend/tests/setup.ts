import dotenv from 'dotenv';

// Load environment variables for testing
dotenv.config({ path: '.env.test' });

// Set test timeouts for LLM calls
jest.setTimeout(30000);