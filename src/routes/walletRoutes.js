const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { protect, authorize } = require('../middleware/auth');

/**
 * WALLET ROUTES
 * All wallet and balance endpoints
 */

// GET wallet balance (protected)
router.get('/', protect, walletController.getBalance);

// GET wallet details (protected)
router.get('/details', protect, walletController.getDetails);

// GET transaction history (protected)
router.get('/transactions', protect, walletController.getTransactionHistory);

// POST top-up wallet (protected)
router.post('/topup', protect, walletController.topUp);

// POST withdraw from wallet (protected)
router.post('/withdraw', protect, walletController.withdraw);

// POST link payment method (protected)
router.post('/link-payment', protect, walletController.linkPaymentMethod);

// POST verify KYC (protected)
router.post('/verify-kyc', protect, walletController.verifyKYC);

// PUT freeze wallet (admin only)
router.put('/:userId/freeze', protect, authorize('admin'), walletController.freezeWallet);

// PUT unfreeze wallet (admin only)
router.put('/:userId/unfreeze', protect, authorize('admin'), walletController.unfreezeWallet);

module.exports = router;