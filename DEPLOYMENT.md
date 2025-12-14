# Band Sync Calendar - Deployment Guide

## 🚀 Pre-Deployment Checklist

### Backend Setup (Cloudflare Workers + D1)

#### 1. Database Setup
- [ ] Create Cloudflare D1 database: `wrangler d1 create band-sync-calendar-db`
- [ ] Update `wrangler.toml` with actual database ID
- [ ] Run schema: `wrangler d1 execute band-sync-calendar-db --file=./src/backend/schema.sql`
- [ ] Verify tables: `wrangler d1 execute band-sync-calendar-db --command="SELECT name FROM sqlite_master WHERE type='table';"`

#### 2. Worker Configuration
- [ ] Update `ALLOWED_ORIGINS` in `wrangler.toml` with your GitHub Pages domain
- [ ] Set environment variables for production
- [ ] Test worker locally: `wrangler dev`
- [ ] Deploy worker: `wrangler deploy --env production`

#### 3. API Testing
- [ ] Test all endpoints with `src/backend/test-api.js`
- [ ] Verify CORS headers work with your domain
- [ ] Test error handling and validation
- [ ] Check rate limiting and security

### Frontend Setup (GitHub Pages)

#### 1. Configuration Updates
- [ ] Update `CONFIG.API_BASE_URL` in `js/config.js` with your worker URL
- [ ] Verify all CDN links are working (FullCalendar)
- [ ] Test offline functionality
- [ ] Validate mobile responsiveness

#### 2. GitHub Pages Setup
- [ ] Enable GitHub Pages in repository settings
- [ ] Set source to `src/frontend` directory or configure build process
- [ ] Configure custom domain (optional)
- [ ] Enable HTTPS
- [ ] Test deployment pipeline

#### 3. Performance Optimization
- [ ] Minify CSS and JavaScript files
- [ ] Optimize images and assets
- [ ] Enable gzip compression
- [ ] Set up proper caching headers
- [ ] Test loading performance

## 🧪 Testing Checklist

### Functional Testing
- [ ] Nickname setup and persistence
- [ ] Calendar view switching (mobile/desktop)
- [ ] Date selection and drawer opening
- [ ] Availability input (○/△/×)
- [ ] Event creation (LIVE/rehearsal/other)
- [ ] Real-time synchronization
- [ ] Holiday display and integration
- [ ] Storage management features
- [ ] Network status indicators

### Cross-Browser Testing
- [ ] Chrome (desktop & mobile)
- [ ] Firefox (desktop & mobile)
- [ ] Safari (desktop & mobile)
- [ ] Edge (desktop)
- [ ] Test on actual mobile devices

### Performance Testing
- [ ] Page load time < 3 seconds
- [ ] Calendar rendering performance
- [ ] Memory usage monitoring
- [ ] Network request optimization
- [ ] Offline functionality
- [ ] Storage usage limits

### Security Testing
- [ ] Input validation and sanitization
- [ ] XSS prevention
- [ ] CORS configuration
- [ ] API rate limiting
- [ ] Data privacy compliance

## 📋 Production Configuration

### Environment Variables
```toml
# wrangler.toml - Production
[env.production.vars]
ALLOWED_ORIGINS = "https://yourusername.github.io,https://your-custom-domain.com"
ENVIRONMENT = "production"
```

### Frontend Configuration
```javascript
// js/config.js - Production
const CONFIG = {
    API_BASE_URL: 'https://your-worker-name.your-subdomain.workers.dev',
    // ... other config
};
```

## 🔧 Monitoring & Maintenance

### Performance Monitoring
- [ ] Set up Cloudflare Analytics
- [ ] Monitor API response times
- [ ] Track error rates
- [ ] Monitor storage usage
- [ ] Set up alerts for issues

### Regular Maintenance
- [ ] Update dependencies monthly
- [ ] Monitor holiday API changes
- [ ] Clean up old cache data
- [ ] Review and update documentation
- [ ] Backup database regularly

## 🚨 Troubleshooting

### Common Issues

#### CORS Errors
- Verify `ALLOWED_ORIGINS` includes your exact domain
- Check protocol (http vs https)
- Ensure OPTIONS requests are handled

**Current Configuration Example:**
```toml
[env.production.vars]
ALLOWED_ORIGINS = "https://cooooookai.github.io,https://cooooookai.github.io/band-sync-calendar"
ENVIRONMENT = "production"
```

**Fix Steps:**
1. Update `wrangler.toml` with correct GitHub Pages URL
2. Redeploy: `wrangler deploy --env production`
3. Test CORS: `node verify-deployment.js`

#### Database Connection Issues
- Verify database ID in `wrangler.toml`
- Check D1 binding configuration
- Test database queries manually

#### Calendar Not Loading
- Check FullCalendar CDN links
- Verify API responses
- Check browser console for errors
- Test network connectivity

#### Mobile Issues
- Test touch interactions
- Verify responsive design
- Check iOS Safari compatibility
- Test drawer functionality

## 📊 Success Metrics

### Performance Targets
- Page load time: < 3 seconds
- Time to interactive: < 5 seconds
- Calendar render time: < 1 second
- API response time: < 500ms
- Mobile performance score: > 90

### User Experience Targets
- Mobile usability score: > 95
- Accessibility score: > 90
- Cross-browser compatibility: 100%
- Offline functionality: Working
- Data synchronization: < 60 seconds

## 🔄 Deployment Process

### 1. Pre-deployment
```bash
# Run tests
npm test

# Check for issues
npm run lint

# Build optimized version (if applicable)
npm run build
```

### 2. Backend Deployment
```bash
# Deploy database schema
wrangler d1 execute band-sync-calendar-db --file=./src/backend/schema.sql

# Deploy worker
wrangler deploy --env production

# Test deployment
node src/backend/test-api.js
```

### 3. Frontend Deployment
```bash
# Deploy to GitHub Pages
git push origin main

# Or manual deployment
npm run deploy
```

### 4. Post-deployment Verification
- [ ] Test all functionality end-to-end
- [ ] Verify synchronization between multiple users
- [ ] Check mobile experience
- [ ] Monitor for errors in first 24 hours

## 📞 Support & Documentation

### User Documentation
- [ ] Create user guide in Japanese
- [ ] Document common workflows
- [ ] Provide troubleshooting tips
- [ ] Create video tutorials (optional)

### Developer Documentation
- [ ] API documentation
- [ ] Architecture overview
- [ ] Contribution guidelines
- [ ] Deployment procedures

---

## ✅ Final Deployment Verification

Once deployed, verify these critical paths:

1. **New User Flow**: Visit site → Enter nickname → See calendar → Create availability → Create event
2. **Returning User Flow**: Visit site → See existing data → Sync works → Offline/online transitions
3. **Multi-User Flow**: Two users → Create overlapping events → See real-time updates
4. **Mobile Flow**: Use on mobile → Touch interactions work → Drawer functions properly
5. **Holiday Integration**: View calendar → See Japanese holidays → Holiday details work

**Deployment is complete when all checkboxes are ✅ and critical paths work flawlessly!**