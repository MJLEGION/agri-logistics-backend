# 🔌 API Reference Guide

**Base URL**: `http://localhost:5000/api`  
**All endpoints** (except auth/login/register) require: `Authorization: Bearer <token>`

---

## 🔐 Authentication Endpoints

### Register User

```
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "phone": "+250788123456",
  "password": "password123",
  "role": "farmer|buyer|transporter"
}

Response (201):
{
  "success": true,
  "token": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "_id": "...",
    "name": "John Doe",
    "phone": "+250788123456",
    "role": "farmer"
  }
}
```

### Login

```
POST /api/auth/login
Content-Type: application/json

{
  "phone": "+250788123456",
  "password": "password123"
}

Response (200):
{
  "success": true,
  "message": "Welcome back, John Doe!",
  "token": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "_id": "...",
    "name": "John Doe",
    "phone": "+250788123456",
    "role": "farmer"
  }
}
```

### Refresh Token ⭐ NEW

```
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}

Response (200):
{
  "success": true,
  "token": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "_id": "...",
    "name": "John Doe",
    "phone": "+250788123456",
    "role": "farmer"
  }
}
```

### Get Current User

```
GET /api/auth/me
Authorization: Bearer <token>

Response (200):
{
  "_id": "...",
  "name": "John Doe",
  "phone": "+250788123456",
  "role": "farmer",
  ...
}
```

---

## 🌾 Crop Endpoints

### Get All Crops

```
GET /api/crops
Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "name": "Tomatoes",
      "quantity": 100,
      "unit": "kg",
      "pricePerUnit": 1000,
      "harvestDate": "2024-12-25",
      "farmerId": {
        "_id": "...",
        "name": "John Farmer",
        "phone": "+250788123456"
      }
    }
  ]
}
```

### Create Crop (Farmer only)

```
POST /api/crops
Authorization: Bearer <farmer_token>
Content-Type: application/json

{
  "name": "Tomatoes",
  "quantity": 100,
  "unit": "kg",
  "pricePerUnit": 1000,
  "harvestDate": "2024-12-25",
  "location": {
    "latitude": -1.9536,
    "longitude": 29.8739,
    "address": "Kigali, Rwanda"
  }
}

Response (201):
{
  "success": true,
  "data": { crop object }
}
```

### Get Crop by ID

```
GET /api/crops/:id
Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": { crop object }
}
```

### Update Crop (Farmer who owns it)

```
PUT /api/crops/:id
Authorization: Bearer <farmer_token>
Content-Type: application/json

{
  "quantity": 150,
  "pricePerUnit": 1200
}

Response (200):
{
  "success": true,
  "data": { updated crop }
}
```

### Delete Crop (Farmer who owns it)

```
DELETE /api/crops/:id
Authorization: Bearer <farmer_token>

Response (200):
{
  "success": true,
  "message": "Crop deleted successfully"
}
```

---

## 📦 Order Endpoints

### Get My Orders ⭐ NEW (Smart Filtering)

```
GET /api/orders/my-orders
Authorization: Bearer <token>

💡 Returns:
- Farmers: Orders for their crops
- Buyers: Orders they placed
- Transporters: Orders assigned to them

Response (200):
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "cropId": { crop details },
      "farmerId": { farmer details },
      "buyerId": { buyer details },
      "transporterId": { transporter details },
      "quantity": 50,
      "totalPrice": 50000,
      "status": "pending|accepted|in_progress|completed",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Get All Orders

```
GET /api/orders
Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": [ all orders with populated refs ]
}
```

### Create Order (Buyer only)

```
POST /api/orders
Authorization: Bearer <buyer_token>
Content-Type: application/json

{
  "cropId": "crop_id_here",
  "quantity": 50,
  "totalPrice": 50000,
  "pickupLocation": {
    "latitude": -1.9536,
    "longitude": 29.8739,
    "address": "Farm, Kigali"
  },
  "deliveryLocation": {
    "latitude": -1.9536,
    "longitude": 29.8739,
    "address": "Market, Kigali"
  }
}

Response (201):
{
  "success": true,
  "data": { order object }
}
```

### Accept Order (Transporter only) ⭐ NEW

```
PUT /api/orders/:id/accept
Authorization: Bearer <transporter_token>

✅ This assigns the transporter to the order
✅ Updates order status to "in_progress"
✅ Updates crop status to "matched"

Response (200):
{
  "success": true,
  "data": { updated order },
  "message": "Order accepted successfully"
}
```

### Update Order

```
PUT /api/orders/:id
Authorization: Bearer <token>
Content-Type: application/json

Restrictions:
- Transporters: Can only update status & deliveryLocation
- Farmers/Buyers: Can't update core fields

{
  "status": "completed"
}

Response (200):
{
  "success": true,
  "data": { updated order }
}
```

### Get Order by ID

```
GET /api/orders/:id
Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": { order object }
}
```

---

## 💳 Payment Endpoints ⭐ NEW (MOCK)

### Initiate Payment

```
POST /api/payments/flutterwave/initiate
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 50000,
  "phoneNumber": "+250788123456",
  "orderId": "order_id",
  "email": "buyer@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "currency": "RWF",
  "paymentMethod": "momo|airtel"
}

Response (200):
{
  "success": true,
  "status": "pending",
  "referenceId": "FW_order_id_1234567890_9999",
  "flutterwaveRef": 123456,
  "message": "Payment initiated. Check your phone for prompt."
}
```

### Check Payment Status

```
GET /api/payments/flutterwave/status/:referenceId
Authorization: Bearer <token>

⏳ Status flow:
1. pending → in progress
2. pending → completed (after ~3 seconds in mock)
3. completed → verified

Response (200):
{
  "success": true|false,
  "status": "pending|completed|failed",
  "transactionId": 123456,
  "referenceId": "FW_...",
  "amount": 50000,
  "currency": "RWF",
  "message": "Payment successful"
}
```

### Verify Payment

```
POST /api/payments/flutterwave/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "transactionId": 123456,
  "referenceId": "FW_..."
}

Response (200):
{
  "success": true,
  "status": "completed",
  "message": "Payment verified successfully",
  "transactionId": 123456
}
```

---

## 🛡️ Authorization Rules

| Endpoint           | Method | Farmer | Buyer | Transporter |
| ------------------ | ------ | ------ | ----- | ----------- |
| /crops             | GET    | ✅     | ✅    | ✅          |
| /crops             | POST   | ✅     | ❌    | ❌          |
| /crops/:id         | PUT    | ✅\*   | ❌    | ❌          |
| /crops/:id         | DELETE | ✅\*   | ❌    | ❌          |
| /orders/my-orders  | GET    | ✅     | ✅    | ✅          |
| /orders            | POST   | ❌     | ✅    | ❌          |
| /orders            | GET    | ✅     | ✅    | ✅          |
| /orders/:id        | PUT    | ✅\*   | ✅\*  | ✅\*        |
| /orders/:id/accept | PUT    | ❌     | ❌    | ✅          |
| /payments/\*       | ALL    | ✅     | ✅    | ✅          |

\*Ownership/Authorization checks apply

---

## 🧪 Example Flow

### 1. Register as Farmer

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

### 2. Create a Crop

```bash
curl -X POST http://localhost:5000/api/crops \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tomatoes",
    "quantity": 100,
    "unit": "kg",
    "pricePerUnit": 1000,
    "harvestDate": "2024-12-25",
    "location": {
      "latitude": -1.9536,
      "longitude": 29.8739,
      "address": "Kigali"
    }
  }'
```

### 3. Register as Buyer

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Buyer",
    "phone": "+250720123456",
    "password": "password123",
    "role": "buyer"
  }'
```

### 4. Create an Order

```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Authorization: Bearer <buyer_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "cropId": "<crop_id>",
    "quantity": 50,
    "totalPrice": 50000,
    "pickupLocation": {"latitude": -1.9536, "longitude": 29.8739, "address": "Farm"},
    "deliveryLocation": {"latitude": -1.9536, "longitude": 29.8739, "address": "Market"}
  }'
```

### 5. Register as Transporter

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tom Transporter",
    "phone": "+250790123456",
    "password": "password123",
    "role": "transporter"
  }'
```

### 6. Accept Order (Transporter)

```bash
curl -X PUT http://localhost:5000/api/orders/<order_id>/accept \
  -H "Authorization: Bearer <transporter_token>"
```

### 7. Initiate Payment

```bash
curl -X POST http://localhost:5000/api/payments/flutterwave/initiate \
  -H "Authorization: Bearer <buyer_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50000,
    "phoneNumber": "+250788123456",
    "orderId": "<order_id>",
    "email": "buyer@example.com",
    "firstName": "Jane",
    "lastName": "Buyer",
    "paymentMethod": "momo"
  }'
```

### 8. Check Payment Status (Poll every 5 seconds)

```bash
curl -X GET http://localhost:5000/api/payments/flutterwave/status/<referenceId> \
  -H "Authorization: Bearer <buyer_token>"
```

---

## ❌ Common Error Responses

### 401 - Unauthorized

```json
{
  "success": false,
  "message": "Not authorized, no token"
}
```

**Fix**: Add `Authorization: Bearer <token>` header

### 403 - Forbidden (Role Check Failed)

```json
{
  "success": false,
  "message": "Only farmer can access this"
}
```

**Fix**: Use correct role user

### 404 - Not Found

```json
{
  "success": false,
  "message": "Crop not found"
}
```

**Fix**: Check ID exists

### 400 - Bad Request

```json
{
  "success": false,
  "message": "Missing required fields: ..."
}
```

**Fix**: Include all required fields

---

## 📝 Notes

- All timestamps in ISO 8601 format
- Amounts in RWF (Rwandan Francs)
- Phone numbers: Nigerian (+234/0) or Rwandan (+250/0) format
- Test Payment endpoints auto-complete after 3 seconds (mock mode)
- For production, replace mock with real Flutterwave keys

---

**Last Updated**: 2024  
**Status**: ✅ Ready for Testing
