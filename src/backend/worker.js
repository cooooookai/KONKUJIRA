/**
 * Band Sync Calendar - Cloudflare Worker API
 * 
 * Provides REST API endpoints for band calendar synchronization
 * - GET/POST /events - Manage shared events (performances, rehearsals)
 * - GET/POST /availability - Manage member availability (○/△/×)
 */

/**
 * Get CORS headers based on environment and origin
 */
function getCORSHeaders(request, env) {
  const origin = request.headers.get('Origin');
  const allowedOrigins = env.ALLOWED_ORIGINS || '*';
  
  // In production, check against allowed origins
  let allowOrigin = '*';
  if (allowedOrigins !== '*') {
    const origins = allowedOrigins.split(',').map(o => o.trim());
    allowOrigin = origins.includes(origin) ? origin : 'null';
  }
  
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'false',
  };
}

/**
 * Handle CORS preflight requests
 */
function handleCORS(request, env) {
  return new Response(null, {
    status: 204,
    headers: getCORSHeaders(request, env)
  });
}

/**
 * Create error response with CORS headers
 */
function errorResponse(message, status = 400, request = null, env = null) {
  const corsHeaders = request && env ? getCORSHeaders(request, env) : {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  };
  
  return new Response(JSON.stringify({ 
    error: message,
    timestamp: new Date().toISOString()
  }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

/**
 * Create success response with CORS headers
 */
function successResponse(data, status = 200, request = null, env = null) {
  const corsHeaders = request && env ? getCORSHeaders(request, env) : {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  };
  
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

/**
 * Validate time range (start < end)
 */
function validateTimeRange(startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid date format. Use ISO 8601 format.');
  }
  
  if (start >= end) {
    throw new Error('Start time must be before end time.');
  }
  
  return { start, end };
}

/**
 * Validate sync period (today to +2 months)
 */
function validateSyncPeriod(dateTime) {
  const date = new Date(dateTime);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today
  
  const twoMonthsFromNow = new Date();
  twoMonthsFromNow.setMonth(today.getMonth() + 2);
  twoMonthsFromNow.setHours(23, 59, 59, 999); // End of day
  
  if (date < today || date > twoMonthsFromNow) {
    throw new Error('Date must be within sync period (today to +2 months).');
  }
}

/**
 * Validate and sanitize string input
 */
function validateString(value, fieldName, minLength = 1, maxLength = 255) {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }
  
  const trimmed = value.trim();
  if (trimmed.length < minLength) {
    throw new Error(`${fieldName} must be at least ${minLength} characters`);
  }
  
  if (trimmed.length > maxLength) {
    throw new Error(`${fieldName} must be no more than ${maxLength} characters`);
  }
  
  // Basic XSS prevention
  if (/<script|javascript:|on\w+=/i.test(trimmed)) {
    throw new Error(`${fieldName} contains invalid characters`);
  }
  
  return trimmed;
}

/**
 * Validate request content type
 */
function validateContentType(request) {
  const contentType = request.headers.get('Content-Type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Content-Type must be application/json');
  }
}

/**
 * Validate request body size
 */
async function validateRequestBody(request, maxSize = 1024 * 10) { // 10KB max
  const body = await request.text();
  
  if (body.length > maxSize) {
    throw new Error(`Request body too large. Maximum ${maxSize} bytes allowed.`);
  }
  
  try {
    return JSON.parse(body);
  } catch (error) {
    throw new Error('Invalid JSON in request body');
  }
}

/**
 * GET /events - Retrieve events for date range
 */
async function getEvents(request, env) {
  const url = new URL(request.url);
  const start = url.searchParams.get('start');
  const end = url.searchParams.get('end');
  
  if (!start || !end) {
    return errorResponse('Missing required parameters: start, end', 400, request, env);
  }
  
  try {
    validateTimeRange(start, end);
    
    const query = `
      SELECT id, title, type, start_time, end_time, created_by, created_at
      FROM events 
      WHERE start_time <= ? AND end_time >= ?
      ORDER BY start_time ASC
      LIMIT 1000
    `;
    
    const { results } = await env.DB.prepare(query)
      .bind(end, start)
      .all();
    
    // Transform to FullCalendar format
    const events = results.map(event => ({
      id: event.id,
      title: event.title,
      start: event.start_time,
      end: event.end_time,
      extendedProps: {
        type: event.type,
        createdBy: event.created_by,
        createdAt: event.created_at
      },
      classNames: [`event-${event.type}`]
    }));
    
    return successResponse(events, 200, request, env);
  } catch (error) {
    return errorResponse(error.message, 400, request, env);
  }
}

/**
 * POST /events - Create new event
 */
async function createEvent(request, env) {
  try {
    // Validate content type
    validateContentType(request);
    
    // Validate and parse request body
    const body = await validateRequestBody(request);
    const { title, type, start_time, end_time, created_by } = body;
    
    // Validate required fields
    if (!title || !type || !start_time || !end_time || !created_by) {
      return errorResponse('Missing required fields: title, type, start_time, end_time, created_by', 400, request, env);
    }
    
    // Validate and sanitize string fields
    const sanitizedTitle = validateString(title, 'title', 1, 100);
    const sanitizedCreatedBy = validateString(created_by, 'created_by', 1, 50);
    
    // Validate event type
    if (!['live', 'rehearsal', 'other'].includes(type)) {
      return errorResponse('Invalid event type. Must be: live, rehearsal, or other', 400, request, env);
    }
    
    // Validate time range
    validateTimeRange(start_time, end_time);
    
    // Validate sync period
    validateSyncPeriod(start_time);
    
    // Insert event
    const query = `
      INSERT INTO events (title, type, start_time, end_time, created_by)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const result = await env.DB.prepare(query)
      .bind(sanitizedTitle, type, start_time, end_time, sanitizedCreatedBy)
      .run();
    
    if (!result.success) {
      return errorResponse('Failed to create event', 500, request, env);
    }
    
    return successResponse({ 
      id: result.meta.last_row_id,
      message: 'Event created successfully' 
    }, 201, request, env);
    
  } catch (error) {
    return errorResponse(error.message, 400, request, env);
  }
}

/**
 * GET /availability - Retrieve availability for date range
 */
async function getAvailability(request, env) {
  const url = new URL(request.url);
  const start = url.searchParams.get('start');
  const end = url.searchParams.get('end');
  
  if (!start || !end) {
    return errorResponse('Missing required parameters: start, end', 400, request, env);
  }
  
  try {
    validateTimeRange(start, end);
    
    const query = `
      SELECT id, member_name, start_time, end_time, status, updated_at
      FROM availability 
      WHERE start_time <= ? AND end_time >= ?
      ORDER BY start_time ASC, member_name ASC
      LIMIT 1000
    `;
    
    const { results } = await env.DB.prepare(query)
      .bind(end, start)
      .all();
    
    // Transform to FullCalendar format
    const availability = results.map(avail => ({
      id: avail.id,
      title: `${avail.member_name}: ${getStatusSymbol(avail.status)}`,
      start: avail.start_time,
      end: avail.end_time,
      display: 'background',
      extendedProps: {
        memberName: avail.member_name,
        status: avail.status,
        updatedAt: avail.updated_at
      },
      classNames: [`availability-${avail.status}`]
    }));
    
    return successResponse(availability, 200, request, env);
  } catch (error) {
    return errorResponse(error.message, 400, request, env);
  }
}

/**
 * POST /availability - Upsert availability data
 */
async function upsertAvailability(request, env) {
  try {
    // Validate content type
    validateContentType(request);
    
    // Validate and parse request body
    const body = await validateRequestBody(request);
    const { member_name, start_time, end_time, status } = body;
    
    // Validate required fields
    if (!member_name || !start_time || !end_time || !status) {
      return errorResponse('Missing required fields: member_name, start_time, end_time, status', 400, request, env);
    }
    
    // Validate and sanitize member name
    const sanitizedMemberName = validateString(member_name, 'member_name', 1, 50);
    
    // Validate status
    if (!['good', 'ok', 'bad'].includes(status)) {
      return errorResponse('Invalid status. Must be: good, ok, or bad', 400, request, env);
    }
    
    // Validate time range
    validateTimeRange(start_time, end_time);
    
    // Validate sync period
    validateSyncPeriod(start_time);
    
    // Upsert availability (INSERT OR REPLACE for SQLite)
    const query = `
      INSERT OR REPLACE INTO availability (member_name, start_time, end_time, status)
      VALUES (?, ?, ?, ?)
    `;
    
    const result = await env.DB.prepare(query)
      .bind(sanitizedMemberName, start_time, end_time, status)
      .run();
    
    if (!result.success) {
      return errorResponse('Failed to save availability', 500, request, env);
    }
    
    return successResponse({ 
      message: 'Availability saved successfully' 
    }, 201, request, env);
    
  } catch (error) {
    return errorResponse(error.message, 400, request, env);
  }
}

/**
 * Convert status to Japanese symbol
 */
function getStatusSymbol(status) {
  const symbols = {
    'good': '○',
    'ok': '△', 
    'bad': '×'
  };
  return symbols[status] || status;
}

/**
 * Main request handler
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method;
    const pathname = url.pathname;
    
    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return handleCORS(request, env);
    }
    
    // Route requests
    try {
      if (pathname === '/events') {
        if (method === 'GET') {
          return await getEvents(request, env);
        } else if (method === 'POST') {
          return await createEvent(request, env);
        }
      } else if (pathname === '/availability') {
        if (method === 'GET') {
          return await getAvailability(request, env);
        } else if (method === 'POST') {
          return await upsertAvailability(request, env);
        }
      } else if (pathname === '/') {
        return successResponse({ 
          message: 'Band Sync Calendar API',
          version: '1.0.0',
          endpoints: [
            'GET/POST /events',
            'GET/POST /availability'
          ]
        }, 200, request, env);
      }
      
      return errorResponse('Not Found', 404, request, env);
    } catch (error) {
      console.error('Unhandled error:', error);
      return errorResponse('Internal Server Error', 500, request, env);
    }
  }
};