// Simple Node.js script to test cursor advancement using ES modules
import fetch from 'node-fetch';

const API_URL = 'https://jev-rebuild-worker.bensonlove1986.workers.dev';
const ENDPOINT = '/api/inbox/pull';

async function makeRequest(since, pollNumber) {
    console.log(`[Poll ${pollNumber}] Making request with since=${since}`);
    
    try {
        const response = await fetch(`${API_URL}${ENDPOINT}?since=${since}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        console.log(`[Poll ${pollNumber}] Response: since=${since}, cursor=${data.cursor || 0}, messages=${data.messages?.length || 0}`);
        return data;
    } catch (error) {
        console.error(`[Poll ${pollNumber}] Request error: ${error.message}`);
        throw error;
    }
}

async function runTest() {
    console.log('Starting Cursor Advancement Test...');
    
    try {
        // First request with since=0
        const result1 = await makeRequest(0, 1);
        const poll_1_since = 0;
        const cursor1 = result1.cursor || 0;
        
        // Second request with since from first response
        const result2 = await makeRequest(cursor1, 2);
        const poll_2_since = cursor1;
        const cursor2 = result2.cursor || 0;
        
        // Third request with since from second response
        const result3 = await makeRequest(cursor2, 3);
        const poll_3_since = cursor2;
        const cursor3 = result3.cursor || 0;
        
        // Verify cursor advancement
        const cursor_advancing = cursor1 < cursor2 && cursor2 <= cursor3;
        
        // Final result in required JSON format
        const finalResult = {
            poll_1_since: poll_1_since,
            poll_2_since: poll_2_since,
            poll_3_since: poll_3_since,
            cursor_advancing: cursor_advancing
        };
        
        console.log('\nFinal Result:');
        console.log(JSON.stringify(finalResult, null, 2));
        
        // Check if cursor is stuck at 0 on second poll
        if (poll_2_since === 0) {
            console.error('[UI][FATAL] inboxCursor stuck at 0');
            process.exit(1);
        }
        
        return finalResult;
    } catch (error) {
        console.error('Test failed:', error.message);
        process.exit(1);
    }
}

// Run the test
runTest();