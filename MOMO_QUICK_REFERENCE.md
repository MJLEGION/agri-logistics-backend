# MoMo API - Quick Reference Card

## 🚀 Get Started in 3 Steps

### 1️⃣ Get Credentials

- Go to: https://momodeveloper.mtn.com
- Sign up & create application
- Copy: API Key, User ID, Primary Key, Secondary Key

### 2️⃣ Update `.env`

```env
MOMO_API_KEY=your-key
MOMO_USER_ID=your-id
MOMO_PRIMARY_KEY=your-primary
MOMO_SECONDARY_KEY=your-secondary
```

### 3️⃣ Restart & Test

```bash
npm run dev
```

---

## 📍 API Endpoints

| Endpoint                         | Method | Purpose         |
| -------------------------------- | ------ | --------------- |
| `/api/payments/momo/request`     | POST   | Start payment   |
| `/api/payments/momo/status/:ref` | GET    | Check status    |
| `/api/payments/momo/confirm`     | POST   | Confirm payment |
| `/api/payments/momo/payout`      | POST   | Send money      |
| `/api/payments/momo/callback`    | POST   | Webhook         |

---

## 💬 Request/Response Examples

### Initiate Payment

```bash
curl -X POST http://localhost:5000/api/payments/momo/request \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000,
    "phoneNumber": "+250788123456",
    "orderId": "order_123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "transactionId": "txn_xxx",
    "referenceId": "MOMO_order_123_xxx",
    "amount": 5000,
    "phoneNumber": "+250788123456"
  }
}
```

---

### Check Status

```bash
curl -X GET http://localhost:5000/api/payments/momo/status/MOMO_order_123_xxx \
  -H "Authorization: Bearer TOKEN"
```

**Possible Statuses:**

- `INITIATED` - Just created
- `PENDING` - Waiting for customer
- `PAYMENT_CONFIRMED` - Success! ✅
- `FAILED` - Rejected ❌

---

### Confirm Payment

```bash
curl -X POST http://localhost:5000/api/payments/momo/confirm \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "txn_xxx",
    "orderId": "order_123",
    "referenceId": "MOMO_order_123_xxx"
  }'
```

---

### Request Payout

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

## ✅ Phone Number Formats

All work automatically:

- `+250788123456` ✅
- `250788123456` ✅
- `0788123456` ✅
- `788123456` ✅

---

## 🔑 Environment Variables

```env
# Required
MOMO_API_URL=https://sandbox.momodeveloper.mtn.com
MOMO_API_KEY=your-api-key
MOMO_USER_ID=your-user-id
MOMO_PRIMARY_KEY=your-primary-key
MOMO_SECONDARY_KEY=your-secondary-key

# Optional
MOMO_CALLBACK_URL=http://localhost:5000/api/payments/momo/callback
```

---

## 📊 Payment Flow

```
Request Payment
    ↓ (5 sec wait)
Check Status
    ↓ (if PAYMENT_CONFIRMED)
Confirm Payment
    ↓
Update Order Status
    ↓
Complete!
```

---

## ⏰ Status Timeline

| Time  | Status                      | Action                     |
| ----- | --------------------------- | -------------------------- |
| 0s    | INITIATED                   | Wait for customer response |
| 5-10s | PENDING                     | Check after 10s            |
| 15s+  | PAYMENT_CONFIRMED or FAILED | Confirm or retry           |

---

## 🛠️ Common Field Values

| Field       | Example          | Notes                 |
| ----------- | ---------------- | --------------------- |
| amount      | 5000             | RWF (Rwanda Franc)    |
| phoneNumber | +250788123456    | Rwanda format         |
| currency    | RWF              | Always RWF for Rwanda |
| orderId     | order_123        | Must exist in DB      |
| email       | user@example.com | Customer email        |

---

## ❌ Common Errors

| Error           | Solution                      |
| --------------- | ----------------------------- |
| Token failed    | Check credentials in `.env`   |
| Invalid phone   | Use format: +250788123456     |
| Order not found | Create order first            |
| Amount ≤ 0      | Use positive number           |
| PENDING         | Wait longer, then check again |

---

## 📚 Full Documentation

- **Setup Guide:** `MOMO_SETUP_GUIDE.md`
- **Testing Guide:** `MOMO_QUICK_TEST.md`
- **Troubleshooting:** `MOMO_TROUBLESHOOTING.md`
- **Implementation Details:** `MOMO_IMPLEMENTATION_SUMMARY.md`

---

## 🧪 Quick Test

```bash
# 1. Get token from login
TOKEN="your_jwt_token"
ORDER_ID="your_order_id"

# 2. Initiate payment
curl -X POST http://localhost:5000/api/payments/momo/request \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000,
    "phoneNumber": "+250788123456",
    "orderId": "'$ORDER_ID'"
  }' | jq '.data.referenceId' > /tmp/ref_id.txt

# 3. Check status (after 10s)
sleep 10
REF_ID=$(cat /tmp/ref_id.txt | tr -d '"')
curl -X GET http://localhost:5000/api/payments/momo/status/$REF_ID \
  -H "Authorization: Bearer $TOKEN" | jq '.data.status'
```

---

## 🎯 Next Steps

1. **Setup:** Follow `MOMO_SETUP_GUIDE.md`
2. **Test:** Use `MOMO_QUICK_TEST.md`
3. **Integrate:** Add to your app
4. **Monitor:** Check logs and transactions
5. **Deploy:** Move to production

---

## 🔗 Useful Links

- **MTN MoMo Dashboard:** https://momodeveloper.mtn.com
- **API Documentation:** https://momodeveloper.mtn.com/docs
- **Status Page:** https://momodeveloper.mtn.com/status
- **Support:** Contact MTN MoMo developer support

---

**Version:** 3.1.0  
**Payment Method:** MTN MoMo (Priority)  
**Status:** ✅ Live and Ready
