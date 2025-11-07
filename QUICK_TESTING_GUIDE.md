# Quick Testing Guide

**Backend Status**: ✅ Running on `http://localhost:5000`

---

## 🚀 Getting Started

### **1. Start the Server**

```bash
npm run dev
```

Expected output:

```
Server running in development mode on port 5000
MongoDB Connected: [connection-string]
```

### **2. Test Root Endpoint**

```bash
curl http://localhost:5000/
```

You should see the API documentation with all endpoints.

---

## 🔑 Authentication Flow

### **Step 1: Register User**

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

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "USER_ID",
      "name": "John Farmer",
      "role": "farmer"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Save the token for next requests!**

### **Step 2: Login User**

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+250788123456",
    "password": "password123"
  }'
```

---

## 📦 Cargo Management

### **Create Cargo (Farmer)**

```bash
TOKEN="your_token_here"

curl -X POST http://localhost:5000/api/cargo \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Fresh Tomatoes",
    "description": "High quality tomatoes from my farm",
    "quantity": 100,
    "unit": "kg",
    "price_per_unit": 500,
    "origin_location": "Kigali Market",
    "origin_latitude": -1.9505,
    "origin_longitude": 29.8739,
    "destination_location": "Huye Market",
    "destination_latitude": -2.6030,
    "destination_longitude": 29.7344
  }'
```

**Save the cargo ID for next requests!**

### **Get All Cargo**

```bash
curl http://localhost:5000/api/cargo
```

### **Get Specific Cargo**

```bash
CARGO_ID="cargo_id_from_previous_response"

curl http://localhost:5000/api/cargo/$CARGO_ID
```

### **Search Cargo**

```bash
curl http://localhost:5000/api/cargo/search?q=tomatoes&minPrice=100&maxPrice=1000
```

### **Update Cargo**

```bash
curl -X PUT http://localhost:5000/api/cargo/$CARGO_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 80,
    "price_per_unit": 450
  }'
```

---

## 🚛 Transporter Management

### **Register as Transporter**

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ali Transporter",
    "phone": "+250789654321",
    "password": "password123",
    "role": "transporter"
  }'
```

### **Create Transporter Profile**

```bash
TRANSPORTER_TOKEN="transporter_token"

curl -X POST http://localhost:5000/api/transporters/profile/me \
  -H "Authorization: Bearer $TRANSPORTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicle_type": "truck",
    "capacity": 5000,
    "rates": 50000,
    "phone": "+250789654321",
    "available": true
  }'
```

### **Get My Profile**

```bash
curl http://localhost:5000/api/transporters/profile/me \
  -H "Authorization: Bearer $TRANSPORTER_TOKEN"
```

### **Get All Transporters**

```bash
curl http://localhost:5000/api/transporters
```

### **Get Available Transporters**

```bash
curl http://localhost:5000/api/transporters/available
```

---

## 🚗 Trip Management

### **Find Matching Transporters**

```bash
curl -X POST http://localhost:5000/api/matching/find \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cargoId": "'$CARGO_ID'",
    "maxDistance": 50,
    "limit": 10
  }'
```

### **Send Transport Request**

```bash
TRANSPORTER_ID="transporter_id_from_matching"

curl -X POST http://localhost:5000/api/matching/request \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transporterId": "'$TRANSPORTER_ID'",
    "cargoId": "'$CARGO_ID'",
    "proposedPrice": 45000
  }'
```

**Save the request/order ID!**

### **Accept Trip (As Transporter)**

```bash
ORDER_ID="order_id_from_request"

curl -X POST http://localhost:5000/api/matching/accept/$ORDER_ID \
  -H "Authorization: Bearer $TRANSPORTER_TOKEN"
```

### **Start Trip**

```bash
curl -X PUT http://localhost:5000/api/trips/$ORDER_ID/start \
  -H "Authorization: Bearer $TRANSPORTER_TOKEN"
```

### **Complete Trip**

```bash
curl -X PUT http://localhost:5000/api/trips/$ORDER_ID/complete \
  -H "Authorization: Bearer $TRANSPORTER_TOKEN"
```

### **Get All Trips**

```bash
curl http://localhost:5000/api/trips \
  -H "Authorization: Bearer $TOKEN"
```

---

## 💳 Payment Management

### **Initiate Payment**

```bash
curl -X POST http://localhost:5000/api/payments/initiate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 45000,
    "phoneNumber": "+250788123456",
    "orderId": "'$ORDER_ID'",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Farmer",
    "currency": "RWF",
    "paymentMethod": "momo"
  }'
```

**Save the paymentReference!**

### **Check Payment Status**

```bash
PAYMENT_REF="payment_reference_from_initiate"

curl http://localhost:5000/api/payments/$PAYMENT_REF \
  -H "Authorization: Bearer $TOKEN"
```

Wait 3 seconds for auto-confirmation in demo mode.

### **Confirm Payment**

```bash
curl -X POST http://localhost:5000/api/payments/confirm \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "'$PAYMENT_REF'",
    "orderId": "'$ORDER_ID'"
  }'
```

### **Get Payment History**

```bash
curl http://localhost:5000/api/payments/history \
  -H "Authorization: Bearer $TOKEN"
```

---

## ⭐ Rating Management

### **Submit Rating**

```bash
curl -X POST http://localhost:5000/api/ratings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ratedUserId": "'$TRANSPORTER_ID'",
    "tripId": "'$ORDER_ID'",
    "rating": 5,
    "comment": "Excellent service and very professional!",
    "cleanliness": 5,
    "professionalism": 5,
    "timeliness": 5,
    "communication": 5
  }'
```

### **Get Transporter Stats**

```bash
curl http://localhost:5000/api/ratings/transporter/$TRANSPORTER_ID/stats
```

### **Get Top Transporters (Leaderboard)**

```bash
curl http://localhost:5000/api/ratings/leaderboard
```

### **Get Transporter Reviews**

```bash
curl http://localhost:5000/api/ratings/$TRANSPORTER_ID/reviews
```

---

## 💰 Wallet Management

### **Get Wallet Balance**

```bash
curl http://localhost:5000/api/wallet \
  -H "Authorization: Bearer $TOKEN"
```

### **Get Wallet Details**

```bash
curl http://localhost:5000/api/wallet/details \
  -H "Authorization: Bearer $TOKEN"
```

### **Top Up Wallet**

```bash
curl -X POST http://localhost:5000/api/wallet/topup \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100000,
    "paymentMethod": "momo"
  }'
```

### **Link Payment Method**

```bash
curl -X POST http://localhost:5000/api/wallet/link-payment \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "momo",
    "phoneNumber": "+250788123456"
  }'
```

### **Withdraw from Wallet**

First verify KYC:

```bash
curl -X POST http://localhost:5000/api/wallet/verify-kyc \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "documentType": "passport",
    "documentNumber": "PA12345678"
  }'
```

Then withdraw:

```bash
curl -X POST http://localhost:5000/api/wallet/withdraw \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50000,
    "paymentMethod": "momo"
  }'
```

---

## 📊 Statistics & Analytics

### **Get Matching Stats**

```bash
curl http://localhost:5000/api/matching/stats
```

### **Get Transporter Statistics**

```bash
curl http://localhost:5000/api/transporters/$TRANSPORTER_ID/stats
```

### **Get Completed Deliveries**

```bash
curl http://localhost:5000/api/transporters/$TRANSPORTER_ID/deliveries
```

---

## 🔍 Common Queries

### **Get User's Cargo**

```bash
USER_ID="your_user_id"

curl http://localhost:5000/api/cargo/user/$USER_ID
```

### **Get User's Orders**

```bash
curl http://localhost:5000/api/orders/user/$USER_ID \
  -H "Authorization: Bearer $TOKEN"
```

### **Get My Orders**

```bash
curl http://localhost:5000/api/orders/my-orders \
  -H "Authorization: Bearer $TOKEN"
```

### **Get Transporter's Trips**

```bash
curl http://localhost:5000/api/trips/transporter/$TRANSPORTER_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

## Using Postman

### **Steps:**

1. **Download Postman** from https://www.postman.com/downloads/

2. **Create Environment Variable**

   - Click "Environments" → "Create New"
   - Add variable: `base_url` = `http://localhost:5000`
   - Add variable: `token` = `(leave empty for now)`

3. **Create Collection** → Name it "Agri-Logistics"

4. **Add Requests**

   - Right-click collection → "Add Request"
   - Method: POST
   - URL: `{{base_url}}/api/auth/login`
   - Body (JSON):
     ```json
     {
       "phone": "+250788123456",
       "password": "password123"
     }
     ```

5. **Save Token**

   - Click "Tests" tab
   - Add:
     ```javascript
     pm.environment.set("token", pm.response.json().data.token);
     ```

6. **Use Token in Requests**
   - Go to "Headers" tab
   - Add:
     ```
     Key: Authorization
     Value: Bearer {{token}}
     ```

---

## 🚨 Troubleshooting

### **Issue: "Cannot find module"**

**Solution**: Run `npm install` in the project directory

### **Issue: "MongoDB Connected: [Error]"**

**Solution**: Check MongoDB connection string in `.env` file

### **Issue: "Invalid Token"**

**Solution**: Make sure to include `Authorization: Bearer TOKEN` header

### **Issue: "User not found"**

**Solution**: Register user first before login

### **Issue: "Only farmers can create cargo"**

**Solution**: Register as farmer role, not buyer

---

## 📝 Testing Checklist

- [ ] Server running on port 5000
- [ ] Root endpoint returns API info
- [ ] Register farmer account
- [ ] Register transporter account
- [ ] Create cargo as farmer
- [ ] Find matching transporters
- [ ] Send transport request
- [ ] Accept trip as transporter
- [ ] Initiate payment
- [ ] Confirm payment
- [ ] Complete trip
- [ ] Submit rating
- [ ] Check transporter stats
- [ ] Get wallet balance
- [ ] Test search functionality
- [ ] Test pagination
- [ ] Test filtering

---

## 💡 Tips

1. **Use Environment Variables** in Postman to avoid typing URLs/tokens
2. **Save Response** to variable for use in next request
3. **Test Pagination** with `?page=1&limit=10`
4. **Check Timestamps** - all responses include `createdAt` and `updatedAt`
5. **Monitor Logs** - check terminal for detailed error messages
6. **Use Insomnia** as alternative to Postman (both free)

---

## 📚 Additional Resources

- API Documentation: Check root endpoint at `/`
- Detailed Guide: See `CONTROLLERS_IMPLEMENTATION_SUMMARY.md`
- Implementation Status: See `IMPLEMENTATION_COMPLETE.md`
- Repository Guide: See `.zencoder/rules/repo.md`

---

**Happy Testing! 🎉**

For issues, check server logs and response error messages.
