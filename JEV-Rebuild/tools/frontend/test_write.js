import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the base directory for the UI project
const BASE_DIR = path.join(__dirname, '../../ui-core/app');

console.log('=== Test Write Script ===');
console.log('Base directory:', BASE_DIR);
console.log('Current working directory:', process.cwd());

// Test writing to a test file
const testFilePath = path.join(BASE_DIR, 'test.txt');
const testContent = 'Test content written on ' + new Date().toISOString();

try {
  fs.writeFileSync(testFilePath, testContent, 'utf8');
  console.log('Successfully wrote to:', testFilePath);
  
  // Read back the file to verify
  const readContent = fs.readFileSync(testFilePath, 'utf8');
  console.log('Read back content:', readContent);
  
  // Delete the test file
  fs.unlinkSync(testFilePath);
  console.log('Deleted test file:', testFilePath);
  
  console.log('=== Test Completed Successfully ===');
} catch (error) {
  console.error('Error during test:', error);
}