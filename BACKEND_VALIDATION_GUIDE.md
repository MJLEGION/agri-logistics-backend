# Backend Validation Guide

Complete validation checklist to verify all endpoints work correctly with the frontend integration guide.

## 🎯 Validation Strategy

This guide helps you verify that the backend implements all endpoints required by the frontend integration guide. Each section includes:

- Expected endpoint
- Required authentication
- Example request
- Expected response

---

## ✅ Phase 1: Authentication Endpoints

### 1.1 Register New User

**Endpoint:** `POST /api/auth/register`  
**Auth:** None

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Farmer",
    "phone": "+250788123456",
    "password": "password123",
    "role": "farmer"
  }'
```

**Expected Response (201):**

```json
{
  "success": true,
  "message": "Registration successful",
  "token": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "_id": "mongo_id",
    "name": "John Farmer",
    "phone": "+250788123456",
    "role": "farmer"
  }
}
```

**✅ Status:** Pass / ❌ Fail

---

### 1.2 Login User

**Endpoint:** `POST /api/auth/login`  
**Auth:** None

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+250788123456",
    "password": "password123"
  }'
```

**Expected Response (200):**

```json
{
  "success": true,
  "message": "Welcome back, John Farmer!",
  "token": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "_id": "mongo_id",
    "name": "John Farmer",
    "phone": "+250788123456",
    "role": "farmer"
  }
}
```

**✅ Status:** Pass / ❌ Fail

---

### 1.3 Get Current User

**Endpoint:** `GET /api/auth/me`  
**Auth:** Bearer token

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/auth/me
```

**Expected Response (200):**

```json
{
  "_id": "mongo_id",
  "name": "John Farmer",
  "phone": "+250788123456",
  "role": "farmer",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

**✅ Status:** Pass / ❌ Fail

---

### 1.4 Refresh Token

**Endpoint:** `POST /api/auth/refresh`  
**Auth:** None

```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "YOUR_REFRESH_TOKEN"}'
```

**Expected Response (200):**

```json
{
  "success": true,
  "token": "NEW_ACCESS_TOKEN",
  "refreshToken": "NEW_REFRESH_TOKEN",
  "user": {...}
}
```

**✅ Status:** Pass / ❌ Fail

---

### 1.5 Logout

**Endpoint:** `POST /api/auth/logout`  
**Auth:** Bearer token

```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "YOUR_REFRESH_TOKEN"}'
```

**Expected Response (200):**

```json
{
  "message": "Logged out successfully"
}
```

**✅ Status:** Pass / ❌ Fail

---

## ✅ Phase 2: Crops Endpoints

### 2.1 Get All Crops

**Endpoint:** `GET /api/crops`  
**Auth:** Bearer token

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/crops
```

**Expected Response (200):**

```json
[
  {
    "_id": "crop_id",
    "name": "Tomatoes",
    "quantity": 100,
    "unit": "kg",
    "pricePerUnit": 500,
    "harvestDate": "2025-01-15T00:00:00.000Z",
    "location": {
      "latitude": -1.9536,
      "longitude": 29.8739,
      "address": "Kigali"
    },
    "status": "listed",
    "farmerId": {...},
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
]
```

**✅ Status:** Pass / ❌ Fail

---

### 2.2 Get User's Crops

**Endpoint:** `GET /api/crops/user/:userId`  
**Auth:** Bearer token

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/crops/user/FARMER_USER_ID
```

**Expected Response (200):** Array of crop objects

**✅ Status:** Pass / ❌ Fail

---

### 2.3 Get Single Crop

**Endpoint:** `GET /api/crops/:id`  
**Auth:** Bearer token

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/crops/CROP_ID
```

**Expected Response (200):** Single crop object

**✅ Status:** Pass / ❌ Fail

---

### 2.4 Create Crop

**Endpoint:** `POST /api/crops`  
**Auth:** Bearer token (Farmer role)

```bash
curl -X POST http://localhost:5000/api/crops \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Potatoes",
    "quantity": 500,
    "unit": "kg",
    "pricePerUnit": 300,
    "harvestDate": "2025-01-20T00:00:00Z",
    "location": {
      "latitude": -1.9536,
      "longitude": 29.8739,
      "address": "Kigali, Rwanda"
    }
  }'
```

**Expected Response (201):** Created crop object with \_id

**✅ Status:** Pass / ❌ Fail

---

### 2.5 Update Crop

**Endpoint:** `PUT /api/crops/:id`  
**Auth:** Bearer token (Farmer owner)

```bash
curl -X PUT http://localhost:5000/api/crops/CROP_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 450,
    "pricePerUnit": 320
  }'
```

**Expected Response (200):** Updated crop object

**✅ Status:** Pass / ❌ Fail

---

### 2.6 Delete Crop

**Endpoint:** `DELETE /api/crops/:id`  
**Auth:** Bearer token (Farmer owner)

```bash
curl -X DELETE http://localhost:5000/api/crops/CROP_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response (200):**

```json
{
  "success": true,
  "message": "Crop deleted successfully"
}
```

**✅ Status:** Pass / ❌ Fail

---

## ✅ Phase 3: Orders Endpoints

### 3.1 Get All Orders

**Endpoint:** `GET /api/orders`  
**Auth:** Bearer token

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/orders
```

**Expected Response (200):** Array of order objects

**✅ Status:** Pass / ❌ Fail

---

### 3.2 Get User's Orders

**Endpoint:** `GET /api/orders/user/:userId`  
**Auth:** Bearer token

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/orders/user/USER_ID
```

**Expected Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "order_id",
      "cropId": "crop_id",
      "farmerId": "farmer_id",
      "buyerId": "buyer_id",
      "quantity": 50,
      "totalPrice": 15000,
      "status": "accepted",
      "transporterId": null,
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

**✅ Status:** Pass / ❌ Fail

---

### 3.3 Get Single Order

**Endpoint:** `GET /api/orders/:id`  
**Auth:** Bearer token

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/orders/ORDER_ID
```

**Expected Response (200):** Single order object with populated fields

**✅ Status:** Pass / ❌ Fail

---

### 3.4 Create Order

**Endpoint:** `POST /api/orders`  
**Auth:** Bearer token (Buyer role)

```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cropId": "CROP_ID",
    "quantity": 50,
    "totalPrice": 15000,
    "pickupLocation": {
      "latitude": -1.9536,
      "longitude": 29.8739,
      "address": "Kigali, Rwanda"
    },
    "deliveryLocation": {
      "latitude": -1.8250,
      "longitude": 29.9500,
      "address": "Butare, Rwanda"
    }
  }'
```

**Expected Response (201):** Created order object

**✅ Status:** Pass / ❌ Fail

---

### 3.5 Update Order

**Endpoint:** `PUT /api/orders/:id`  
**Auth:** Bearer token (Order involved party)

```bash
curl -X PUT http://localhost:5000/api/orders/ORDER_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_progress",
    "transporterId": "TRANSPORTER_ID"
  }'
```

**Expected Response (200):** Updated order object

**✅ Status:** Pass / ❌ Fail

---

### 3.6 Delete Order

**Endpoint:** `DELETE /api/orders/:id`  
**Auth:** Bearer token (Buyer or Farmer)

```bash
curl -X DELETE http://localhost:5000/api/orders/ORDER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response (200):**

```json
{
  "success": true,
  "message": "Order deleted successfully"
}
```

**✅ Status:** Pass / ❌ Fail

---

### 3.7 Accept Order (Transporter)

**Endpoint:** `PUT /api/orders/:id/accept`  
**Auth:** Bearer token (Transporter role)

```bash
curl -X PUT http://localhost:5000/api/orders/ORDER_ID/accept \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response (200):**

```json
{
  "success": true,
  "data": {...},
  "message": "Order accepted successfully"
}
```

**✅ Status:** Pass / ❌ Fail

---

## ✅ Phase 4: Transporter Endpoints

### 4.1 Get All Transporters

**Endpoint:** `GET /api/transporters`  
**Auth:** Bearer token

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/transporters
```

**Expected Response (200):** Array of transporter objects

**✅ Status:** Pass / ❌ Fail

---

### 4.2 Get Available Transporters

**Endpoint:** `GET /api/transporters/available`  
**Auth:** Bearer token

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/transporters/available
```

**Expected Response (200):** Array of available transporter objects

**✅ Status:** Pass / ❌ Fail

---

### 4.3 Get Single Transporter

**Endpoint:** `GET /api/transporters/:id`  
**Auth:** Bearer token

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/transporters/TRANSPORTER_ID
```

**Expected Response (200):** Single transporter object

**✅ Status:** Pass / ❌ Fail

---

### 4.4 Create/Update My Transporter Profile

**Endpoint:** `POST /api/transporters/profile/me`  
**Auth:** Bearer token (Transporter role)

```bash
curl -X POST http://localhost:5000/api/transporters/profile/me \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicle_type": "truck",
    "capacity": 5000,
    "rates": 50000,
    "location": "Kigali"
  }'
```

**Expected Response (200/201):** Transporter profile object

**✅ Status:** Pass / ❌ Fail

---

### 4.5 Get My Transporter Profile

**Endpoint:** `GET /api/transporters/profile/me`  
**Auth:** Bearer token (Transporter role)

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/transporters/profile/me
```

**Expected Response (200):** My transporter profile object

**✅ Status:** Pass / ❌ Fail

---

### 4.6 Update Transporter Profile

**Endpoint:** `PUT /api/transporters/:id`  
**Auth:** Bearer token (Own profile)

```bash
curl -X PUT http://localhost:5000/api/transporters/TRANSPORTER_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "available": false,
    "capacity": 6000
  }'
```

**Expected Response (200):** Updated transporter object

**✅ Status:** Pass / ❌ Fail

---

## ✅ Phase 5: Payment Endpoints

### 5.1 Initiate Payment

**Endpoint:** `POST /api/payments/initiate`  
**Auth:** Bearer token

```bash
curl -X POST http://localhost:5000/api/payments/initiate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 15000,
    "phoneNumber": "+250788123456",
    "orderId": "ORDER_ID",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Farmer",
    "currency": "RWF",
    "paymentMethod": "momo"
  }'
```

**Expected Response (200):**

```json
{
  "success": true,
  "status": "pending",
  "referenceId": "FW_ORDER_ID_...",
  "flutterwaveRef": 123456,
  "message": "Payment initiated successfully..."
}
```

**✅ Status:** Pass / ❌ Fail

---

### 5.2 Get Payment Status

**Endpoint:** `GET /api/payments/:id`  
**Auth:** Bearer token

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/payments/REFERENCE_ID
```

**Expected Response (200):**

```json
{
  "success": true,
  "status": "completed",
  "transactionId": 123456,
  "referenceId": "FW_ORDER_ID_...",
  "amount": 15000,
  "currency": "RWF",
  "message": "Payment successful"
}
```

**✅ Status:** Pass / ❌ Fail

---

### 5.3 Confirm Payment

**Endpoint:** `POST /api/payments/confirm`  
**Auth:** Bearer token

```bash
curl -X POST http://localhost:5000/api/payments/confirm \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": 123456,
    "order_id": "ORDER_ID"
  }'
```

**Expected Response (200):**

```json
{
  "success": true,
  "status": "completed",
  "message": "Payment verified successfully",
  "transactionId": 123456
}
```

**✅ Status:** Pass / ❌ Fail

---

## 📊 Summary Checklist

- [ ] **Phase 1 - Authentication** (5 endpoints)

  - [ ] 1.1 Register
  - [ ] 1.2 Login
  - [ ] 1.3 Get Current User
  - [ ] 1.4 Refresh Token
  - [ ] 1.5 Logout

- [ ] **Phase 2 - Crops** (6 endpoints)

  - [ ] 2.1 Get All Crops
  - [ ] 2.2 Get User's Crops
  - [ ] 2.3 Get Single Crop
  - [ ] 2.4 Create Crop
  - [ ] 2.5 Update Crop
  - [ ] 2.6 Delete Crop

- [ ] **Phase 3 - Orders** (7 endpoints)

  - [ ] 3.1 Get All Orders
  - [ ] 3.2 Get User's Orders
  - [ ] 3.3 Get Single Order
  - [ ] 3.4 Create Order
  - [ ] 3.5 Update Order
  - [ ] 3.6 Delete Order
  - [ ] 3.7 Accept Order

- [ ] **Phase 4 - Transporters** (6 endpoints)

  - [ ] 4.1 Get All Transporters
  - [ ] 4.2 Get Available Transporters
  - [ ] 4.3 Get Single Transporter
  - [ ] 4.4 Create/Update My Profile
  - [ ] 4.5 Get My Profile
  - [ ] 4.6 Update Transporter

- [ ] **Phase 5 - Payments** (3 endpoints)
  - [ ] 5.1 Initiate Payment
  - [ ] 5.2 Get Payment Status
  - [ ] 5.3 Confirm Payment

**Total: 27 Endpoints**

---

## 🧪 Automated Testing

### Setup Postman Collection

1. Create a new collection called "Agri-Logistics Backend"
2. Add environment variables:

   - `base_url`: `http://localhost:5000/api`
   - `token`: (populate after login)
   - `farmer_id`: (from registration)
   - `buyer_id`: (from registration)
   - `transporter_id`: (from transporter list)
   - `crop_id`: (from crop creation)
   - `order_id`: (from order creation)

3. Create requests for each endpoint using the examples above

### Quick Validation Script

```bash
#!/bin/bash

# Set these
TOKEN="your_token_here"
BASE_URL="http://localhost:5000/api"

# Test endpoints
echo "Testing Crops..."
curl -s -H "Authorization: Bearer $TOKEN" $BASE_URL/crops | jq '.'

echo "Testing Orders..."
curl -s -H "Authorization: Bearer $TOKEN" $BASE_URL/orders | jq '.'

echo "Testing Transporters..."
curl -s -H "Authorization: Bearer $TOKEN" $BASE_URL/transporters | jq '.'
```

---

## 🐛 Troubleshooting

### Issue: 401 Unauthorized

**Solution:** Verify token is included in Authorization header: `Authorization: Bearer TOKEN`

### Issue: 403 Forbidden

**Solution:** Check that your user role matches the endpoint requirements

### Issue: 404 Not Found

**Solution:** Verify the endpoint path and resource IDs are correct

### Issue: 400 Bad Request

**Solution:** Check request body matches the required schema

### Issue: MongoDB Connection Error

**Solution:** Verify `MONGODB_URI` in `.env` and MongoDB server is running

---

**Happy Testing! 🚀**
