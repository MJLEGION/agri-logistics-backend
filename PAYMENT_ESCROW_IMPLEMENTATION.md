# 💳 Payment Escrow System - Implementation Guide

**Backend Implementation of Payment Escrow System for Agri-Logistics Platform**

---

## 📋 Overview

This document describes the complete backend implementation of the Payment Escrow System, which manages payments between farmers and transporters with secure escrow holding and dispute resolution.

### What Was Implemented

✅ **MongoDB Models:**

- Wallet - User account balances and payment methods
- Transaction - Payment transaction tracking
- Escrow - Escrow hold management
- Receipt - Transaction receipts and delivery proof
- Dispute - Dispute management and resolution
- AuditLog - System audit trail

✅ **Service Layer:**

- EscrowService - Escrow operations (hold, release, refund, dispute)
- PaymentService - Payment initiation and processing
- ReceiptService - Receipt generation and management
- DisputeService - Dispute handling

✅ **Controllers:**

- TransactionController - Payment transaction endpoints
- EscrowController - Escrow management endpoints
- ReceiptController - Receipt endpoints
- DisputeController - Dispute endpoints
- WalletController - Wallet management endpoints

✅ **API Routes:**

- `/api/transactions` - Payment transactions
- `/api/escrows` - Escrow management
- `/api/receipts` - Receipts
- `/api/disputes` - Disputes
- `/api/wallets` - Wallets

---

## 🗄️ Database Models

### 1. Wallet Model

**Purpose:** Store user wallet information and balance

```javascript
{
  userId: ObjectId (ref: User),
  balance: Number (default: 0),
  currency: String (default: 'RWF'),
  totalEarned: Number,
  totalSpent: Number,
  totalRefunded: Number,
  momoPhoneNumber: String,
  airtelPhoneNumber: String,
  bankAccount: String,
  status: 'active' | 'frozen' | 'closed',
  kycVerified: Boolean,
  kycVerifiedAt: Date,
  timestamps: true
}
```

**Key Methods:**

- `findOne({ userId })` - Get wallet for user
- `updateBalance()` - Update balance

---

### 2. Transaction Model

**Purpose:** Track payment transactions

```javascript
{
  farmerId: ObjectId (ref: User),
  transporterId: ObjectId (ref: User),
  orderId: ObjectId (ref: Order),
  cropId: ObjectId (ref: Crop),
  cargoDescription: String,
  pickupLocation: String,
  dropoffLocation: String,
  pickupTime: Date,
  estimatedDeliveryTime: Date,
  actualDeliveryTime: Date,
  amount: Number,
  currency: String,
  paymentMethod: 'momo' | 'airtel' | 'card' | 'bank',
  status: 'INITIATED' | 'PAYMENT_PROCESSING' | 'PAYMENT_CONFIRMED' |
          'ESCROW_HELD' | 'IN_TRANSIT' | 'DELIVERED' | 'COMPLETED' |
          'FAILED' | 'CANCELLED' | 'DISPUTED' | 'REFUNDED',
  escrowId: ObjectId (ref: Escrow),
  receiptId: ObjectId (ref: Receipt),
  paymentReference: String (unique),
  trackingNumber: String (unique),
  metadata: Object,
  timestamps: true
}
```

**Status Flow:**

```
INITIATED → PAYMENT_PROCESSING → PAYMENT_CONFIRMED → ESCROW_HELD → DELIVERED → COMPLETED
                    ↓
                  FAILED
```

---

### 3. Escrow Model

**Purpose:** Hold funds between parties until delivery

```javascript
{
  transactionId: ObjectId (ref: Transaction, unique),
  orderId: ObjectId (ref: Order),
  farmerId: ObjectId (ref: User),
  transporterId: ObjectId (ref: User),
  amount: Number,
  currency: String,
  status: 'HELD' | 'RELEASED' | 'REFUNDED' | 'DISPUTED',
  heldAt: Date (default: now),
  heldUntil: Date (24 hours from now),
  releasedAt: Date,
  refundedAt: Date,
  releaseReason: String,
  refundReason: String,
  disputeReason: String,
  disputedBy: 'farmer' | 'transporter',
  disputeEvidence: Object,
  paymentMethod: 'momo' | 'airtel' | 'card' | 'bank',
  metadata: Object,
  timestamps: true
}
```

**Auto-Release:** Escrows are automatically released after 24 hours if not disputed

---

### 4. Receipt Model

**Purpose:** Generate and store transaction receipts

```javascript
{
  transactionId: ObjectId (ref: Transaction, unique),
  orderId: ObjectId (ref: Order),
  escrowId: ObjectId (ref: Escrow),
  farmerId: ObjectId (ref: User),
  transporterId: ObjectId (ref: User),
  receiptNumber: String (unique),
  receiptDate: Date,
  subtotal: Number,
  platformFee: Number (default: 0),
  tax: Number (default: 0),
  total: Number,
  currency: String,
  items: Array,
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'COMPLETED' | 'REFUNDED',
  deliveryProof: Object,
  jsonData: String,
  htmlData: String,
  emailSentToFarmer: Boolean,
  emailSentToTransporter: Boolean,
  emailSentAt: Date,
  printCount: Number,
  lastPrintedAt: Date,
  timestamps: true
}
```

---

### 5. Dispute Model

**Purpose:** Handle transaction disputes

```javascript
{
  escrowId: ObjectId (ref: Escrow),
  transactionId: ObjectId (ref: Transaction),
  orderId: ObjectId (ref: Order),
  raisedBy: ObjectId (ref: User),
  raisedByRole: 'farmer' | 'transporter',
  reason: String,
  evidence: Object,
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED',
  resolution: 'REFUNDED' | 'RELEASED' | 'PARTIAL_REFUND',
  resolutionReason: String,
  resolvedBy: ObjectId (ref: User),
  raisedAt: Date (default: now),
  reviewedAt: Date,
  resolvedAt: Date,
  timestamps: true
}
```

---

### 6. AuditLog Model

**Purpose:** Track all system actions for compliance

```javascript
{
  action: String,
  userId: ObjectId (ref: User),
  ipAddress: String,
  userAgent: String,
  entityType: String,
  entityId: ObjectId,
  changes: Object,
  metadata: Object,
  success: Boolean,
  errorMessage: String,
  createdAt: Date (default: now)
}
```

---

## 🔌 API Endpoints

### Transaction Endpoints

#### 1. Initiate Payment

```
POST /api/transactions/initiate
Headers: Authorization: Bearer {token}
Body: {
  farmerId: string,
  transporterId: string,
  orderId: string,
  cropId: string (optional),
  cargoDescription: string,
  pickupLocation: string,
  dropoffLocation: string,
  pickupTime: datetime,
  estimatedDeliveryTime: datetime,
  amount: number,
  currency: string (default: 'RWF'),
  paymentMethod: 'momo' | 'airtel' | 'card' | 'bank',
  metadata: object (optional)
}
Response: {
  success: true,
  message: 'Payment initiated successfully',
  data: { Transaction object with paymentReference and trackingNumber }
}
```

#### 2. Process Payment

```
POST /api/transactions/{transactionId}/process
Headers: Authorization: Bearer {token}
Body: { paymentDetails: object }
Response: { success: true, data: { Transaction } }
```

#### 3. Confirm Payment

```
POST /api/transactions/{transactionId}/confirm
Headers: Authorization: Bearer {token}
Response: {
  success: true,
  data: { transaction, escrow }
}
```

#### 4. Cancel Payment

```
POST /api/transactions/{transactionId}/cancel
Headers: Authorization: Bearer {token}
Body: { reason: string (optional) }
Response: { success: true, data: { Transaction } }
```

#### 5. Get My Transactions

```
GET /api/transactions/my-transactions?status={status}&limit=50&skip=0
Headers: Authorization: Bearer {token}
Response: { success: true, data: [ Transaction ] }
```

#### 6. Get Transaction by ID

```
GET /api/transactions/{transactionId}
Headers: Authorization: Bearer {token}
Response: { success: true, data: { Transaction } }
```

#### 7. Get Transaction Stats

```
GET /api/transactions/stats
Headers: Authorization: Bearer {token}
Response: {
  success: true,
  data: {
    totalTransactions: number,
    completed: number,
    failed: number,
    pending: number,
    disputed: number,
    totalAmount: number
  }
}
```

---

### Escrow Endpoints

#### 1. Create Escrow

```
POST /api/escrows
Headers: Authorization: Bearer {token}
Body: {
  transactionId: string,
  orderId: string,
  farmerId: string,
  transporterId: string,
  amount: number,
  currency: string,
  paymentMethod: string
}
Response: { success: true, data: { Escrow } }
```

#### 2. Release Escrow

```
PUT /api/escrows/{escrowId}/release
Headers: Authorization: Bearer {token}
Body: { reason: string (optional) }
Response: { success: true, data: { Escrow } }
```

#### 3. Refund Escrow

```
PUT /api/escrows/{escrowId}/refund
Headers: Authorization: Bearer {token}
Body: { reason: string (optional) }
Response: { success: true, data: { Escrow } }
```

#### 4. Dispute Escrow

```
PUT /api/escrows/{escrowId}/dispute
Headers: Authorization: Bearer {token}
Body: { reason: string }
Response: { success: true, data: { Escrow } }
```

#### 5. Get My Escrows

```
GET /api/escrows/my-escrows?status={status}&limit=50&skip=0
Headers: Authorization: Bearer {token}
Response: { success: true, data: [ Escrow ] }
```

#### 6. Get Escrow by ID

```
GET /api/escrows/{escrowId}
Headers: Authorization: Bearer {token}
Response: { success: true, data: { Escrow } }
```

#### 7. Get Escrow Stats

```
GET /api/escrows/stats
Headers: Authorization: Bearer {token}
Response: {
  success: true,
  data: {
    totalHeld: number,
    totalReleased: number,
    totalRefunded: number,
    disputed: number,
    totalCount: number
  }
}
```

---

### Receipt Endpoints

#### 1. Create Receipt

```
POST /api/receipts
Headers: Authorization: Bearer {token}
Body: {
  transactionId: string,
  orderId: string (optional),
  escrowId: string (optional),
  farmerId: string,
  transporterId: string,
  subtotal: number,
  platformFee: number (default: 0),
  tax: number (default: 0),
  total: number,
  currency: string,
  items: Array
}
Response: { success: true, data: { Receipt } }
```

#### 2. Issue Receipt

```
PUT /api/receipts/{receiptId}/issue
Headers: Authorization: Bearer {token}
Response: { success: true, data: { Receipt with jsonData and htmlData } }
```

#### 3. Get My Receipts

```
GET /api/receipts/my-receipts?status={status}&limit=50&skip=0
Headers: Authorization: Bearer {token}
Response: { success: true, data: [ Receipt ] }
```

#### 4. Get Receipt by ID

```
GET /api/receipts/{receiptId}
Headers: Authorization: Bearer {token}
Response: { success: true, data: { Receipt } }
```

#### 5. Get Receipt HTML

```
GET /api/receipts/{receiptId}/html
Headers: Authorization: Bearer {token}
Response: HTML document
```

#### 6. Add Delivery Proof

```
PUT /api/receipts/{receiptId}/delivery-proof
Headers: Authorization: Bearer {token}
Body: {
  location: string,
  photo: string (base64 or URL),
  signature: string,
  otp: string
}
Response: { success: true, data: { Receipt } }
```

---

### Dispute Endpoints

#### 1. Raise Dispute

```
POST /api/disputes
Headers: Authorization: Bearer {token}
Body: {
  escrowId: string,
  transactionId: string,
  orderId: string (optional),
  reason: string,
  evidence: object (optional)
}
Response: { success: true, data: { Dispute } }
```

#### 2. Review Dispute (Admin)

```
PUT /api/disputes/{disputeId}/review
Headers: Authorization: Bearer {token}
Response: { success: true, data: { Dispute } }
```

#### 3. Resolve Dispute (Admin)

```
PUT /api/disputes/{disputeId}/resolve
Headers: Authorization: Bearer {token}
Body: {
  resolution: 'REFUNDED' | 'RELEASED' | 'PARTIAL_REFUND',
  resolutionReason: string
}
Response: { success: true, data: { Dispute } }
```

#### 4. Get My Disputes

```
GET /api/disputes/my-disputes?limit=50&skip=0
Headers: Authorization: Bearer {token}
Response: { success: true, data: [ Dispute ] }
```

#### 5. Get Open Disputes (Admin)

```
GET /api/disputes/open
Headers: Authorization: Bearer {token}
Response: { success: true, data: [ Dispute ] }
```

---

### Wallet Endpoints

#### 1. Get or Create Wallet

```
GET /api/wallets/me
Headers: Authorization: Bearer {token}
Response: { success: true, data: { Wallet } }
```

#### 2. Get Wallet Statement

```
GET /api/wallets/statement
Headers: Authorization: Bearer {token}
Response: {
  success: true,
  data: {
    balance: number,
    currency: string,
    totalEarned: number,
    totalSpent: number,
    totalRefunded: number,
    net: number,
    status: string,
    linkedAccounts: { momo, airtel, bank }
  }
}
```

#### 3. Add Payment Method

```
PUT /api/wallets/me/payment-info
Headers: Authorization: Bearer {token}
Body: {
  momoPhoneNumber: string (optional),
  airtelPhoneNumber: string (optional),
  bankAccount: string (optional)
}
Response: { success: true, data: { Wallet } }
```

#### 4. Add Funds

```
POST /api/wallets/me/add-funds
Headers: Authorization: Bearer {token}
Body: {
  amount: number,
  paymentMethod: 'momo' | 'airtel' | 'card' | 'bank',
  reference: string
}
Response: { success: true, data: { wallet, transaction } }
```

#### 5. Withdraw Funds

```
POST /api/wallets/me/withdraw
Headers: Authorization: Bearer {token}
Body: {
  amount: number,
  paymentMethod: string
}
Response: { success: true, data: { wallet, transaction } }
```

#### 6. Verify KYC

```
POST /api/wallets/me/verify-kyc
Headers: Authorization: Bearer {token}
Response: { success: true, data: { Wallet with kycVerified: true } }
```

---

## 🔄 Payment Flow

### Complete Payment Flow

```
1. INITIATE (Farmer)
   → Create Transaction (status: INITIATED)
   → Payment reference generated

2. PAYMENT_PROCESSING (System)
   → Validate payment method
   → Call payment provider API (mocked)
   → Update Transaction (status: PAYMENT_PROCESSING)

3. PAYMENT_CONFIRMED (System)
   → Payment confirmed by provider
   → Update Transaction (status: PAYMENT_CONFIRMED)
   → Deduct from farmer's wallet

4. ESCROW_HELD (System)
   → Create Escrow
   → Calculate heldUntil (24 hours from now)
   → Update Transaction (status: ESCROW_HELD)

5. IN_TRANSIT (Transporter)
   → Transporter confirms pickup
   → Update Transaction (status: IN_TRANSIT)

6. DELIVERED (Transporter)
   → Transporter confirms delivery
   → Create Receipt
   → Add delivery proof
   → Update Transaction (status: DELIVERED)

7. COMPLETED (System)
   → Release Escrow (auto or manual)
   → Add funds to transporter wallet
   → Update Transaction (status: COMPLETED)
   → Send confirmation to both parties
```

### Dispute Flow

```
INITIATED → ESCROW_HELD
            ↓
         DISPUTED (either party can dispute)
            ↓
         UNDER_REVIEW (admin reviews)
            ↓
         RESOLVED (admin decides)
            ├─ REFUNDED (farmer gets money back)
            ├─ RELEASED (transporter gets money)
            └─ PARTIAL_REFUND (split)
            ↓
         CLOSED
```

---

## 🔐 Security Features

### Implemented

✅ **JWT Authentication** - All endpoints require valid JWT token
✅ **Role-Based Access** - Different endpoints for farmer/transporter
✅ **Audit Logging** - All actions logged to AuditLog
✅ **Wallet Status** - Can freeze/unfreeze wallets for disputes
✅ **Transaction Tracking** - Unique reference and tracking numbers
✅ **Escrow Hold Period** - 24-hour auto-release mechanism
✅ **Dispute Evidence** - Stores photos/documents as evidence

### Additional Security (Production)

- 🔒 Add rate limiting for payment endpoints
- 🔒 Implement payment encryption
- 🔒 Add 2FA for high-value transactions
- 🔒 Use Redis for token blacklisting
- 🔒 Add IP whitelisting for admin endpoints
- 🔒 Implement webhook verification for payment providers
- 🔒 Add transaction signing for non-repudiation

---

## 🔧 Configuration

### Environment Variables Needed

```env
# Existing
MONGODB_URI=mongodb://...
JWT_SECRET=your-secret
JWT_REFRESH_SECRET=your-refresh-secret
PORT=5000
NODE_ENV=development

# New (Optional - for production)
PAYMENT_TIMEOUT=30000
ESCROW_HOLD_HOURS=24
PLATFORM_FEE_PERCENT=2
MAX_TRANSACTION_AMOUNT=10000000
```

---

## 📊 Database Indexes

All models have been indexed for performance:

```javascript
// Transaction
-index({ farmerId: 1 }) -
  index({ transporterId: 1 }) -
  index({ orderId: 1 }) -
  index({ status: 1 }) -
  index({ createdAt: -1 }) -
  // Escrow
  index({ status: 1 }) -
  index({ heldUntil: 1 }) -
  index({ farmerId: 1 }) -
  index({ transporterId: 1 }) -
  // Receipt
  index({ status: 1 }) -
  index({ transactionId: 1 }) -
  index({ receiptNumber: 1 }) -
  // Dispute
  index({ status: 1 }) -
  index({ raisedBy: 1 });
```

---

## 🧪 Testing Examples

### Using cURL

#### 1. Initiate Payment

```bash
curl -X POST http://localhost:5000/api/transactions/initiate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "farmerId": "user_id_1",
    "transporterId": "user_id_2",
    "orderId": "order_id",
    "cargoDescription": "Tomatoes",
    "pickupLocation": "Kigali",
    "dropoffLocation": "Musanze",
    "pickupTime": "2025-01-20T10:00:00Z",
    "estimatedDeliveryTime": "2025-01-20T16:00:00Z",
    "amount": 50000,
    "currency": "RWF",
    "paymentMethod": "momo"
  }'
```

#### 2. Confirm Payment

```bash
curl -X POST http://localhost:5000/api/transactions/{transactionId}/confirm \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

#### 3. Get Escrow

```bash
curl http://localhost:5000/api/escrows/{escrowId} \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 4. Release Escrow

```bash
curl -X PUT http://localhost:5000/api/escrows/{escrowId}/release \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "reason": "Delivery completed successfully" }'
```

---

## 📝 Future Enhancements

1. **Real Payment Provider Integration**

   - Integrate with Flutterwave API
   - Integrate with MoMo API
   - Webhook support for payment confirmations

2. **Advanced Features**

   - Scheduled auto-release jobs
   - Payment split between multiple parties
   - Subscription/recurring payments
   - Multi-currency support

3. **Compliance**

   - PCI DSS compliance
   - GDPR data handling
   - Transaction reporting for tax

4. **Performance**
   - Caching with Redis
   - Pagination optimization
   - Database query optimization

---

## 🚀 Deployment Checklist

- [ ] All models exported and accessible
- [ ] All services initialized properly
- [ ] All controllers use try-catch error handling
- [ ] All routes protected with auth middleware
- [ ] Comprehensive error messages
- [ ] Logging in place
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Environment variables set
- [ ] Database indexes created
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] API documentation complete
- [ ] Backup strategy in place

---

## 📞 Support

For issues or questions about the implementation:

1. Check error messages and audit logs
2. Review database indexes
3. Verify JWT tokens are valid
4. Ensure wallet balances are sufficient
5. Check transaction status flow

---

**Last Updated:** 2025  
**Status:** ✅ Ready for Testing & Integration
