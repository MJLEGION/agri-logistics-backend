# Controllers Implementation Summary

## Overview

This document describes the comprehensive controller implementations for the Agri-Logistics Backend API. All controllers follow the documentation specifications with MongoDB integration.

---

## 🎯 Implemented Controllers

### 1. **Cargo Controller** (`cargoController.js`)

Handles cargo/product listings with advanced features.

**Key Methods:**

- `getAll()` - Get all cargo with pagination, filtering, and sorting
- `getById()` - Get single cargo by ID
- `create()` - Create new cargo listing (farmers/shippers only)
- `update()` - Update cargo details (owner only)
- `delete()` - Delete cargo (owner only)
- `getByUserId()` - Get cargo by user/farmer ID
- `search()` - Advanced search with text and filters
- `getNearby()` - Find cargo near location (geospatial)
- `updateStatus()` - Update cargo status (listed → matched → in_transit → delivered)

**Endpoints:**

```
GET    /api/cargo                    - Get all cargo (paginated)
GET    /api/cargo/:id                - Get cargo by ID
GET    /api/cargo/user/:userId       - Get user's cargo
GET    /api/cargo/nearby             - Get nearby cargo
GET    /api/cargo/search             - Search cargo with filters
POST   /api/cargo                    - Create cargo (protected)
PUT    /api/cargo/:id                - Update cargo (protected)
DELETE /api/cargo/:id                - Delete cargo (protected)
PUT    /api/cargo/:id/status         - Update status (protected)
```

---

### 2. **Trip Controller** (`tripController.js`)

Manages trip creation, acceptance, and lifecycle management.

**Key Methods:**

- `getAll()` - Get all trips with filtering and pagination
- `getById()` - Get trip details
- `create()` - Create new trip (transporters only)
- `acceptTrip()` - Accept pending trip
- `startTrip()` - Mark trip as in progress
- `completeTrip()` - Mark trip as completed
- `cancelTrip()` - Cancel trip
- `getByTransporter()` - Get transporter's trips
- `getAvailable()` - Get pending trips
- `updateLocation()` - Update GPS location

**Endpoints:**

```
GET    /api/trips                       - Get all trips (paginated)
GET    /api/trips/available             - Get available trips
GET    /api/trips/:id                   - Get trip by ID
GET    /api/trips/transporter/:id       - Get transporter's trips
POST   /api/trips                       - Create trip (protected)
POST   /api/trips/:id/accept            - Accept trip (protected)
PUT    /api/trips/:id/start             - Start trip (protected)
PUT    /api/trips/:id/complete          - Complete trip (protected)
PUT    /api/trips/:id/cancel            - Cancel trip (protected)
PUT    /api/trips/:id/location          - Update location (protected)
```

---

### 3. **Payment Controller** (Enhanced `paymentController.js`)

Comprehensive payment processing with multiple payment methods.

**Key Methods:**

- `initiatePayment()` - Start payment process
- `checkPaymentStatus()` - Check payment status
- `confirmPayment()` - Confirm payment completion
- `getPaymentHistory()` - Get user's payment history
- `getPaymentDetails()` - Get detailed payment info
- `refundPayment()` - Process refund (admin only)
- `getEarnings()` - Get transporter earnings

**Features:**

- Multiple payment methods: MoMo, Airtel, Bank, Card
- Auto-confirmation (3 seconds for demo)
- Status tracking: INITIATED → PAYMENT_PROCESSING → PAYMENT_CONFIRMED
- Escrow support
- Transaction history

**Endpoints:**

```
POST   /api/payments/initiate           - Initiate payment
GET    /api/payments/:id                - Check payment status
POST   /api/payments/confirm            - Confirm payment
GET    /api/payments/:id/details        - Get payment details
GET    /api/payments/history            - Get history (protected)
POST   /api/payments/:id/refund         - Refund payment (admin only)
GET    /api/payments/earnings           - Get earnings (transporter)
```

---

### 4. **Rating Controller** (Enhanced `ratingController.js`)

Comprehensive rating and review system for transporters.

**Key Methods:**

- `createRating()` - Submit rating (protected)
- `getUserRatings()` - Get ratings for user
- `getTransporterStats()` - Get stats with breakdown
- `getTransporterReviews()` - Get reviews
- `getLeaderboard()` - Get top transporters
- `updateRating()` - Update rating (owner only)
- `deleteRating()` - Delete rating (owner/admin)

**Features:**

- 5-star rating system
- Category ratings: cleanliness, professionalism, timeliness, communication
- Statistics with averages
- Rating breakdown (1-5 stars)
- Leaderboard with top performers
- Minimum rating requirements (5+ ratings)

**Endpoints:**

```
POST   /api/ratings                     - Create rating (protected)
GET    /api/ratings/user/:userId        - Get user ratings
GET    /api/ratings/transporter/:id/stats - Get transporter stats
GET    /api/ratings/:userId/reviews     - Get reviews
GET    /api/ratings/leaderboard         - Get leaderboard
PUT    /api/ratings/:id                 - Update rating (protected)
DELETE /api/ratings/:id                 - Delete rating (protected)
```

---

### 5. **Transporter Controller** (Enhanced `transporterController.js`)

Complete transporter profile and management system.

**Key Methods:**

- `getAll()` - Get all transporters with filtering
- `getAvailable()` - Get available transporters only
- `getById()` - Get transporter profile
- `getMyProfile()` - Get current user's profile
- `createOrUpdateProfile()` - Create/update profile
- `update()` - Update profile details
- `toggleAvailability()` - Toggle online/offline status
- `getCompletedDeliveries()` - Get completed trips
- `getActiveTrips()` - Get active trips
- `getStats()` - Get comprehensive statistics

**Features:**

- Vehicle types: bicycle, motorcycle, car, van, truck, lorry
- Capacity tracking
- Rating integration
- Availability status
- KYC verification support
- Statistics dashboard

**Endpoints:**

```
GET    /api/transporters                   - Get all transporters
GET    /api/transporters/available         - Get available
GET    /api/transporters/:id               - Get by ID
GET    /api/transporters/:id/stats         - Get statistics
GET    /api/transporters/:id/deliveries    - Get deliveries
GET    /api/transporters/:id/active-trips  - Get active trips
GET    /api/transporters/profile/me        - Get my profile (protected)
POST   /api/transporters/profile/me        - Create/update profile (protected)
PUT    /api/transporters/:id               - Update profile (protected)
PUT    /api/transporters/:id/availability  - Toggle availability (protected)
```

---

### 6. **Wallet Controller** (`walletController.js`)

User wallet and balance management system.

**Key Methods:**

- `getBalance()` - Get wallet balance
- `getDetails()` - Get full wallet details
- `topUp()` - Add funds to wallet
- `withdraw()` - Withdraw from wallet
- `linkPaymentMethod()` - Link payment account
- `verifyKYC()` - Verify identity
- `getTransactionHistory()` - Get transaction history
- `freezeWallet()` - Freeze wallet (admin)
- `unfreezeWallet()` - Unfreeze wallet (admin)

**Features:**

- Multiple payment methods: MoMo, Airtel, Bank
- KYC verification required for withdrawals
- Transaction history
- Account linking
- Admin controls (freeze/unfreeze)
- Balance tracking: balance, totalEarned, totalSpent, totalRefunded

**Endpoints:**

```
GET    /api/wallet                     - Get balance (protected)
GET    /api/wallet/details             - Get details (protected)
GET    /api/wallet/transactions        - Get history (protected)
POST   /api/wallet/topup               - Top up (protected)
POST   /api/wallet/withdraw            - Withdraw (protected)
POST   /api/wallet/link-payment        - Link payment (protected)
POST   /api/wallet/verify-kyc          - Verify KYC (protected)
PUT    /api/wallet/:userId/freeze      - Freeze (admin only)
PUT    /api/wallet/:userId/unfreeze    - Unfreeze (admin only)
```

---

### 7. **Matching Controller** (`matchingController.js`)

Intelligent cargo-transporter matching system.

**Key Methods:**

- `findMatchingTransporters()` - Find transporters for cargo
- `findAvailableCargo()` - Find cargo for transporter
- `sendTransportRequest()` - Send request to transporter
- `getPendingRequests()` - Get pending requests
- `acceptRequest()` - Accept request
- `rejectRequest()` - Reject request
- `getStats()` - Get matching statistics

**Features:**

- Smart matching based on: capacity, rating, availability
- Match scoring algorithm
- Request management
- Statistics tracking
- Distance-based matching

**Endpoints:**

```
POST   /api/matching/find                  - Find matching transporters
GET    /api/matching/available-cargo       - Find cargo (transporter)
GET    /api/matching/pending-requests      - Get pending (transporter)
GET    /api/matching/stats                 - Get statistics
POST   /api/matching/request               - Send request (protected)
POST   /api/matching/accept/:requestId     - Accept (transporter)
POST   /api/matching/reject/:requestId     - Reject (transporter)
```

---

## 🔄 Status Flows

### Cargo Status Flow

```
listed → matched → picked_up → in_transit → delivered
```

### Trip Status Flow

```
pending → accepted → in_progress → completed
         (↓ can cancel at any point)
         cancelled
```

### Payment Status Flow

```
INITIATED → PAYMENT_PROCESSING → PAYMENT_CONFIRMED → COMPLETED
          (↓ can fail)
          FAILED
```

---

## 🔐 Authentication & Authorization

### Role-Based Access Control

- **Public endpoints**: No authentication required
- **Protected endpoints**: Require JWT token
- **Role-specific**: farmer, buyer, transporter, admin

### Protected Route Example

```javascript
router.post("/", protect, authorize("transporter"), tripController.create);
```

---

## 📊 Data Validation

### Common Validations

- **Amount**: Must be positive number
- **Quantity**: Must be positive number
- **Latitude/Longitude**: Valid ranges (-90 to 90 / -180 to 180)
- **Rating**: 1-5 scale
- **Payment Method**: momo, airtel, bank, card
- **Vehicle Type**: bicycle, motorcycle, car, van, truck, lorry

---

## 🔍 Search & Filtering

### Cargo Search

```
GET /api/cargo/search?q=maize&minPrice=1000&maxPrice=50000&status=listed
```

### Transporter Filtering

```
GET /api/transporters?vehicleType=truck&minRating=4&page=1&limit=20
```

### Payment History

```
GET /api/payments/history?status=COMPLETED&page=1&limit=20
```

---

## 📈 Statistics & Analytics

### Transporter Statistics

```json
{
  "completedDeliveries": 45,
  "rating": 4.8,
  "averageRating": 4.8,
  "totalRatings": 23,
  "activeTrips": 2,
  "successRate": "95.6%"
}
```

### Cargo Matching Stats

```json
{
  "totalCargo": 150,
  "totalAvailableTransporters": 45,
  "pendingRequests": 12,
  "acceptedRequests": 8,
  "completedTrips": 89,
  "successRate": "86.4%"
}
```

---

## 🔄 Integration Points

### Cargo ↔ Trips

- Create trip from cargo
- Update cargo status when trip changes
- Link trip to cargo

### Trips ↔ Payments

- Create payment when trip accepted
- Confirm payment when trip completed
- Refund if trip cancelled

### Transporter ↔ Ratings

- Update transporter rating when new rating added
- Display stats on transporter profile
- Filter by rating in matching

### Wallet ↔ Payments

- Deduct from wallet on transaction
- Add to wallet on earnings
- Track transaction history

---

## 🚀 Usage Examples

### Create Cargo

```bash
curl -X POST http://localhost:5000/api/cargo \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Maize 50kg",
    "quantity": 50,
    "unit": "kg",
    "price_per_unit": 1000,
    "origin_location": "Kigali",
    "destination_location": "Huye"
  }'
```

### Find Matching Transporters

```bash
curl -X POST http://localhost:5000/api/matching/find \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cargoId": "CARGO_ID"}'
```

### Submit Rating

```bash
curl -X POST http://localhost:5000/api/ratings \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ratedUserId": "TRANSPORTER_ID",
    "rating": 5,
    "comment": "Excellent service!",
    "cleanliness": 5,
    "professionalism": 5,
    "timeliness": 5,
    "communication": 5
  }'
```

### Get Wallet Balance

```bash
curl http://localhost:5000/api/wallet \
  -H "Authorization: Bearer TOKEN"
```

---

## ⚙️ Configuration

### Environment Variables

```env
MONGODB_URI=mongodb://localhost:27017/agri-logistics
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
PORT=5000
NODE_ENV=development
```

---

## 📝 Error Handling

All controllers follow consistent error handling:

```json
{
  "success": false,
  "error": "Error message here",
  "status": 400
}
```

Success responses:

```json
{
  "success": true,
  "data": {...},
  "message": "Operation successful"
}
```

---

## Testing Tips

1. **Register User**: First create account
2. **Create Cargo**: Add product listing
3. **Find Transporters**: Match with carriers
4. **Send Request**: Initiate transport
5. **Accept Request**: Transporter accepts
6. **Process Payment**: Initiate payment
7. **Complete Trip**: Finish delivery
8. **Submit Rating**: Rate transporter

---

## 📚 Documentation Links

- **API Reference**: See API_REFERENCE.md
- **Frontend Integration**: See integration guides
- **Database Models**: See models/ directory
- **Configuration**: See .env.example

---

## ✅ Status

**Implementation Status**: ✅ COMPLETE

All controllers are fully functional and ready for integration testing.

**Last Updated**: 2025
**Version**: 3.0.0
