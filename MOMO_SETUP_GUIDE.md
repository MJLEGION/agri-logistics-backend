# MTN MoMo API Integration Guide

## Overview

This guide explains how to set up and use the MTN MoMo mobile money payment integration for the Agri-Logistics backend.

## 📋 Prerequisites

- Node.js backend running
- Active internet connection
- MTN MoMo Developer Account

---

## 🔑 Getting MTN MoMo API Credentials

### Step 1: Create MTN MoMo Developer Account

1. Visit [https://momodeveloper.mtn.com](https://momodeveloper.mtn.com)
2. Click **"Register"** or **"Sign Up"**
3. Fill in your details:
   - Full Name
   - Email Address
   - Phone Number
   - Company/Organization Name
4. Verify your email

### Step 2: Create Your First Application

1. Login to your account
2. Go to **"My Applications"** dashboard
3. Click **"Create Application"**
4. Choose application type: **"Collection"** (for receiving payments)
5. Give your application a name (e.g., "Agri-Logistics Payment")

### Step 3: Get Your API Keys

After creating the application, you'll receive:

| Credential        | Where to Find         | Purpose                        |
| ----------------- | --------------------- | ------------------------------ |
| **User ID**       | Application Dashboard | API authentication             |
| **API Key**       | Application Dashboard | API authentication             |
| **Primary Key**   | Subscription Keys     | Collection API access          |
| **Secondary Key** | Subscription Keys     | Disbursement/Payout API access |

### Step 4: Environment Setup (Sandbox vs. Production)

**Sandbox (Development/Testing)**

```
MOMO_API_URL=https://sandbox.momodeveloper.mtn.com
```

**Production (Live)**

```
MOMO_API_URL=https://api.mtn.com
```

---

## ⚙️ Configure Your Backend

### Update `.env` File

Add these variables to your `.env` file:

```env
# MTN MoMo API Configuration
MOMO_API_URL=https://sandbox.momodeveloper.mtn.com
MOMO_API_KEY=your-api-key-from-dashboard
MOMO_USER_ID=your-user-id-from-dashboard
MOMO_PRIMARY_KEY=your-primary-subscription-key
MOMO_SECONDARY_KEY=your-secondary-subscription-key
MOMO_CALLBACK_URL=http://localhost:5000/api/payments/momo/callback
```

### Replace with Your Actual Credentials

1. Copy your **API Key** from MTN MoMo dashboard → paste after `MOMO_API_KEY=`
2. Copy your **User ID** → paste after `MOMO_USER_ID=`
3. Copy your **Primary Key** → paste after `MOMO_PRIMARY_KEY=`
4. Copy your **Secondary Key** → paste after `MOMO_SECONDARY_KEY=`

**Example:**

```env
MOMO_API_KEY=sk_sandbox_abc123xyz
MOMO_USER_ID=user_id_xyz
MOMO_PRIMARY_KEY=primary_key_abc123
MOMO_SECONDARY_KEY=secondary_key_xyz123
```

---

## 🚀 API Endpoints

### 1. Initiate Payment Request

**Endpoint:** `POST /api/payments/momo/request`

**Request Body:**

```json
{
  "amount": 5000,
  "phoneNumber": "+250788123456",
  "orderId": "order_id_here",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "currency": "RWF"
}
```

**Response:**

```json
{
  "success": true,
  "status": "pending",
  "data": {
    "transactionId": "transaction_id_here",
    "referenceId": "MOMO_order_id_1234567890",
    "amount": 5000,
    "currency": "RWF",
    "phoneNumber": "+250788123456",
    "timestamp": "2025-01-15T10:30:00Z"
  },
  "message": "MoMo payment request sent successfully. Please check your phone for a payment prompt."
}
```

### 2. Check Payment Status

**Endpoint:** `GET /api/payments/momo/status/:referenceId`

**Example:**

```
GET /api/payments/momo/status/MOMO_order_id_1234567890
```

**Response:**

```json
{
  "success": true,
  "data": {
    "transactionId": "transaction_id_here",
    "referenceId": "MOMO_order_id_1234567890",
    "status": "PAYMENT_CONFIRMED",
    "amount": 5000,
    "phoneNumber": "+250788123456",
    "financialTransactionId": "mtn_fin_transaction_id"
  },
  "message": "Payment status: PAYMENT_CONFIRMED"
}
```

### 3. Confirm Payment

**Endpoint:** `POST /api/payments/momo/confirm`

**Request Body:**

```json
{
  "transactionId": "transaction_id_here",
  "orderId": "order_id_here",
  "referenceId": "MOMO_order_id_1234567890"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "transactionId": "transaction_id_here",
    "status": "PAYMENT_CONFIRMED",
    "amount": 5000
  },
  "message": "Payment confirmed successfully"
}
```

### 4. Request Payout

**Endpoint:** `POST /api/payments/momo/payout`

For disbursing earnings to transporters/farmers:

**Request Body:**

```json
{
  "amount": 15000,
  "phoneNumber": "+250788654321",
  "reason": "Completed delivery payment"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "referenceId": "MOMO_payout_1234567890",
    "amount": 15000,
    "phoneNumber": "+250788654321",
    "status": "INITIATED",
    "timestamp": "2025-01-15T10:35:00Z"
  },
  "message": "Payout request sent successfully"
}
```

### 5. Webhook Callback

**Endpoint:** `POST /api/payments/momo/callback`

MoMo will POST updates here when payments are confirmed/failed:

**Callback Body (from MoMo):**

```json
{
  "referenceId": "MOMO_order_id_1234567890",
  "status": "SUCCESSFUL",
  "amount": 5000,
  "externalId": "order_id_here"
}
```

---

## 📱 Testing with Sandbox

### Sandbox Phone Numbers for Testing

**Rwanda (RWF Currency)**

- Test Phone: `+250788123456`
- Test Account: Available in MTN MoMo dashboard

### Test Payment Flow

1. **Start Payment**

   ```bash
   curl -X POST http://localhost:5000/api/payments/momo/request \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "amount": 5000,
       "phoneNumber": "+250788123456",
       "orderId": "test_order_123",
       "email": "test@example.com",
       "firstName": "Test",
       "lastName": "User"
     }'
   ```

2. **Check Payment Status** (within 30 seconds)

   ```bash
   curl -X GET http://localhost:5000/api/payments/momo/status/MOMO_test_order_123_xxx \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

3. **Confirm Payment** (after status is PAYMENT_CONFIRMED)
   ```bash
   curl -X POST http://localhost:5000/api/payments/momo/confirm \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "transactionId": "transaction_id_from_step_1",
       "orderId": "test_order_123",
       "referenceId": "MOMO_test_order_123_xxx"
     }'
   ```

---

## 🔐 Security Best Practices

### Never Expose Secrets

- **Never** commit credentials to git
- Keep `.env` file in `.gitignore`
- Use environment variables in production
- Rotate keys periodically

### API Key Safety

- Store keys securely in environment variables only
- Use different keys for sandbox and production
- Implement IP whitelisting on MTN MoMo dashboard
- Set up webhook signature validation

### Phone Number Validation

The service supports multiple phone number formats:

- `+250788123456` ✅
- `250788123456` ✅
- `0788123456` ✅
- `788123456` ✅

---

## 📊 Payment Status Flow

```
INITIATED
    ↓
PENDING (waiting for customer action)
    ↓
PAYMENT_CONFIRMED (customer completed payment)
    ↓
PAYMENT_CONFIRMED (backend confirms)
```

### Status Codes

| Status              | Meaning                  | Action                    |
| ------------------- | ------------------------ | ------------------------- |
| `INITIATED`         | Payment request created  | Waiting for response      |
| `PENDING`           | Awaiting customer action | Check status periodically |
| `PAYMENT_CONFIRMED` | Payment successful       | Confirm and proceed       |
| `FAILED`            | Payment rejected         | Show error to user        |
| `EXPIRED`           | Timeout occurred         | Retry payment             |
| `REJECTED`          | Customer declined        | Show rejection message    |

---

## 🐛 Troubleshooting

### Issue: "Failed to get MoMo access token"

**Solution:**

- Verify `MOMO_API_KEY`, `MOMO_USER_ID`, `MOMO_PRIMARY_KEY` are correct
- Check internet connection
- Verify sandbox/production URL is correct
- Check MTN MoMo dashboard for API status

### Issue: "Invalid phone number format"

**Solution:**

- Ensure phone number includes country code
- Use format: `+250788123456` or `250788123456`
- For Rwanda, format must start with 250 or +250

### Issue: "Subscription key not recognized"

**Solution:**

- Copy Primary Key (NOT Secondary) for Collection API
- Copy Secondary Key for Disbursement API
- Verify keys match your application in MTN MoMo dashboard

### Issue: Payment status always "PENDING"

**Solution:**

- Wait 30+ seconds before checking status
- Verify MoMo API is responding (check server logs)
- For sandbox, manually approve payment in MTN MoMo dashboard

---

## 📝 Additional Resources

- **MTN MoMo API Docs:** https://momodeveloper.mtn.com/docs
- **Postman Collection:** Available in MTN MoMo dashboard
- **Integration Examples:** Check MTN MoMo knowledge base
- **Support:** Contact MTN MoMo support or your account manager

---

## 🔄 Migration from Flutterwave to MoMo

Both payment methods work simultaneously:

**Payment Method Priority:**

1. MoMo (new, preferred)
2. Flutterwave (legacy, still supported)

**To use MoMo by default:**

```javascript
const paymentMethod = req.body.paymentMethod || "momo"; // Default to MoMo
```

---

## ✅ Integration Checklist

- [ ] Create MTN MoMo developer account
- [ ] Create application in dashboard
- [ ] Obtain API credentials (Key, User ID, Primary Key, Secondary Key)
- [ ] Add credentials to `.env` file
- [ ] Test payment request endpoint
- [ ] Test payment status checking
- [ ] Test payment confirmation
- [ ] Set up webhook callback URL in MTN MoMo dashboard
- [ ] Test payout functionality
- [ ] Configure production credentials when ready
- [ ] Enable webhook signature validation (optional but recommended)

---

## 📞 Support & Debugging

**Enable Debug Logging:**

```javascript
// In momoService.js - already includes detailed logging
logger.info("📱 MoMo operation:", details);
logger.error("❌ MoMo error:", errorDetails);
```

**Check Server Logs:**

```bash
npm run dev
# Look for 📱 MoMo messages
```

**Test Configuration:**

```bash
curl -X GET http://localhost:5000/api/payments/momo/config \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

**Last Updated:** January 2025  
**Status:** ✅ Ready for Integration
