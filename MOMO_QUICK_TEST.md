# MoMo API Quick Testing Guide

## Quick Start (5 Minutes)

### 1. Get Your Credentials

Visit: https://momodeveloper.mtn.com/account/applications

Copy these 4 values:

- `API Key`
- `User ID`
- `Primary Subscription Key`
- `Secondary Subscription Key`

### 2. Update `.env`

```env
MOMO_API_URL=https://sandbox.momodeveloper.mtn.com
MOMO_API_KEY=your-api-key
MOMO_USER_ID=your-user-id
MOMO_PRIMARY_KEY=your-primary-key
MOMO_SECONDARY_KEY=your-secondary-key
MOMO_CALLBACK_URL=http://localhost:5000/api/payments/momo/callback
```

### 3. Restart Server

```bash
npm run dev
```

---

## 🧪 Test Endpoints (Copy-Paste Ready)

### Step 1: Register & Login

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "phone": "+250788123456",
    "password": "test123",
    "role": "farmer"
  }'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+250788123456",
    "password": "test123"
  }'
```

**Save the returned token** as `TOKEN`

---

### Step 2: Create an Order

```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cropId": "crop_id_here",
    "quantity": 100,
    "totalPrice": 5000,
    "pickupLocation": {
      "address": "Kigali Market",
      "latitude": -1.9536,
      "longitude": 29.8739
    },
    "deliveryLocation": {
      "address": "Downtown Kigali",
      "latitude": -1.9536,
      "longitude": 29.8739
    }
  }'
```

**Save the returned `_id`** as `ORDER_ID`

---

### Step 3: Initiate MoMo Payment

```bash
curl -X POST http://localhost:5000/api/payments/momo/request \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000,
    "phoneNumber": "+250788123456",
    "orderId": "ORDER_ID",
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "currency": "RWF"
  }'
```

**Save the returned `referenceId`** as `REF_ID`

**Expected Response:**

```json
{
  "success": true,
  "status": "pending",
  "message": "MoMo payment request sent successfully..."
}
```

---

### Step 4: Check Payment Status

```bash
curl -X GET http://localhost:5000/api/payments/momo/status/REF_ID \
  -H "Authorization: Bearer TOKEN"
```

**Possible Statuses:**

- `INITIATED` - Just created
- `PENDING` - Waiting for response
- `PAYMENT_CONFIRMED` - Success! ✅
- `FAILED` - Payment rejected ❌

---

### Step 5: Confirm Payment (After PAYMENT_CONFIRMED)

```bash
curl -X POST http://localhost:5000/api/payments/momo/confirm \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "transaction_id_from_step3",
    "orderId": "ORDER_ID",
    "referenceId": "REF_ID"
  }'
```

---

### Bonus: Request Payout

```bash
curl -X POST http://localhost:5000/api/payments/momo/payout \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 2000,
    "phoneNumber": "+250788654321",
    "reason": "Delivery completed"
  }'
```

---

## 📊 Full Payment Flow

```
┌─────────────────────────────────────┐
│  1. Initiate Payment                │
│  POST /momo/request                 │
│  → Returns: referenceId             │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│  2. Wait 3-5 seconds                │
│  (Customer receives payment prompt) │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│  3. Check Status                    │
│  GET /momo/status/:referenceId      │
│  → Returns: PAYMENT_CONFIRMED       │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│  4. Confirm Payment                 │
│  POST /momo/confirm                 │
│  → Payment complete!                │
└─────────────────────────────────────┘
```

---

## 🔑 All MoMo Endpoints

| Method | Endpoint                           | Purpose                |
| ------ | ---------------------------------- | ---------------------- |
| `POST` | `/api/payments/momo/request`       | Initiate payment       |
| `GET`  | `/api/payments/momo/status/:refId` | Check payment status   |
| `POST` | `/api/payments/momo/confirm`       | Confirm payment        |
| `POST` | `/api/payments/momo/payout`        | Request payout         |
| `POST` | `/api/payments/momo/callback`      | Webhook (auto-handled) |
| `GET`  | `/api/payments/momo/config`        | Check config (admin)   |

---

## ✅ Success Checklist

- [ ] Got MTN MoMo credentials
- [ ] Updated `.env` file
- [ ] Restarted server
- [ ] Successfully initiated payment
- [ ] Status changed to PAYMENT_CONFIRMED
- [ ] Successfully confirmed payment
- [ ] Order status updated

---

## ❌ Common Errors & Fixes

### "Failed to get MoMo access token"

- Check if `.env` values are correct (copy-paste again!)
- Verify internet connection
- Check MTN MoMo dashboard shows your app

### "Invalid phone number format"

- Use: `+250788123456` or `250788123456`
- Must include country code (250)

### "Transaction not found"

- Make sure `ORDER_ID` exists
- Try creating a new order first

### Payment stays "PENDING"

- Wait 5 seconds longer
- Check if phone number is registered with MTN MoMo
- In sandbox, you may need to manually approve in dashboard

---

## 🎯 Next Steps

1. **Test with real order** - Create order with actual crop data
2. **Set up webhooks** - Add callback URL to MTN MoMo dashboard
3. **Production** - Replace sandbox URL with production URL
4. **Monitor** - Check server logs for any issues

---

**Questions?** Check `MOMO_SETUP_GUIDE.md` for detailed documentation.
