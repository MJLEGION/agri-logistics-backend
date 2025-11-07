# Agri-Logistics Backend Repository Guide

## Project Overview

**Repository:** Agri-Logistics Backend API  
**Technology Stack:** Node.js + Express + MongoDB + JWT  
**API Port:** 5000  
**Base URL:** `http://localhost:5000/api`

## Project Structure

```
src/
├── config/
│   └── database.js           # MongoDB connection setup
├── middleware/
│   └── auth.js              # JWT authentication & role-based authorization
├── models/
│   ├── user.js              # User schema (farmer, buyer, transporter)
│   ├── crop.js              # Crop/product listings
│   ├── order.js             # Order management
│   ├── transaction.js       # Payment transactions
│   └── transporter.js       # Transporter profiles (NEW)
├── controllers/
│   ├── authController.js    # Auth operations
│   ├── cropController.js    # Crop operations
│   ├── orderController.js   # Order operations
│   ├── paymentController.js # Payment operations
│   └── transporterController.js  # Transporter operations (NEW)
├── routes/
│   ├── authRoutes.js        # Auth endpoints
│   ├── cropRoutes.js        # Crop endpoints
│   ├── orderRoutes.js       # Order endpoints
│   ├── paymentRoutes.js     # Payment endpoints
│   └── transporterRoutes.js # Transporter endpoints (NEW)
└── server.js                # Express server setup

package.json                 # Dependencies
.env                        # Environment variables
```

## API Endpoints

### Authentication (`/api/auth`)

- `POST /register` - Register new user
- `POST /login` - Login user
- `POST /refresh` - Refresh JWT token
- `POST /logout` - Logout user
- `GET /me` - Get current user

### Crops (`/api/crops`)

- `GET /` - Get all crops
- `GET /:id` - Get crop by ID
- `GET /user/:userId` - Get user's crops (NEW)
- `GET /farmer/:farmerId` - Get farmer's crops (legacy)
- `POST /` - Create new crop
- `PUT /:id` - Update crop
- `DELETE /:id` - Delete crop

### Orders (`/api/orders`)

- `GET /` - Get all orders
- `GET /my-orders` - Get current user's orders
- `GET /user/:userId` - Get specific user's orders (NEW)
- `GET /:id` - Get order by ID
- `POST /` - Create new order
- `PUT /:id` - Update order
- `DELETE /:id` - Delete order (NEW)
- `PUT /:id/accept` - Accept order (transporter)

### Transporters (`/api/transporters`) - NEW

- `GET /` - Get all transporters
- `GET /available` - Get available transporters
- `GET /:id` - Get transporter by ID
- `GET /profile/me` - Get my profile
- `POST /profile/me` - Create/update my profile
- `PUT /:id` - Update transporter profile

### Payments (`/api/payments`)

- `POST /initiate` - Initiate payment (NEW)
- `POST /flutterwave/initiate` - Initiate payment (legacy)
- `GET /:id` - Get payment status (NEW)
- `GET /flutterwave/status/:referenceId` - Get payment status (legacy)
- `POST /confirm` - Confirm payment (NEW)
- `POST /flutterwave/verify` - Verify payment (legacy)

## Recent Updates (Alignment with Frontend Integration Guide)

### Latest Addition: MTN MoMo Payment Integration ✨

**Status:** ✅ Complete and Ready for Use

**New Endpoints (v3.1.0):**

- `POST /api/payments/momo/request` - Initiate MoMo payment
- `GET /api/payments/momo/status/:referenceId` - Check payment status
- `POST /api/payments/momo/confirm` - Confirm payment
- `POST /api/payments/momo/payout` - Request payout to user
- `POST /api/payments/momo/callback` - Webhook handler
- `GET /api/payments/momo/config` - View configuration (admin)

**Features:**

- ✅ Mobile money payment collection
- ✅ Payout/disbursement support
- ✅ Automatic token management
- ✅ Phone number auto-formatting
- ✅ Webhook callback handling
- ✅ Transaction tracking
- ✅ Status monitoring

**Documentation:**

- `MOMO_SETUP_GUIDE.md` - Complete setup instructions
- `MOMO_QUICK_TEST.md` - Quick 5-minute testing guide
- `MOMO_IMPLEMENTATION_SUMMARY.md` - Technical details

**Environment Variables Added:**

```env
MOMO_API_URL
MOMO_API_KEY
MOMO_USER_ID
MOMO_PRIMARY_KEY
MOMO_SECONDARY_KEY
MOMO_CALLBACK_URL
```

---

### Completed Fixes

1. **Added Transporter Functionality**

   - Created `transporter.js` model
   - Created `transporterController.js`
   - Created `transporterRoutes.js`
   - Integrated into server.js

2. **Added Missing Endpoints**

   - `/crops/user/:userId` - Get user's crops
   - `/orders/user/:userId` - Get user's orders
   - `/orders/:id` DELETE - Delete order
   - `/transporters/profile/me` - Get/create transporter profile

3. **Updated Payment Routes**

   - Added `/payments/initiate` endpoint
   - Added `/payments/:id` endpoint (for GET)
   - Added `/payments/confirm` endpoint
   - Maintained backward compatibility with old endpoints

4. **Improved Flexibility**
   - Payment controller accepts both old and new parameter formats
   - Multiple endpoint aliases for better compatibility

## Authentication & Security

- JWT tokens with 1-hour expiration
- Refresh tokens with 7-day expiration
- Role-based access control (farmer, buyer, transporter)
- Account lockout after 5 failed login attempts (15 minutes)
- Password hashing with bcryptjs
- Phone number validation (Nigerian & Rwandan formats)

## Database Models

### User

- name, phone, password, role
- failedLoginAttempts, accountLockedUntil
- refreshTokens (array for token management)

### Crop

- farmerId, name, quantity, unit
- pricePerUnit, harvestDate, location
- status (listed, matched, picked_up, in_transit, delivered)

### Order

- cropId, farmerId, buyerId, transporterId
- quantity, totalPrice
- pickupLocation, deliveryLocation
- status (accepted, assigned, in_progress, delivered)

### Transporter

- userId, vehicle_type, capacity, rates
- available, location, rating
- completedDeliveries, phone, name

### Transaction

- orderId, userId, referenceId, flutterwaveId
- phoneNumber, amount, currency, paymentMethod
- status, metadata

## Environment Variables

Create a `.env` file with:

```env
MONGODB_URI=mongodb://your-connection-string
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
PORT=5000
NODE_ENV=development
```

## Testing the API

### Quick Health Check

```bash
curl http://localhost:5000/
```

### Test Authentication

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","phone":"+250788123456","password":"pass123","role":"farmer"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+250788123456","password":"pass123"}'

# Get current user (add token to header)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/auth/me
```

### Test Transporters

```bash
# Get all transporters
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/transporters

# Get available transporters
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/transporters/available

# Create transporter profile
curl -X POST http://localhost:5000/api/transporters/profile/me \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"vehicle_type":"truck","capacity":5000,"rates":50000}'
```

## Running the Server

```bash
# Development (with nodemon)
npm run dev

# Production
npm start
```

## Known Issues & Notes

1. **Payment System**: Currently uses mock implementation for demo purposes. Integrate with real Flutterwave API for production.

2. **Transporter Route Conflict**: The `/profile/me` route is defined before `/:id` route to prevent `/profile/me` from being intercepted as `/:id = profile`.

3. **Backward Compatibility**: Old endpoints still work alongside new ones. Plan to deprecate old endpoints in future versions.

4. **Token Blacklist**: Currently uses in-memory Set for demo. Use Redis in production.

## Validation & Data Requirements

### User Registration

- Phone: Valid Nigerian or Rwandan format
- Password: Minimum 6 characters
- Name: Minimum 2 characters
- Role: farmer, buyer, or transporter

### Crop Listing

- name, quantity (positive number)
- location: {latitude, longitude, address}
- harvestDate: Valid ISO date

### Order Creation

- cropId, quantity, totalPrice
- pickupLocation & deliveryLocation with lat/lon/address

### Transporter Profile

- vehicle_type: bicycle, motorcycle, car, van, truck, lorry
- capacity: Positive number
- rates: Positive number

## Support & Debugging

1. Check backend logs for errors
2. Use MongoDB Compass to inspect database
3. Use Postman or curl for API testing
4. Verify JWT token expiration
5. Check CORS configuration

## Integration with Frontend

The backend is designed to work with the Agri-Logistics frontend. See the integration guide for:

- Service implementation
- Redux state management
- Component integration
- Testing procedures

---

**Last Updated:** 2025  
**Maintainer:** Development Team  
**Status:** ✅ Ready for Integration Testing
