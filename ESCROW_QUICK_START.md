# 🚀 Payment Escrow System - Quick Start Guide

Get started with the Payment Escrow System in 5 minutes!

---

## 📦 Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

The API will be available at `http://localhost:5000`

---

## 🔑 Get Auth Token

First, register and login to get a JWT token:

### Register

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

### Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+250788123456",
    "password": "password123"
  }'
```

**Response:**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "...",
  "user": {
    /* user data */
  }
}
```

**Save the token for next requests:**

```bash
TOKEN="your_token_here"
```

---

## 💳 Quick Payment Flow Test

### Step 1: Create Wallet

```bash
curl -X GET http://localhost:5000/api/wallets/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

### Step 2: Add Funds to Wallet

```bash
curl -X POST http://localhost:5000/api/wallets/me/add-funds \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100000,
    "paymentMethod": "momo",
    "reference": "REF123"
  }'
```

### Step 3: Initiate Payment

```bash
curl -X POST http://localhost:5000/api/transactions/initiate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "farmerId": "USER_ID_1",
    "transporterId": "USER_ID_2",
    "orderId": "ORDER_ID",
    "cargoDescription": "Tomatoes - 100kg",
    "pickupLocation": "Kigali Main Market",
    "dropoffLocation": "Musanze District",
    "pickupTime": "2025-01-20T10:00:00Z",
    "estimatedDeliveryTime": "2025-01-20T16:00:00Z",
    "amount": 50000,
    "currency": "RWF",
    "paymentMethod": "momo"
  }'
```

**Save the transactionId from response**

### Step 4: Confirm Payment

```bash
curl -X POST http://localhost:5000/api/transactions/$TRANSACTION_ID/confirm \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Response includes:** transaction + escrow (now HELD)

### Step 5: Check Escrow Status

```bash
curl -X GET http://localhost:5000/api/escrows/$ESCROW_ID \
  -H "Authorization: Bearer $TOKEN"
```

### Step 6: Release Escrow (After Delivery)

```bash
curl -X PUT http://localhost:5000/api/escrows/$ESCROW_ID/release \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Delivery completed successfully"
  }'
```

**Result:** Funds transferred to transporter wallet ✅

---

## 📧 Create Receipt

```bash
curl -X POST http://localhost:5000/api/receipts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "$TRANSACTION_ID",
    "orderId": "ORDER_ID",
    "escrowId": "$ESCROW_ID",
    "farmerId": "USER_ID_1",
    "transporterId": "USER_ID_2",
    "subtotal": 50000,
    "platformFee": 1000,
    "tax": 500,
    "total": 51500,
    "currency": "RWF",
    "items": [
      {
        "description": "Tomatoes - 100kg",
        "quantity": 1,
        "unitPrice": 50000,
        "total": 50000
      }
    ]
  }'
```

### Issue Receipt

```bash
curl -X PUT http://localhost:5000/api/receipts/$RECEIPT_ID/issue \
  -H "Authorization: Bearer $TOKEN"
```

### Get Receipt HTML

```bash
curl -X GET http://localhost:5000/api/receipts/$RECEIPT_ID/html \
  -H "Authorization: Bearer $TOKEN"
```

---

## ⚠️ Handle Disputes

### Raise Dispute

```bash
curl -X POST http://localhost:5000/api/disputes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "escrowId": "$ESCROW_ID",
    "transactionId": "$TRANSACTION_ID",
    "reason": "Cargo was damaged during transit",
    "evidence": {
      "photos": ["base64_image_1", "base64_image_2"]
    }
  }'
```

### Admin Reviews Dispute

```bash
# As admin user
curl -X PUT http://localhost:5000/api/disputes/$DISPUTE_ID/review \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Admin Resolves Dispute

```bash
curl -X PUT http://localhost:5000/api/disputes/$DISPUTE_ID/resolve \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resolution": "REFUNDED",
    "resolutionReason": "Evidence supports farmer claim"
  }'
```

---

## 📊 Check Account Statement

```bash
curl -X GET http://localhost:5000/api/wallets/statement \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "balance": 145000,
    "currency": "RWF",
    "totalEarned": 50000,
    "totalSpent": 50000,
    "totalRefunded": 0,
    "net": 50000,
    "status": "active",
    "linkedAccounts": {
      "momo": "****3456",
      "airtel": null,
      "bank": null
    }
  }
}
```

---

## 📋 Get Transaction History

### Get My Transactions

```bash
curl -X GET "http://localhost:5000/api/transactions/my-transactions?limit=10&skip=0" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Transaction by Status

```bash
curl -X GET "http://localhost:5000/api/transactions/my-transactions?status=COMPLETED" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Transaction Stats

```bash
curl -X GET http://localhost:5000/api/transactions/stats \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🔍 Common Operations

### Get All My Escrows

```bash
curl -X GET http://localhost:5000/api/escrows/my-escrows \
  -H "Authorization: Bearer $TOKEN"
```

### Get Escrow Stats

```bash
curl -X GET http://localhost:5000/api/escrows/stats \
  -H "Authorization: Bearer $TOKEN"
```

### Get My Receipts

```bash
curl -X GET "http://localhost:5000/api/receipts/my-receipts?limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

### Get My Disputes

```bash
curl -X GET "http://localhost:5000/api/disputes/my-disputes" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🛡️ Admin Operations

### Auto-Release Expired Escrows (Cron Job)

```bash
curl -X POST http://localhost:5000/api/escrows/auto-release
```

### Get All Disputes (Admin)

```bash
curl -X GET http://localhost:5000/api/disputes/open \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Freeze Wallet (Admin)

```bash
curl -X PUT http://localhost:5000/api/wallets/$USER_ID/freeze \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Suspected fraudulent activity"
  }'
```

### Unfreeze Wallet (Admin)

```bash
curl -X PUT http://localhost:5000/api/wallets/$USER_ID/unfreeze \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## 🧪 Using Postman

1. **Import Collection** - Create a new Postman collection
2. **Set Base URL** - `{{BASE_URL}} = http://localhost:5000`
3. **Set Token** - `{{TOKEN}} = your_jwt_token`
4. **Use in Requests:**
   - URL: `{{BASE_URL}}/api/transactions/initiate`
   - Header: `Authorization: Bearer {{TOKEN}}`

---

## ❌ Troubleshooting

### 401 Unauthorized

- Token expired or invalid
- Solution: Get a new token with login endpoint

### 404 Not Found

- Resource ID incorrect or resource doesn't exist
- Solution: Check the ID and make sure the resource was created

### 400 Bad Request

- Missing required fields or invalid data
- Solution: Check request body against documentation

### 500 Server Error

- Check server logs for detailed error
- Solution: Ensure MongoDB is running and `.env` file is configured

---

## 🔗 Complete API Reference

See `PAYMENT_ESCROW_IMPLEMENTATION.md` for complete API documentation with all endpoints, parameters, and response formats.

---

## 💡 Tips

1. **Test Workflow:**

   - Create 2 users (farmer & transporter)
   - Farmer adds funds to wallet
   - Initiate payment transaction
   - Confirm payment (creates escrow)
   - Release escrow after delivery
   - Check updated wallet balances

2. **Dispute Workflow:**

   - Follow payment flow until ESCROW_HELD
   - Raise dispute as either party
   - Admin reviews and resolves
   - Funds refunded or released based on resolution

3. **Useful Queries:**
   - Get transactions by status: `?status=COMPLETED`
   - Pagination: `?limit=20&skip=0`
   - Filter by date range using timestamps

---

## 📞 Need Help?

- Check the detailed documentation: `PAYMENT_ESCROW_IMPLEMENTATION.md`
- Review the models in `src/models/`
- Check service implementations in `src/services/`
- Review error messages in server logs

---

**Happy Testing! 🎉**
