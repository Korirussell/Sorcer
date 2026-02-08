# Demo Flow Test Checklist

## Expected Flow
1. Homepage (/) → Type prompt → Submit
2. Navigate to /chat/[id]
3. Optimization sequence plays (cache_check → compressing → routing → map → generating)
4. Response streams in character by character
5. Breakdown popup appears immediately with:
   - Real US map (RouteMapViz) zoomed Atlanta → destination
   - Server comparison bars
   - Before/after prompt compression
   - Carbon stats (% saved, clean energy %, model, latency)
   - Link to full breakdown page

## Current Status

### ✅ Working Components
- Backend server running on :8000
- Frontend dev server running on :3000
- RouteMapViz component exists with error handling
- ServerComparison component defined
- Breakdown popup logic in place (line 766)
- All required components in breakdown popup (lines 986-1115)

### 🔍 To Verify
1. Homepage submit actually navigates to /chat/[id]
2. sessionStorage pending query works
3. Optimization sequence animations play
4. Breakdown popup shows after streaming
5. All buttons work (navigation, close, etc.)

### 🐛 Potential Issues
- RouteMapViz may fail to load topojson (now has error handling)
- Breakdown popup may not trigger if lastCarbonMeta is null
- Navigation buttons may have broken onClick handlers
