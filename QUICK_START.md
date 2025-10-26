# Backend Quick Start Guide

Get the Agri-Logistics backend running in 5 minutes! ⚡

---

## 📋 Prerequisites

- Node.js (v14+)
- MongoDB (local or Atlas)
- npm or yarn
- Git

---

## 🚀 Step 1: Install Dependencies (2 min)

```bash
npm install
```

**What's being installed:**

- express (web framework)
- mongoose (MongoDB ODM)
- jsonwebtoken (JWT auth)
- bcryptjs (password hashing)
- cors (cross-origin requests)
- dotenv (environment variables)

---

## ⚙️ Step 2: Configure Environment (1 min)

Create a `.env` file in the root directory:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/agri-logistics
# Or use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/agri-logistics

# JWT Secrets
JWT_SECRET=your_jwt_secret_key_here_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_key_min_32_chars

# Server
PORT=5000
NODE_ENV=development
```

**Getting MongoDB:**

**Local MongoDB:**

```bash
# Install MongoDB Community
# Then start the server
mongod
```

**MongoDB Atlas (Cloud):**

1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create a cluster
4. Get connection string
5. Add it to `MONGODB_URI`

---

## ✅ Step 3: Verify Setup (1 min)

Test MongoDB connection:

```bash
# Start the server
npm run dev

# In another terminal, test the API
curl http://localhost:5000/
```

**Expected response:**

```json
{
  "message": "Agri-Logistics API",
  "version": "1.0.0",
  "endpoints": {...}
}
```

If you see this, you're good to go! ✅

---

## 🧪 Step 4: Quick Test (1 min)

### Test 1: Register a User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Farmer",
    "phone": "+250788123456",
    "password": "password123",
    "role": "farmer"
  }'
```

**Expected response:**

```json
{
  "success": true,
  "message": "Registration successful",
  "token": "eyJhbGc...",
  "user": {
    "_id": "...",
    "name": "Test Farmer",
    "role": "farmer"
  }
}
```

**Save the token!** You'll need it for the next test.

### Test 2: Get Current User

```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:5000/api/auth/me
```

**Expected response:**

```json
{
  "_id": "...",
  "name": "Test Farmer",
  "phone": "+250788123456",
  "role": "farmer"
}
```

### Test 3: Get All Transporters

```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:5000/api/transporters
```

**Expected response:** Empty array `[]` (no transporters yet, but endpoint works!)

---

## 🎯 Test Data Setup

### Create Sample User Accounts

```bash
# Farmer
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Farmer",
    "phone": "+250788111111",
    "password": "password123",
    "role": "farmer"
  }'

# Buyer
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Buyer",
    "phone": "+250788222222",
    "password": "password123",
    "role": "buyer"
  }'

# Transporter
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bob Transporter",
    "phone": "+250788333333",
    "password": "password123",
    "role": "transporter"
  }'
```

### Create Sample Crop (as Farmer)

Use the FARMER_TOKEN from above:

```bash
curl -X POST http://localhost:5000/api/crops \
  -H "Authorization: Bearer FARMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tomatoes",
    "quantity": 100,
    "unit": "kg",
    "pricePerUnit": 500,
    "harvestDate": "2025-02-01T00:00:00Z",
    "location": {
      "latitude": -1.9536,
      "longitude": 29.8739,
      "address": "Kigali, Rwanda"
    }
  }'
```

---

## 📚 Next Steps

### Full Endpoint Testing

See `BACKEND_VALIDATION_GUIDE.md` for all 27 endpoints with examples.

### Integration with Frontend

See `BACKEND_INTEGRATION_GUIDE.md` (in frontend repo) for service setup.

### Code Structure

See `.zencoder/rules/repo.md` for detailed repository documentation.

---

## 🛠️ Development Commands

```bash
# Run with auto-reload (development)
npm run dev

# Run production
npm start

# Install new package
npm install package-name

# Check Node version
node --version

# Check npm version
npm --version
```

---

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Find and kill process on port 5000
# Windows
netstat -ano | findstr :5000
taskkill /PID PID_NUMBER /F

# Mac/Linux
lsof -i :5000
kill -9 PID_NUMBER
```

### MongoDB Connection Error

```
Error: connect ECONNREFUSED
```

**Solution:**

- Make sure MongoDB is running
- Check `MONGODB_URI` is correct
- Test connection: `mongosh` or `mongo`

### Invalid Token Error

```
Not authorized, token failed
```

**Solution:**

- Token may be expired (1 hour expiration)
- Check token is included in Authorization header
- Use refresh endpoint to get new token

### CORS Error in Frontend

```
Access to XMLHttpRequest blocked by CORS
```

**Solution:**

- CORS is enabled in server.js
- Check frontend is on same or allowed origin
- Verify backend is running on port 5000

---

## 📊 API Health Check

Quick script to verify all systems:

```bash
#!/bin/bash

BASE_URL="http://localhost:5000/api"

echo "🔍 Backend Health Check"
echo "======================"

# Check API is running
echo -n "1. API Server: "
if curl -s $BASE_URL > /dev/null; then
  echo "✅ Running on port 5000"
else
  echo "❌ Not running"
  exit 1
fi

# Check auth endpoint
echo -n "2. Auth Endpoint: "
if curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"test","password":"test"}' | grep -q "Invalid"; then
  echo "✅ Working"
else
  echo "⚠️  Check response"
fi

# Check crops endpoint
echo "3. Full Endpoint List:"
curl -s $BASE_URL | jq '.endpoints'

echo ""
echo "🎉 Backend is ready!"
```

Save as `healthcheck.sh` and run:

```bash
bash healthcheck.sh
```

---

## 📱 Testing with Postman

### Import Collection

1. Open Postman
2. Click "Import"
3. Choose "Paste Raw Text"
4. Paste this:

```json
{
  "info": {
    "name": "Agri-Logistics API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Register",
      "request": {
        "method": "POST",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "url": { "raw": "{{base_url}}/auth/register" },
        "body": {
          "mode": "raw",
          "raw": "{\"name\":\"Test\",\"phone\":\"+250788123456\",\"password\":\"password123\",\"role\":\"farmer\"}"
        }
      }
    },
    {
      "name": "Get Transporters",
      "request": {
        "method": "GET",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
        "url": { "raw": "{{base_url}}/transporters" }
      }
    }
  ]
}
```

5. Set environment variables:
   - `base_url`: `http://localhost:5000/api`
   - `token`: (get from register/login response)

---

## ✨ You're All Set!

Your backend is now:

- ✅ Running on `http://localhost:5000`
- ✅ Connected to MongoDB
- ✅ Ready for API testing
- ✅ Ready for frontend integration

**Next Steps:**

1. Run the validation tests
2. Start integrating with frontend
3. Build awesome features! 🚀

---

## 📞 Quick Help

| Problem             | Solution                                        |
| ------------------- | ----------------------------------------------- |
| Backend won't start | Check MongoDB is running, ports are free        |
| API returns 401     | Token missing or expired, use refresh endpoint  |
| Registration fails  | Check phone format (+250... or +234...)         |
| CORS errors         | Backend has CORS enabled, check frontend origin |
| Database errors     | Check MONGODB_URI, user permissions             |

---

## 🎓 Learn More

- **API Details:** See `BACKEND_VALIDATION_GUIDE.md`
- **Full Documentation:** See `.zencoder/rules/repo.md`
- **Changes Summary:** See `INTEGRATION_ALIGNMENT_SUMMARY.md`
- **Express Docs:** https://expressjs.com/
- **MongoDB Docs:** https://docs.mongodb.com/
- **JWT Docs:** https://jwt.io/

---

**Status: Ready to Go! 🚀**

Start with `npm run dev` and happy coding! 🎉
