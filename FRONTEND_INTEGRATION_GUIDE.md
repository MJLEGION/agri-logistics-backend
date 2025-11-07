# Frontend Integration Guide - Location Tracking & Geospatial Features

## Overview

This guide explains how to integrate the backend's location tracking and geospatial features into your React frontend. All examples use modern React patterns (hooks, context, and async/await).

---

## Part 1: API Service Layer Setup

### 1.1 Create Location Service

Create `services/locationService.js`:

```javascript
// services/locationService.js
const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000/api";

class LocationService {
  constructor() {
    this.token = localStorage.getItem("token");
  }

  setToken(token) {
    this.token = token;
  }

  async request(endpoint, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}/location${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "API Error");
    }

    return response.json();
  }

  // ===== Location Tracking =====

  async updateLocation(latitude, longitude, metadata = {}) {
    return this.request("/update-location", {
      method: "POST",
      body: JSON.stringify({
        latitude,
        longitude,
        address: metadata.address,
        speed: metadata.speed,
        accuracy: metadata.accuracy,
        heading: metadata.heading,
        orderId: metadata.orderId,
      }),
    });
  }

  async getLocationHistory(transporterId, filters = {}) {
    const params = new URLSearchParams({
      limit: filters.limit || 100,
      offset: filters.offset || 0,
      ...(filters.orderId && { orderId: filters.orderId }),
    });

    return this.request(`/history/${transporterId}?${params}`);
  }

  async getActiveLocations() {
    return this.request("/active");
  }

  async stopTracking(transporterId) {
    return this.request("/stop-tracking", {
      method: "POST",
      body: JSON.stringify({ transporterId }),
    });
  }

  // ===== Nearby Search =====

  async findNearbyCargo(latitude, longitude, radiusKm = 50) {
    const params = new URLSearchParams({
      latitude,
      longitude,
      radiusKm,
    });

    return this.request(`/nearby-cargo?${params}`);
  }

  async findNearbyTransporters(latitude, longitude, radiusKm = 50) {
    const params = new URLSearchParams({
      latitude,
      longitude,
      radiusKm,
    });

    return this.request(`/nearby-transporters?${params}`);
  }

  async findNearbyOrders(latitude, longitude, radiusKm = 50) {
    const params = new URLSearchParams({
      latitude,
      longitude,
      radiusKm,
    });

    return this.request(`/nearby-orders?${params}`);
  }

  async searchCargo(latitude, longitude, filters = {}) {
    return this.request("/search-cargo", {
      method: "POST",
      body: JSON.stringify({
        latitude,
        longitude,
        radiusKm: filters.radiusKm || 50,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        cropType: filters.cropType,
      }),
    });
  }

  // ===== Calculations =====

  async calculateDistance(lat1, lon1, lat2, lon2) {
    return this.request("/distance", {
      method: "POST",
      body: JSON.stringify({
        lat1,
        lon1,
        lat2,
        lon2,
      }),
    });
  }

  async getBounds(latitude, longitude, radiusKm) {
    const params = new URLSearchParams({
      latitude,
      longitude,
      radiusKm,
    });

    return this.request(`/bounds?${params}`);
  }
}

export default new LocationService();
```

---

## Part 2: React Hooks for Location Management

### 2.1 useLocation Hook - Real-Time Tracking

Create `hooks/useLocation.js`:

```javascript
// hooks/useLocation.js
import { useState, useEffect, useRef, useCallback } from "react";
import locationService from "../services/locationService";

export const useLocation = (enabled = false, orderId = null) => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const watchIdRef = useRef(null);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }

    setLoading(true);

    // Watch position - updates continuously
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const speed = position.coords.speed || 0; // in m/s, convert to km/h
        const heading = position.coords.heading || 0;

        try {
          // Update location on backend
          const response = await locationService.updateLocation(
            latitude,
            longitude,
            {
              accuracy,
              speed: speed * 3.6, // Convert m/s to km/h
              heading,
              orderId,
            }
          );

          setLocation({
            latitude,
            longitude,
            accuracy,
            speed: speed * 3.6,
            heading,
            timestamp: new Date(),
            ...response.data,
          });

          setError(null);
          setLoading(false);
        } catch (err) {
          setError(err.message);
          setLoading(false);
        }
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000, // Use cached position if < 5 seconds
        timeout: 10000,
      }
    );
  }, [orderId]);

  const stopTracking = useCallback(async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (location?.transporterId) {
      try {
        await locationService.stopTracking(location.transporterId);
      } catch (err) {
        console.error("Error stopping tracking:", err);
      }
    }
  }, [location]);

  useEffect(() => {
    if (enabled) {
      startTracking();
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [enabled, startTracking]);

  return {
    location,
    error,
    loading,
    startTracking,
    stopTracking,
  };
};
```

### 2.2 useNearbySearch Hook

Create `hooks/useNearbySearch.js`:

```javascript
// hooks/useNearbySearch.js
import { useState, useCallback } from "react";
import locationService from "../services/locationService";

export const useNearbySearch = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchNearby = useCallback(
    async (
      type = "cargo", // 'cargo', 'transporters', 'orders'
      latitude,
      longitude,
      radiusKm = 50
    ) => {
      setLoading(true);
      setError(null);

      try {
        let response;

        switch (type) {
          case "cargo":
            response = await locationService.findNearbyCargo(
              latitude,
              longitude,
              radiusKm
            );
            break;
          case "transporters":
            response = await locationService.findNearbyTransporters(
              latitude,
              longitude,
              radiusKm
            );
            break;
          case "orders":
            response = await locationService.findNearbyOrders(
              latitude,
              longitude,
              radiusKm
            );
            break;
          default:
            throw new Error("Invalid search type");
        }

        setResults(response.data || []);
      } catch (err) {
        setError(err.message);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    results,
    loading,
    error,
    searchNearby,
  };
};
```

### 2.3 useDistance Hook

Create `hooks/useDistance.js`:

```javascript
// hooks/useDistance.js
import { useState, useCallback } from "react";
import locationService from "../services/locationService";

export const useDistance = () => {
  const [distance, setDistance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const calculate = useCallback(async (lat1, lon1, lat2, lon2) => {
    setLoading(true);
    setError(null);

    try {
      const response = await locationService.calculateDistance(
        lat1,
        lon1,
        lat2,
        lon2
      );

      setDistance(response.data);
    } catch (err) {
      setError(err.message);
      setDistance(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    distance,
    loading,
    error,
    calculate,
  };
};
```

---

## Part 3: React Components

### 3.1 Real-Time Tracking Component

Create `components/RealTimeTracking.jsx`:

```javascript
// components/RealTimeTracking.jsx
import React, { useState, useEffect } from "react";
import { useLocation } from "../hooks/useLocation";
import styles from "./RealTimeTracking.module.css";

export const RealTimeTracking = ({ orderId, onLocationUpdate }) => {
  const { location, error, loading, startTracking, stopTracking } = useLocation(
    false,
    orderId
  );
  const [isTracking, setIsTracking] = useState(false);

  const handleStartTracking = () => {
    startTracking();
    setIsTracking(true);
  };

  const handleStopTracking = () => {
    stopTracking();
    setIsTracking(false);
  };

  useEffect(() => {
    if (location && onLocationUpdate) {
      onLocationUpdate(location);
    }
  }, [location, onLocationUpdate]);

  return (
    <div className={styles.container}>
      <h3>Real-Time Tracking</h3>

      {error && <div className={styles.error}>Error: {error}</div>}

      {loading && <div className={styles.loading}>Getting location...</div>}

      {location && (
        <div className={styles.locationInfo}>
          <p>
            <strong>Latitude:</strong> {location.latitude.toFixed(4)}
          </p>
          <p>
            <strong>Longitude:</strong> {location.longitude.toFixed(4)}
          </p>
          <p>
            <strong>Accuracy:</strong> {location.accuracy.toFixed(0)}m
          </p>
          <p>
            <strong>Speed:</strong> {location.speed?.toFixed(1) || 0} km/h
          </p>
          <p>
            <strong>Heading:</strong> {location.heading?.toFixed(0) || 0}°
          </p>
          <p>
            <strong>Last Updated:</strong>{" "}
            {location.timestamp?.toLocaleTimeString()}
          </p>
        </div>
      )}

      <div className={styles.buttons}>
        <button
          onClick={handleStartTracking}
          disabled={isTracking}
          className={styles.startBtn}
        >
          Start Tracking
        </button>
        <button
          onClick={handleStopTracking}
          disabled={!isTracking}
          className={styles.stopBtn}
        >
          Stop Tracking
        </button>
      </div>
    </div>
  );
};
```

CSS Module (`RealTimeTracking.module.css`):

```css
.container {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  background: #f9f9f9;
}

.error {
  background-color: #f8d7da;
  color: #721c24;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 10px;
}

.loading {
  background-color: #d1ecf1;
  color: #0c5460;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 10px;
}

.locationInfo {
  background: white;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 15px;
  font-size: 14px;
}

.locationInfo p {
  margin: 8px 0;
}

.buttons {
  display: flex;
  gap: 10px;
}

.startBtn,
.stopBtn {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.startBtn {
  background-color: #28a745;
  color: white;
}

.startBtn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.stopBtn {
  background-color: #dc3545;
  color: white;
}

.stopBtn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
```

### 3.2 Nearby Search Component

Create `components/NearbySearch.jsx`:

```javascript
// components/NearbySearch.jsx
import React, { useState, useEffect } from "react";
import { useNearbySearch } from "../hooks/useNearbySearch";
import styles from "./NearbySearch.module.css";

export const NearbySearch = ({ userLocation }) => {
  const { results, loading, error, searchNearby } = useNearbySearch();
  const [searchType, setSearchType] = useState("cargo");
  const [radiusKm, setRadiusKm] = useState(50);

  useEffect(() => {
    if (userLocation) {
      handleSearch();
    }
  }, []);

  const handleSearch = () => {
    if (userLocation) {
      searchNearby(
        searchType,
        userLocation.latitude,
        userLocation.longitude,
        radiusKm
      );
    }
  };

  return (
    <div className={styles.container}>
      <h3>Search Nearby</h3>

      <div className={styles.controls}>
        <select
          value={searchType}
          onChange={(e) => setSearchType(e.target.value)}
        >
          <option value="cargo">Nearby Cargo</option>
          <option value="transporters">Nearby Transporters</option>
          <option value="orders">Nearby Orders</option>
        </select>

        <input
          type="number"
          value={radiusKm}
          onChange={(e) => setRadiusKm(Number(e.target.value))}
          min="1"
          max="500"
          placeholder="Radius (km)"
        />

        <button onClick={handleSearch} disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.results}>
        {results.length === 0 ? (
          <p>No results found</p>
        ) : (
          <ul>
            {results.map((item, index) => (
              <li key={index} className={styles.resultItem}>
                <h4>{item.name || item.cropName || "Item"}</h4>
                <p>Distance: {item.distance?.toFixed(1)} km</p>
                <p>Location: {item.address || item.location?.address}</p>
                {item.price && <p>Price: ${item.price}</p>}
                {item.rating && <p>Rating: ⭐ {item.rating}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
```

CSS Module (`NearbySearch.module.css`):

```css
.container {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
}

.controls {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.controls select,
.controls input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  flex: 1;
}

.controls button {
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.controls button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.error {
  background-color: #f8d7da;
  color: #721c24;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 10px;
}

.results {
  max-height: 400px;
  overflow-y: auto;
}

.resultItem {
  padding: 12px;
  border-bottom: 1px solid #eee;
  list-style: none;
}

.resultItem h4 {
  margin: 0 0 8px 0;
}

.resultItem p {
  margin: 4px 0;
  font-size: 14px;
  color: #666;
}
```

### 3.3 Map Integration - Google Maps Example

Create `components/DeliveryMap.jsx`:

```javascript
// components/DeliveryMap.jsx
import React, { useEffect, useRef } from "react";

export const DeliveryMap = ({
  transporterLocation,
  pickupLocation,
  deliveryLocation,
  locationHistory = [],
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    // Initialize map only once
    if (mapInstanceRef.current) return;

    // Create map centered on transporter location or pickup
    const center = transporterLocation || pickupLocation || { lat: 0, lng: 0 };

    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      zoom: 13,
      center: {
        lat: center.latitude || center.lat,
        lng: center.longitude || center.lng,
      },
      mapTypeControl: true,
      fullscreenControl: true,
    });

    return () => {
      // Cleanup
    };
  }, []);

  // Update markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    // Add transporter location (current position)
    if (transporterLocation) {
      const marker = new window.google.maps.Marker({
        position: {
          lat: transporterLocation.latitude,
          lng: transporterLocation.longitude,
        },
        map: mapInstanceRef.current,
        title: "Current Location",
        icon: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
      });
      markersRef.current.push(marker);
    }

    // Add pickup location
    if (pickupLocation) {
      const marker = new window.google.maps.Marker({
        position: {
          lat: pickupLocation.latitude || pickupLocation.lat,
          lng: pickupLocation.longitude || pickupLocation.lng,
        },
        map: mapInstanceRef.current,
        title: "Pickup Location",
        icon: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
      });
      markersRef.current.push(marker);
    }

    // Add delivery location
    if (deliveryLocation) {
      const marker = new window.google.maps.Marker({
        position: {
          lat: deliveryLocation.latitude || deliveryLocation.lat,
          lng: deliveryLocation.longitude || deliveryLocation.lng,
        },
        map: mapInstanceRef.current,
        title: "Delivery Location",
        icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
      });
      markersRef.current.push(marker);
    }

    // Draw path from location history
    if (locationHistory.length > 0) {
      const path = locationHistory.map((loc) => ({
        lat: loc.latitude,
        lng: loc.longitude,
      }));

      const polyline = new window.google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: "#FF0000",
        strokeOpacity: 0.7,
        strokeWeight: 2,
        map: mapInstanceRef.current,
      });

      // Fit bounds to show all points
      const bounds = new window.google.maps.LatLngBounds();
      path.forEach((point) => bounds.extend(point));
      mapInstanceRef.current.fitBounds(bounds);
    }
  }, [transporterLocation, pickupLocation, deliveryLocation, locationHistory]);

  return (
    <div
      ref={mapRef}
      style={{
        width: "100%",
        height: "500px",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    />
  );
};
```

**Setup in your index.html:**

```html
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY"></script>
```

---

## Part 4: Redux State Management (Optional)

Create `store/slices/locationSlice.js`:

```javascript
// store/slices/locationSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import locationService from "../../services/locationService";

export const fetchNearbyTransporters = createAsyncThunk(
  "location/fetchNearbyTransporters",
  async ({ latitude, longitude, radiusKm }, { rejectWithValue }) => {
    try {
      const response = await locationService.findNearbyTransporters(
        latitude,
        longitude,
        radiusKm
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateUserLocation = createAsyncThunk(
  "location/updateUserLocation",
  async ({ latitude, longitude, metadata }, { rejectWithValue }) => {
    try {
      const response = await locationService.updateLocation(
        latitude,
        longitude,
        metadata
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const locationSlice = createSlice({
  name: "location",
  initialState: {
    currentLocation: null,
    nearbyTransporters: [],
    nearbyCargo: [],
    locationHistory: [],
    tracking: false,
    loading: false,
    error: null,
  },
  reducers: {
    setCurrentLocation: (state, action) => {
      state.currentLocation = action.payload;
    },
    setTracking: (state, action) => {
      state.tracking = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch nearby transporters
      .addCase(fetchNearbyTransporters.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNearbyTransporters.fulfilled, (state, action) => {
        state.loading = false;
        state.nearbyTransporters = action.payload;
      })
      .addCase(fetchNearbyTransporters.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update user location
      .addCase(updateUserLocation.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateUserLocation.fulfilled, (state, action) => {
        state.loading = false;
        state.currentLocation = action.payload;
      })
      .addCase(updateUserLocation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setCurrentLocation, setTracking, clearError } =
  locationSlice.actions;
export default locationSlice.reducer;
```

---

## Part 5: Complete Integration Example

Create `pages/DeliveryPage.jsx`:

```javascript
// pages/DeliveryPage.jsx
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RealTimeTracking } from "../components/RealTimeTracking";
import { DeliveryMap } from "../components/DeliveryMap";
import { NearbySearch } from "../components/NearbySearch";
import { useDistance } from "../hooks/useDistance";
import { updateUserLocation } from "../store/slices/locationSlice";

export const DeliveryPage = ({ orderId }) => {
  const dispatch = useDispatch();
  const currentLocation = useSelector(
    (state) => state.location.currentLocation
  );
  const [locationHistory, setLocationHistory] = useState([]);
  const { distance, calculate: calculateDistance } = useDistance();

  // Mock order data - replace with actual data
  const order = {
    pickup: { latitude: 1.9366, longitude: 29.8512, address: "Pickup Point" },
    delivery: {
      latitude: 1.9536,
      longitude: 29.8739,
      address: "Delivery Point",
    },
  };

  const handleLocationUpdate = (location) => {
    // Update Redux state
    dispatch(
      updateUserLocation({
        latitude: location.latitude,
        longitude: location.longitude,
        metadata: {
          speed: location.speed,
          accuracy: location.accuracy,
          orderId,
        },
      })
    );

    // Track location history
    setLocationHistory((prev) => [...prev, location]);

    // Calculate distance to destination
    if (order.delivery) {
      calculateDistance(
        location.latitude,
        location.longitude,
        order.delivery.latitude,
        order.delivery.longitude
      );
    }
  };

  return (
    <div
      style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}
    >
      {/* Left: Tracking Controls */}
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
              borderRadius: "4px",
            }}
          >
            <h4>Distance to Destination</h4>
            <p>
              <strong>Distance:</strong> {distance.distanceKm?.toFixed(1)} km
            </p>
            <p>
              <strong>ETA:</strong> {distance.etaMinutes?.toFixed(0)} minutes
            </p>
            <p>
              <strong>Bearing:</strong> {distance.bearing?.toFixed(0)}°
            </p>
          </div>
        )}

        <NearbySearch userLocation={currentLocation} />
      </div>

      {/* Right: Map */}
      <div>
        <h3>Live Delivery Map</h3>
        <DeliveryMap
          transporterLocation={currentLocation}
          pickupLocation={order.pickup}
          deliveryLocation={order.delivery}
          locationHistory={locationHistory}
        />
      </div>
    </div>
  );
};
```

---

## Part 6: Setup & Environment

### 6.1 Environment Variables

Create `.env.local`:

```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_GOOGLE_MAPS_API_KEY=your_api_key_here
```

### 6.2 Initialize Service Token

In your main app setup (e.g., `App.jsx`):

```javascript
import locationService from './services/locationService';
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    // Update location service token when user logs in
    const token = localStorage.getItem('token');
    if (token) {
      locationService.setToken(token);
    }
  }, []);

  return (
    // Your app JSX
  );
}
```

---

## Part 7: Best Practices

### DO

1. **Batch location updates** - Send updates every 10-30 seconds, not continuously
2. **Stop tracking** when delivery is complete to save battery and data
3. **Cache user location** - Store in Redux/Context to avoid repeated calls
4. **Request high accuracy** only when necessary (increases battery drain)
5. **Validate coordinates** before sending to backend
6. **Handle offline scenarios** - Queue updates when offline

### DON'T

1. **Don't update location** more than once per 5 seconds
2. **Don't expose API keys** in frontend code
3. **Don't track continuously** during idle time
4. **Don't send invalid** coordinates
5. **Don't forget** to stop tracking when unmounting

### Performance Tips

```javascript
// GOOD - Batched updates
useEffect(() => {
  const interval = setInterval(() => {
    updateLocation();
  }, 15000); // Update every 15 seconds

  return () => clearInterval(interval);
}, []);

// BAD - Too frequent
useEffect(() => {
  const interval = setInterval(() => {
    updateLocation();
  }, 1000); // Every second - too much!

  return () => clearInterval(interval);
}, []);
```

---

## Part 8: Testing

### Test with curl:

```bash
# Get nearby transporters
curl "http://localhost:5000/api/location/nearby-transporters?latitude=1.9536&longitude=29.8739&radiusKm=50" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update location
curl -X POST http://localhost:5000/api/location/update-location \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 1.9536,
    "longitude": 29.8739,
    "address": "Kampala",
    "speed": 45,
    "accuracy": 10,
    "heading": 180
  }'

# Get location history
curl "http://localhost:5000/api/location/history/TRANSPORTER_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test with Postman:

1. Import location endpoints from API documentation
2. Set up environment variables for token and user IDs
3. Test each endpoint with sample data
4. Verify responses match schema

---

## Troubleshooting

| Issue                       | Solution                                      |
| --------------------------- | --------------------------------------------- |
| Map not showing             | Verify Google Maps API key is set correctly   |
| Location always null        | Check browser location permissions            |
| Distance showing as 0       | Verify coordinates are valid and different    |
| High battery drain          | Reduce update frequency or use lower accuracy |
| Frequent "401 Unauthorized" | Token might be expired, refresh it            |

---

## Next Steps

1. Implement API Service (copy `locationService.js`)
2. Create Hooks (copy `useLocation.js`, `useNearbySearch.js`)
3. Build Components (copy map & tracking components)
4. Setup Redux (optional, for complex state)
5. Test with sample data
6. Integrate with your frontend app
7. Deploy and monitor

---

For more details, see:

- `LOCATION_TRACKING_IMPLEMENTATION.md` - Backend API reference
- `LOCATION_TESTING_GUIDE.md` - Testing procedures
- `LOCATION_QUICK_REFERENCE.md` - Quick API reference
