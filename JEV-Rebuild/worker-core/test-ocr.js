// Test script to verify Google Vision API integration
const workerUrl = 'https://jev-rebuild-worker.bensonlove1986.workers.dev';
const testImageUrl = 'https://jev-rebuild-worker.bensonlove1986.workers.dev/images/1769465946823-f971a8a2-f781-4bc7-8c7f-21df446e1b15.png';

async function testOCRFunctionality() {
  try {
    console.log('Testing OCR functionality...');
    console.log('Worker URL:', workerUrl);
    console.log('Test image URL:', testImageUrl);
    
    // Test the vision API endpoint
    const response = await fetch(`${workerUrl}/api/vision/text-detection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageUrl: testImageUrl
      })
    });
    
    console.log('Response status:', response.status);
    console.log('Response status text:', response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Success!');
      console.log('OCR response:', JSON.stringify(data, null, 2));
    } else {
      console.log('Failed to test OCR');
      try {
        const errorText = await response.text();
        console.log('Error response:', errorText);
      } catch (e) {
        console.log('Failed to read error response:', e);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testOCRFunctionality();
