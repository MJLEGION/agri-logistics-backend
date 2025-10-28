const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const auth = require('../middleware/auth');

// GET routes - specific /me routes before generic /:userId route
router.get('/me', auth, walletController.getOrCreateWallet);
router.get('/statement', auth, walletController.getWalletStatement);

// POST routes for /me
router.post('/me/add-funds', auth, walletController.addFunds);
router.post('/me/withdraw', auth, walletController.withdrawFunds);
router.post('/me/verify-kyc', auth, walletController.verifyKYC);

// PUT routes for /me
router.put('/me/payment-info', auth, walletController.updateWalletPaymentInfo);

// GET wallet by user ID
router.get('/:userId', auth, walletController.getWalletById);

// PUT routes for admin operations
router.put('/:userId/freeze', auth, walletController.freezeWallet);
router.put('/:userId/unfreeze', auth, walletController.unfreezeWallet);

module.exports = router;