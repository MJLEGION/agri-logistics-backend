const Wallet = require('../models/wallet');
const User = require('../models/user');
const Transaction = require('../models/transaction');
const logger = require('../config/logger');

/**
 * WALLET CONTROLLER
 * Handles user wallets, balance, and transactions
 */

// @desc    Get wallet balance
// @route   GET /api/wallet
// @access  Private
exports.getBalance = async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ userId: req.user.id });

    if (!wallet) {
      // Create wallet if it doesn't exist
      wallet = new Wallet({ userId: req.user.id });
      await wallet.save();
    }

    res.json({
      success: true,
      data: {
        balance: wallet.balance,
        currency: wallet.currency,
        totalEarned: wallet.totalEarned,
        totalSpent: wallet.totalSpent,
        totalRefunded: wallet.totalRefunded,
        status: wallet.status,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Get full wallet details
// @route   GET /api/wallet/details
// @access  Private
exports.getDetails = async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ userId: req.user.id });

    if (!wallet) {
      wallet = new Wallet({ userId: req.user.id });
      await wallet.save();
    }

    const user = await User.findById(req.user.id);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
        },
        wallet: {
          balance: wallet.balance,
          currency: wallet.currency,
          totalEarned: wallet.totalEarned,
          totalSpent: wallet.totalSpent,
          totalRefunded: wallet.totalRefunded,
          status: wallet.status,
          kycVerified: wallet.kycVerified,
          kycVerifiedAt: wallet.kycVerifiedAt,
        },
        linkedAccounts: {
          momoPhoneNumber: wallet.momoPhoneNumber || 'Not linked',
          airtelPhoneNumber: wallet.airtelPhoneNumber || 'Not linked',
          bankAccount: wallet.bankAccount || 'Not linked',
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Add funds to wallet
// @route   POST /api/wallet/topup
// @access  Private
exports.topUp = async (req, res) => {
  try {
    const { amount, paymentMethod } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be positive',
      });
    }

    let wallet = await Wallet.findOne({ userId: req.user.id });

    if (!wallet) {
      wallet = new Wallet({ userId: req.user.id });
    }

    // Create transaction record
    const transaction = new Transaction({
      farmerId: req.user.id,
      orderId: null,
      cargoDescription: `Wallet top-up: ${amount} ${wallet.currency}`,
      pickupLocation: 'Wallet',
      dropoffLocation: 'Wallet',
      pickupTime: new Date(),
      estimatedDeliveryTime: new Date(),
      amount,
      currency: wallet.currency,
      paymentMethod,
      status: 'PAYMENT_CONFIRMED',
      metadata: {
        type: 'topup',
        topupDate: new Date(),
      },
    });

    await transaction.save();

    // Update wallet
    wallet.balance += amount;
    wallet.totalEarned += amount;
    await wallet.save();

    logger.info(`Wallet top-up: ${req.user.id} - Amount: ${amount}`);

    res.json({
      success: true,
      data: {
        balance: wallet.balance,
        amount,
        transactionId: transaction._id,
      },
      message: `Wallet topped up with ${amount} ${wallet.currency}`,
    });
  } catch (error) {
    logger.error('Error in wallet top-up:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Withdraw from wallet
// @route   POST /api/wallet/withdraw
// @access  Private
exports.withdraw = async (req, res) => {
  try {
    const { amount, paymentMethod } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be positive',
      });
    }

    let wallet = await Wallet.findOne({ userId: req.user.id });

    if (!wallet) {
      return res.status(400).json({
        success: false,
        error: 'Wallet not found',
      });
    }

    if (wallet.balance < amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance',
      });
    }

    if (wallet.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: `Wallet is ${wallet.status}. Cannot withdraw.`,
      });
    }

    // Verify KYC
    if (!wallet.kycVerified) {
      return res.status(400).json({
        success: false,
        error: 'KYC verification required to withdraw',
      });
    }

    // Create withdrawal transaction
    const transaction = new Transaction({
      transporterId: req.user.id,
      orderId: null,
      cargoDescription: `Wallet withdrawal: ${amount} ${wallet.currency}`,
      pickupLocation: 'Wallet',
      dropoffLocation: 'Bank Account',
      pickupTime: new Date(),
      estimatedDeliveryTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      amount,
      currency: wallet.currency,
      paymentMethod,
      status: 'PAYMENT_PROCESSING',
      metadata: {
        type: 'withdrawal',
        withdrawalDate: new Date(),
        status: 'pending',
      },
    });

    await transaction.save();

    // Deduct from wallet (hold until confirmation)
    wallet.balance -= amount;
    wallet.totalSpent += amount;
    await wallet.save();

    logger.info(`Wallet withdrawal requested: ${req.user.id} - Amount: ${amount}`);

    res.json({
      success: true,
      data: {
        balance: wallet.balance,
        amount,
        transactionId: transaction._id,
        status: 'pending',
      },
      message: `Withdrawal of ${amount} ${wallet.currency} requested. Funds will appear in your account within 24-48 hours.`,
    });
  } catch (error) {
    logger.error('Error in wallet withdrawal:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Link payment method
// @route   POST /api/wallet/link-payment
// @access  Private
exports.linkPaymentMethod = async (req, res) => {
  try {
    const { paymentMethod, phoneNumber, accountNumber } = req.body;

    if (!paymentMethod || (!phoneNumber && !accountNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Payment method and phone or account number required',
      });
    }

    let wallet = await Wallet.findOne({ userId: req.user.id });

    if (!wallet) {
      wallet = new Wallet({ userId: req.user.id });
    }

    switch (paymentMethod) {
      case 'momo':
        wallet.momoPhoneNumber = phoneNumber;
        break;
      case 'airtel':
        wallet.airtelPhoneNumber = phoneNumber;
        break;
      case 'bank':
        wallet.bankAccount = accountNumber;
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid payment method',
        });
    }

    await wallet.save();

    logger.info(`Payment method linked: ${req.user.id} - Method: ${paymentMethod}`);

    res.json({
      success: true,
      data: wallet,
      message: `${paymentMethod} account linked successfully`,
    });
  } catch (error) {
    logger.error('Error linking payment method:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Verify KYC
// @route   POST /api/wallet/verify-kyc
// @access  Private
exports.verifyKYC = async (req, res) => {
  try {
    const { documentType, documentNumber } = req.body;

    if (!documentType || !documentNumber) {
      return res.status(400).json({
        success: false,
        error: 'Document type and number required',
      });
    }

    let wallet = await Wallet.findOne({ userId: req.user.id });

    if (!wallet) {
      wallet = new Wallet({ userId: req.user.id });
    }

    // In production, verify with actual KYC provider
    wallet.kycVerified = true;
    wallet.kycVerifiedAt = new Date();
    wallet.metadata = wallet.metadata || {};
    wallet.metadata.documentType = documentType;
    wallet.metadata.documentNumber = documentNumber;

    await wallet.save();

    logger.info(`KYC verified: ${req.user.id}`);

    res.json({
      success: true,
      data: wallet,
      message: 'KYC verification completed successfully',
    });
  } catch (error) {
    logger.error('Error verifying KYC:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Get transaction history
// @route   GET /api/wallet/transactions
// @access  Private
exports.getTransactionHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;

    const filter = {
      $or: [{ farmerId: req.user.id }, { transporterId: req.user.id }],
    };

    if (type === 'topup') {
      filter['metadata.type'] = 'topup';
    } else if (type === 'withdrawal') {
      filter['metadata.type'] = 'withdrawal';
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(filter);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Freeze wallet (Admin only)
// @route   PUT /api/wallet/:userId/freeze
// @access  Private (Admin only)
exports.freezeWallet = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can freeze wallets',
      });
    }

    const wallet = await Wallet.findOne({ userId: req.params.userId });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found',
      });
    }

    wallet.status = 'frozen';
    await wallet.save();

    logger.info(`Wallet frozen: ${req.params.userId}`);

    res.json({
      success: true,
      data: wallet,
      message: 'Wallet frozen',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Unfreeze wallet (Admin only)
// @route   PUT /api/wallet/:userId/unfreeze
// @access  Private (Admin only)
exports.unfreezeWallet = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can unfreeze wallets',
      });
    }

    const wallet = await Wallet.findOne({ userId: req.params.userId });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found',
      });
    }

    wallet.status = 'active';
    await wallet.save();

    logger.info(`Wallet unfrozen: ${req.params.userId}`);

    res.json({
      success: true,
      data: wallet,
      message: 'Wallet unfrozen',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};