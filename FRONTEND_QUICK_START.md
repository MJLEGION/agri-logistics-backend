# Frontend Quick Start - 5 Minute Setup

## Step 1: Copy Service File (30 seconds)

Copy the `locationService.js` content from `FRONTEND_INTEGRATION_GUIDE.md` to your frontend:

```
your-frontend/
├── src/
│   └── services/
│       └── locationService.js  ← Create this file
```

## Step 2: Copy Hooks (1 minute)

Create three hook files:

1. **`hooks/useLocation.js`** - Real-time GPS tracking
2. **`hooks/useNearbySearch.js`** - Nearby search functionality
3. **`hooks/useDistance.js`** - Distance calculations

(Copy from FRONTEND_INTEGRATION_GUIDE.md)

## Step 3: Copy Components (2 minutes)

Create three components:

1. **`components/RealTimeTracking.jsx`** - Start/stop tracking UI
2. **`components/NearbySearch.jsx`** - Search nearby items
3. **`components/DeliveryMap.jsx`** - Google Maps integration

(Copy from FRONTEND_INTEGRATION_GUIDE.md)

## Step 4: Setup Environment (30 seconds)

Create `.env.local`:

```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

## Step 5: Add Google Maps Script

In `public/index.html`:

```html
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY"></script>
```

## Step 6: Use in Your Page

```javascript
import { DeliveryPage } from "./pages/DeliveryPage";

export default function App() {
  return <DeliveryPage orderId="order123" />;
}
```

---

## That's It!

Your frontend now has:

- Real-time GPS tracking
- Nearby item search
- Live delivery map
- Distance & ETA calculations

---

## API Endpoints Used

All endpoints require a valid JWT token in the `Authorization` header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Main Endpoints

| Endpoint                        | Method | Purpose              |
| ------------------------------- | ------ | -------------------- |
| `/location/update-location`     | POST   | Update GPS location  |
| `/location/nearby-cargo`        | GET    | Find cargo nearby    |
| `/location/nearby-transporters` | GET    | Find transporters    |
| `/location/nearby-orders`       | GET    | Find orders nearby   |
| `/location/distance`            | POST   | Calculate distance   |
| `/location/history/:id`         | GET    | Get location history |
| `/location/active`              | GET    | Get active locations |

---

## Testing Without Frontend

Test API endpoints directly with curl:

```bash
# Find nearby transporters
curl "http://localhost:5000/api/location/nearby-transporters?latitude=1.9536&longitude=29.8739&radiusKm=50" \
  -H "Authorization: Bearer TOKEN"

# Update location
curl -X POST http://localhost:5000/api/location/update-location \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"latitude":1.9536,"longitude":29.8739,"speed":45,"orderId":"order123"}'

# Calculate distance
curl -X POST http://localhost:5000/api/location/distance \
  -H "Content-Type: application/json" \
  -d '{"lat1":1.9536,"lon1":29.8739,"lat2":1.9366,"lon2":29.8512}'
```

---

## File Structure After Setup

```
your-frontend/
├── public/
│   └── index.html
│       └── <script src="https://maps.googleapis.com/maps/api/js?..."></script>
│
├── src/
│   ├── services/
│   │   └── locationService.js
│   │
│   ├── hooks/
│   │   ├── useLocation.js
│   │   ├── useNearbySearch.js
│   │   └── useDistance.js
│   │
│   ├── components/
│   │   ├── RealTimeTracking.jsx
│   │   ├── RealTimeTracking.module.css
│   │   ├── NearbySearch.jsx
│   │   ├── NearbySearch.module.css
│   │   └── DeliveryMap.jsx
│   │
│   ├── pages/
│   │   └── DeliveryPage.jsx
│   │
│   ├── App.jsx
│   └── index.js
│
├── .env.local
└── package.json
```

---

## Common Issues & Fixes

### Issue: "API_URL is undefined"

**Fix:** Add to `.env.local`:

```
REACT_APP_API_URL=http://localhost:5000/api
```

### Issue: "Location permission denied"

**Fix:** User must grant location permission in browser

### Issue: "401 Unauthorized"

**Fix:** Token expired - refresh or re-login

### Issue: Map not displaying

**Fix:**

1. Verify Google Maps API key is valid
2. Add script to `index.html`
3. Check browser console for errors

---

## Integration Example - Complete Page

```javascript
import React from "react";
import { RealTimeTracking } from "../components/RealTimeTracking";
import { NearbySearch } from "../components/NearbySearch";
import { DeliveryMap } from "../components/DeliveryMap";
import { useDistance } from "../hooks/useDistance";

export function DeliveryPage({ orderId }) {
  const [location, setLocation] = React.useState(null);
  const { distance, calculate } = useDistance();

  const handleLocationUpdate = (newLocation) => {
    setLocation(newLocation);

    // Calculate distance to destination
    calculate(
      newLocation.latitude,
      newLocation.longitude,
      1.9536, // Destination lat
      29.8739 // Destination lon
    );
  };

  return (
    <div
      style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}
    >
      <div>
        <RealTimeTracking
          orderId={orderId}
          onLocationUpdate={handleLocationUpdate}
        />
        {distance && (
          <div
            style={{
              marginTop: "20px",
              padding: "15px",
              border: "1px solid #ddd",
            }}
          >
            <p>Distance: {distance.distanceKm?.toFixed(1)} km</p>
            <p>ETA: {distance.etaMinutes?.toFixed(0)} minutes</p>
          </div>
        )}
        <NearbySearch userLocation={location} />
      </div>
      <div>
        <DeliveryMap
          transporterLocation={location}
          pickupLocation={{ latitude: 1.9366, longitude: 29.8512 }}
          deliveryLocation={{ latitude: 1.9536, longitude: 29.8739 }}
        />
      </div>
    </div>
  );
}
```

---

## Next: Advanced Features

Once basic integration works, you can add:

1. **Redux State Management** - For complex apps (see guide)
2. **Real-time Updates** - WebSocket instead of polling
3. **Geofencing** - Alert when entering/leaving areas
4. **Route Optimization** - Calculate best delivery routes
5. **Ratings & Reviews** - After delivery complete

---

## Support & Documentation

- Full Guide: `FRONTEND_INTEGRATION_GUIDE.md`
- Testing: `LOCATION_TESTING_GUIDE.md`
- API Reference: `LOCATION_QUICK_REFERENCE.md`
- Architecture: `MAP_IMPLEMENTATION_SUMMARY.md`
- Backend Implementation: `LOCATION_TRACKING_IMPLEMENTATION.md`

---

**Ready to start?** Follow the 5 steps above!
