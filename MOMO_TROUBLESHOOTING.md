# MoMo Payment API - Troubleshooting Guide

## Common Errors & Solutions

### 1. "Failed to get MoMo access token"

**Error:**

```
❌ Error getting MoMo access token: Request failed with status code 401
```

**Causes:**

- Invalid credentials in `.env`
- Expired credentials
- Wrong API endpoint URL
- Network connectivity issue

**Solutions:**

```bash
# Check 1: Verify .env credentials
# Open .env and verify these values:
# - MOMO_API_KEY (should not be empty)
# - MOMO_USER_ID (should not be empty)
# - MOMO_PRIMARY_KEY (should not be empty)

# Check 2: Verify API URL
# For sandbox: https://sandbox.momodeveloper.mtn.com
# For production: https://api.mtn.com

# Check 3: Test connectivity
curl -X POST https://sandbox.momodeveloper.mtn.com/collection/token/ \
  -H "Authorization: Basic $(echo -n 'USER_ID:API_KEY' | base64)" \
  -H "Ocp-Apim-Subscription-Key: PRIMARY_KEY"

# Check 4: Restart server after changing .env
npm run dev
```

**Prevention:**

- ✅ Double-check credentials from MTN MoMo dashboard
- ✅ Copy-paste to avoid typos
- ✅ Verify credentials are for correct environment (sandbox vs production)
- ✅ Rotate credentials regularly

---

### 2. "Invalid phone number format"

**Error:**

```
Invalid phone number format
```

**Causes:**

- Phone number missing country code
- Incorrect country code format
- Special characters in number

**Valid Formats:**

```
✅ +250788123456  (International format)
✅ 250788123456   (Country code + number)
✅ 0788123456     (Local format)
✅ 788123456      (Short format - Rwanda only)

❌ 788123456 (when country is ambiguous)
❌ 088123456 (wrong country code)
❌ +1234567 (wrong country)
```

**Solutions:**

```bash
# Always use Rwanda format for testing
# Rwanda country code: +250

# Test phone numbers:
+250788123456   # Standard test number
+250790000000   # Alternative format
250788123456    # Without +

# DO NOT use:
+12345678901    # USA format
+441234567890   # UK format
```

**Code Example:**

```javascript
// Correct
phoneNumber: "+250788123456";
phoneNumber: "250788123456";
phoneNumber: "0788123456";

// Incorrect
phoneNumber: "788123456"; // Missing country code
phoneNumber: "+25078812"; // Too short
phoneNumber: "+250 788 123 456"; // Spaces (auto-removed)
```

---

### 3. "Subscription key not recognized"

**Error:**

```
❌ 401 Unauthorized: Subscription key not recognized
```

**Causes:**

- Wrong subscription key used
- Using Secondary key for Collection API (wrong key)
- Using Primary key for Disbursement API (wrong key)
- Expired subscription

**Solutions:**

```bash
# Verify you're using correct key:
# Collection API (payments) → Use PRIMARY_KEY
# Disbursement API (payouts) → Use SECONDARY_KEY

# Check .env:
MOMO_PRIMARY_KEY=correct_primary_key_here
MOMO_SECONDARY_KEY=correct_secondary_key_here

# Get new keys:
# 1. Go to https://momodeveloper.mtn.com
# 2. Login to dashboard
# 3. Select your application
# 4. Check "Subscription Keys" tab
# 5. Copy Primary and Secondary keys
# 6. Paste into .env
```

**Implementation Note:**

```javascript
// In momoService.js - already using correct keys:
Collection API → using MOMO_PRIMARY_KEY ✅
Disbursement API → using MOMO_SECONDARY_KEY ✅
```

---

### 4. "Payment stays in PENDING status"

**Error:**

```
Payment initiated successfully, but status check returns PENDING
```

**Causes:**

- Network latency
- Customer hasn't responded to prompt yet
- MoMo service processing time
- Sandbox limitations

**Solutions:**

```bash
# Wait longer before checking
# Sandbox typically takes 5-10 seconds

# Step 1: Initiate payment
# Step 2: Wait 10 seconds
# Step 3: Check status

# If still pending after 30 seconds:
# Option A: Check server logs
npm run dev  # Look for error messages

# Option B: Manual approval in sandbox
# 1. Go to MTN MoMo dashboard
# 2. Find the payment in transactions
# 3. Manually approve if available

# Option C: Check MoMo service status
# Visit: https://momodeveloper.mtn.com/status
```

**Code Pattern:**

```javascript
// Recommended flow
async function completePayment(orderId) {
  // 1. Initiate
  const { data: payment } = await initiatePayment(orderId);

  // 2. Wait 5 seconds
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // 3. Check status
  const { data: status } = await checkStatus(payment.referenceId);

  if (status.status === "PAYMENT_CONFIRMED") {
    // 4. Confirm
    return await confirmPayment(payment.transactionId, orderId);
  }

  // Still pending - try again in 5 seconds
  return "PENDING";
}
```

---

### 5. "Transaction not found"

**Error:**

```
404 - Transaction not found
```

**Causes:**

- Wrong transaction ID or reference ID
- Transaction expired (older than 30 days)
- Transaction not created (payment never initiated)
- Using reference ID in endpoints expecting transaction ID

**Solutions:**

```bash
# Verify you're using correct ID:
# Transaction ID → Returned from initiatePayment in "transactionId"
# Reference ID → Returned from initiatePayment in "referenceId"

# Correct usage:
POST /momo/confirm → Use transactionId
GET /momo/status/:referenceId → Use referenceId

# Check what you received:
{
  "data": {
    "transactionId": "XXXX",      # Use this for confirm
    "referenceId": "MOMO_XXXX",   # Use this for status check
  }
}
```

**Prevention:**

```javascript
// Save both IDs immediately
const response = await initiatePayment();
const { transactionId, referenceId } = response.data;

// Use correct ID for each endpoint
await checkStatus(referenceId); // ✅ Correct
await checkStatus(transactionId); // ❌ Wrong

await confirmPayment(transactionId); // ✅ Correct
await confirmPayment(referenceId); // ❌ Wrong
```

---

### 6. "Amount must be a positive number"

**Error:**

```
400 - Amount must be a positive number
```

**Causes:**

- Amount is zero or negative
- Amount is not a number
- Amount is missing from request

**Solutions:**

```bash
# Verify request body:
{
  "amount": 5000,           # ✅ Correct
  "amount": 0,              # ❌ Zero
  "amount": -1000,          # ❌ Negative
  "amount": "5000",         # ⚠️ String (will be converted)
  "amount": null,           # ❌ Null
}
```

**Validation Rules:**

```javascript
// Amount validation:
- Must be > 0
- Can be string (auto-converted)
- Recommended: 100 RWF - 10,000,000 RWF
- Typical range: 1,000 - 1,000,000 RWF
```

---

### 7. "Webhook signature validation failed"

**Error:**

```
❌ Webhook signature validation failed
```

**Current Status:**

- Placeholder for implementation
- Not yet enforced in v1.0
- Will be added in security update

**When to Implement:**

```
Priority: Medium
Timeline: After production deployment
Method: HMAC-SHA256 or provider standard

For now:
- Webhooks are accepted (logged for audit)
- Production deployment should add signature validation
```

**Future Implementation:**

```javascript
// Will add in security update
async validateWebhookSignature(signature, payload, secret) {
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return hmac === signature;
}
```

---

### 8. "Insufficient balance for payout"

**Error:**

```
Insufficient balance for payout
```

**Causes:**

- User/wallet doesn't have enough funds
- Trying to payout more than earned
- Account not funded yet

**Solutions:**

```bash
# Check wallet balance first
GET /api/wallet/:userId

# Only allow payout if:
Available Balance ≥ Payout Amount

# Example:
Earned: 50,000 RWF
Requested Payout: 60,000 RWF
Status: ❌ FAILED (insufficient)

Earned: 50,000 RWF
Requested Payout: 40,000 RWF
Status: ✅ OK
```

**Validation in Frontend:**

```javascript
// Before requesting payout
if (wallet.availableBalance >= payoutAmount) {
  // Safe to request payout
  requestPayout(payoutAmount);
} else {
  // Show error
  showError("Insufficient balance");
}
```

---

### 9. "Network timeout"

**Error:**

```
Error: ECONNREFUSED / ETIMEDOUT
```

**Causes:**

- MoMo API server down
- Internet connection lost
- Firewall blocking requests
- Request taking too long

**Solutions:**

```bash
# Check 1: Internet connection
ping google.com

# Check 2: MoMo API status
# Visit: https://momodeveloper.mtn.com/status

# Check 3: API connectivity
curl -I https://sandbox.momodeveloper.mtn.com

# Check 4: Increase timeout
# In momoService.js - add timeout:
const response = await axios.post(url, data, {
  timeout: 10000,  // 10 seconds
  // ... other config
});

# Check 5: Retry logic
// Implement exponential backoff retry
async function retryRequest(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * Math.pow(2, i));
    }
  }
}
```

---

### 10. Payment "FAILED" or "REJECTED"

**Error:**

```
Payment status: FAILED
```

**Causes:**

- Customer entered wrong PIN
- Insufficient customer balance
- Network error during payment
- Customer cancelled payment
- Account limitations

**Solutions:**

```bash
# Inform user to:
1. Check MoMo account balance
2. Retry with correct PIN
3. Contact their mobile operator
4. Try different payment method

# For developers:
- Log detailed error from MoMo
- Update transaction.metadata with failure reason
- Provide user-friendly error message
- Allow retry attempt
```

**Error Response:**

```json
{
  "status": "FAILED",
  "metadata": {
    "failureReason": "Insufficient balance",
    "failureCode": "INSUF_BAL",
    "failedAt": "2025-01-15T10:45:30Z"
  }
}
```

---

## 🔍 Debugging Tips

### Enable Debug Logging

```bash
# Check server logs during operations
npm run dev

# Look for:
# 📱 MoMo operation initiated
# ✅ MoMo operation successful
# ❌ MoMo operation failed
# 🔍 Status check performed
```

### Check Configuration

```bash
curl -X GET http://localhost:5000/api/payments/momo/config \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Response shows:
# - Is MoMo configured?
# - Which credentials are set?
# - Current environment (sandbox/production)
```

### Database Inspection

```bash
# Check transactions collection
db.transactions.find({ paymentMethod: 'momo' })

# View specific transaction
db.transactions.findOne({ paymentReference: 'MOMO_XXX' })

# Check status flow
db.transactions.find({ paymentMethod: 'momo' }).sort({ createdAt: -1 }).limit(10)
```

---

## 📊 Testing Checklist

- [ ] All environment variables set in `.env`
- [ ] Server restarted after changing `.env`
- [ ] Phone number format validated
- [ ] Amount is positive number
- [ ] Order ID exists in database
- [ ] Authentication token is valid
- [ ] Network connection is stable
- [ ] MTN MoMo service is up (check status page)

---

## 🆘 Still Having Issues?

**Check These Resources:**

1. `MOMO_SETUP_GUIDE.md` - Complete setup instructions
2. `MOMO_QUICK_TEST.md` - Step-by-step testing
3. Server logs - `npm run dev` output
4. MTN MoMo dashboard - Check API status
5. Transaction records - MongoDB for details

**When Contacting Support, Include:**

1. Error message (exact text)
2. Request/response (sanitized)
3. Server logs excerpt
4. Steps to reproduce
5. Environment (sandbox/production)

---

**Last Updated:** January 2025  
**Version:** 1.0  
**Maintenance:** This guide is regularly updated with new issues
