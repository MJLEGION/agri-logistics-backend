# Location Features - Quick Testing Guide

## Prerequisites

1. Server running on port 5000
2. Valid JWT token (login first)
3. Postman, curl, or similar tool

## Test Scenarios

### Setup: Get a Valid Token

```bash
# Register a user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "phone": "+250788123456",
    "password": "password123",
    "role": "transporter"
  }'

# Login to get token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+250788123456",
    "password": "password123"
  }'

# Save the token from response
TOKEN="your_jwt_token_here"
```

### Test 1: Update Real-Time Location

```bash
curl -X POST http://localhost:5000/api/location/update-location \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "latitude": 1.9536,
    "longitude": 29.8739,
    "address": "Kampala, Uganda",
    "accuracy": 10,
    "speed": 45,
    "heading": 180
  }'

# Expected Response:
# {
#   "success": true,
#   "message": "Location updated successfully",
#   "data": { ... }
# }
```

### Test 2: Create Cargo/Crops for Testing

```bash
# First get a farmer token
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Farmer",
    "phone": "+250788123457",
    "password": "password123",
    "role": "farmer"
  }'

FARMER_TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+250788123457","password":"password123"}' | jq -r '.token')

# Create a crop listing
curl -X POST http://localhost:5000/api/crops \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FARMER_TOKEN" \
  -d '{
    "name": "Maize",
    "quantity": 100,
    "unit": "kg",
    "pricePerUnit": 2500,
    "harvestDate": "2025-02-15",
    "location": {
      "latitude": 1.9556,
      "longitude": 29.8741,
      "address": "Kampala Central, Uganda"
    }
  }'
```

### Test 3: Find Nearby Cargo

```bash
curl -X GET "http://localhost:5000/api/location/nearby-cargo?latitude=1.9536&longitude=29.8739&radiusKm=50&limit=20" \
  -H "Authorization: Bearer $TOKEN"

# Expected Response:
# {
#   "success": true,
#   "count": 1,
#   "data": [
#     {
#       "_id": "...",
#       "name": "Maize",
#       "quantity": 100,
#       "distance": 2.5,
#       "location": { ... }
#     }
#   ]
# }
```

### Test 4: Find Nearby Transporters

```bash
# Using farmer token
curl -X GET "http://localhost:5000/api/location/nearby-transporters?latitude=1.9556&longitude=29.8741&radiusKm=50&limit=10" \
  -H "Authorization: Bearer $FARMER_TOKEN"

# Expected Response:
# {
#   "success": true,
#   "count": 1,
#   "data": [
#     {
#       "_id": "...",
#       "name": "Test User",
#       "vehicle_type": "car",
#       "distance": 2.5,
#       "estimatedMinutes": 4,
#       "rating": 5
#     }
#   ]
# }
```

### Test 5: Calculate Distance

```bash
curl -X POST http://localhost:5000/api/location/distance \
  -H "Content-Type: application/json" \
  -d '{
    "lat1": 1.9536,
    "lon1": 29.8739,
    "lat2": 1.9556,
    "lon2": 29.8741
  }'

# Expected Response:
# {
#   "success": true,
#   "data": {
#     "distance": 2.35,
#     "unit": "km",
#     "bearing": 23.4,
#     "estimatedMinutes": 4
#   }
# }
```

### Test 6: Get Bounding Box

```bash
curl -X GET "http://localhost:5000/api/location/bounds?latitude=1.9536&longitude=29.8739&radiusKm=10" \
  -H "Authorization: Bearer $TOKEN"

# Expected Response:
# {
#   "success": true,
#   "data": {
#     "minLat": 1.8895,
#     "maxLat": 2.0177,
#     "minLon": 29.7485,
#     "maxLon": 29.9993
#   }
# }
```

### Test 7: Get Location History

```bash
# First get transporter ID (from Test 1 response or list)
TRANSPORTER_ID="507f1f77bcf86cd799439011"

curl -X GET "http://localhost:5000/api/location/history/$TRANSPORTER_ID?limit=50" \
  -H "Authorization: Bearer $TOKEN"

# Expected Response:
# {
#   "success": true,
#   "count": 1,
#   "total": 1,
#   "data": [ ... ]
# }
```

### Test 8: Get Active Real-Time Locations

```bash
curl -X GET "http://localhost:5000/api/location/active?limit=50" \
  -H "Authorization: Bearer $TOKEN"

# Expected Response:
# {
#   "success": true,
#   "count": 1,
#   "data": [
#     {
#       "_id": "...",
#       "transporterId": { "name": "Test User", "vehicle_type": "car" },
#       "latitude": 1.9536,
#       "longitude": 29.8739,
#       "tripStatus": "in_transit",
#       "timestamp": "2025-01-20T10:30:00Z"
#     }
#   ]
# }
```

### Test 9: Search Cargo by Location

```bash
curl -X POST http://localhost:5000/api/location/search-cargo \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "latitude": 1.9536,
    "longitude": 29.8739,
    "radiusKm": 50,
    "minPrice": 2000,
    "maxPrice": 3000,
    "limit": 20
  }'

# Expected Response:
# {
#   "success": true,
#   "count": 1,
#   "data": [ ... ]
# }
```

### Test 10: Stop Tracking

```bash
curl -X POST http://localhost:5000/api/location/stop-tracking \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "orderId": "507f1f77bcf86cd799439011"
  }'

# Expected Response:
# {
#   "success": true,
#   "message": "Stopped tracking for 5 record(s)",
#   "data": { "modifiedCount": 5 }
# }
```

### Test 11: Find Nearby Orders

```bash
curl -X GET "http://localhost:5000/api/location/nearby-orders?latitude=1.9536&longitude=29.8739&radiusKm=50&status=pending&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

## Real-World Testing Scenario

### Scenario: Track a Delivery from Kampala Central to Kisementi

1. **Setup:**

   - Create farmer account
   - Create crop listing in Kampala Central (1.9556, 29.8741)
   - Create buyer account
   - Create order for the crop
   - Create transporter account

2. **Transporter picks up cargo:**

   ```bash
   # Update location to pickup point
   curl -X POST http://localhost:5000/api/location/update-location \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $TRANSPORTER_TOKEN" \
     -d '{
       "latitude": 1.9556,
       "longitude": 29.8741,
       "address": "Kampala Central",
       "orderId": "$ORDER_ID"
     }'
   ```

3. **In transit - update location every 30 seconds:**

   ```bash
   # Simulate transport from Kampala Central to Kisementi
   # (1.9556, 29.8741) → (1.9366, 29.8512)

   for i in {1..10}; do
     LAT=$(echo "1.9556 - ($i * 0.0019)" | bc)
     LON=$(echo "29.8741 - ($i * 0.00229)" | bc)

     curl -X POST http://localhost:5000/api/location/update-location \
       -H "Content-Type: application/json" \
       -H "Authorization: Bearer $TRANSPORTER_TOKEN" \
       -d "{
         \"latitude\": $LAT,
         \"longitude\": $LON,
         \"speed\": 40,
         \"orderId\": \"$ORDER_ID\"
       }"

     sleep 3
   done
   ```

4. **Check real-time tracking:**

   ```bash
   # Get active locations
   curl -X GET "http://localhost:5000/api/location/active" \
     -H "Authorization: Bearer $BUYER_TOKEN"
   ```

5. **Get complete history:**
   ```bash
   curl -X GET "http://localhost:5000/api/location/history/$TRANSPORTER_ID?orderId=$ORDER_ID" \
     -H "Authorization: Bearer $TRANSPORTER_TOKEN"
   ```

## Test Data - Uganda Coordinates

| Location        | Latitude | Longitude |
| --------------- | -------- | --------- |
| Kampala Central | 1.9536   | 29.8739   |
| Kisementi       | 1.9366   | 29.8512   |
| Ntinda          | 1.9395   | 29.8916   |
| Bukoto          | 1.9455   | 29.8600   |
| Makerere        | 1.9627   | 29.8654   |
| Mulago          | 1.9748   | 29.8762   |

## Common Issues & Solutions

### Issue: "Invalid coordinates"

**Solution:** Ensure latitude is between -90 and 90, longitude between -180 and 180

### Issue: "Latitude/longitude are required"

**Solution:** Include both latitude and longitude in request

### Issue: Empty results in nearby search

**Solution:** Ensure you have data created at similar coordinates

### Issue: Authorization error

**Solution:** Make sure token is included in header: `Authorization: Bearer $TOKEN`

### Issue: 404 Not Found

**Solution:** Verify endpoint path and server is running on port 5000

## Performance Testing

### Test Location Update Speed

```bash
time curl -X POST http://localhost:5000/api/location/update-location \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"latitude":1.9536,"longitude":29.8739,"address":"Test"}'

# Should complete in < 100ms
```

### Test Nearby Search with Multiple Records

```bash
# Repeat Test 3 multiple times after creating multiple crops
# Measure response time with increasing data
```

## Cleanup

```bash
# Delete tracking data for testing
# (If cleanup endpoint implemented)
curl -X DELETE http://localhost:5000/api/location/cleanup \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

**Tips:**

- Use Postman for easier testing with pre-saved requests
- Use `jq` to parse JSON responses: `curl ... | jq '.data'`
- Test with realistic coordinate ranges for your region
- Monitor server logs for any errors during testing
