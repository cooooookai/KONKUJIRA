/**
 * Validation Tests for Band Sync Calendar API
 * 
 * Tests various validation scenarios including:
 * - CORS handling
 * - Input validation
 * - Error responses
 * - Security measures
 */

const API_BASE_URL = 'https://your-worker-name.your-subdomain.workers.dev';

/**
 * Test CORS preflight request
 */
async function testCORS() {
  console.log('\n🔒 Testing CORS Configuration');
  
  const response = await fetch(`${API_BASE_URL}/events`, {
    method: 'OPTIONS',
    headers: {
      'Origin': 'https://example.github.io',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type'
    }
  });
  
  console.log('CORS Headers:', Object.fromEntries(response.headers.entries()));
  console.log('Status:', response.status);
}

/**
 * Test input validation scenarios
 */
async function testValidation() {
  console.log('\n✅ Testing Input Validation');
  
  // Test cases for validation
  const testCases = [
    {
      name: 'Missing required fields',
      endpoint: '/events',
      data: { title: 'Test' } // Missing other required fields
    },
    {
      name: 'Invalid event type',
      endpoint: '/events',
      data: {
        title: 'Test Event',
        type: 'invalid_type',
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 3600000).toISOString(),
        created_by: 'Test User'
      }
    },
    {
      name: 'Invalid time range (end before start)',
      endpoint: '/events',
      data: {
        title: 'Test Event',
        type: 'live',
        start_time: new Date(Date.now() + 3600000).toISOString(),
        end_time: new Date().toISOString(),
        created_by: 'Test User'
      }
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📝 ${testCase.name}`);
    
    const response = await fetch(`${API_BASE_URL}${testCase.endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testCase.data)
    });
    
    const result = await response.json();
    console.log(`Status: ${response.status}, Error: ${result.error}`);
  }
}

// Export for use in other test files
export { testCORS, testValidation };