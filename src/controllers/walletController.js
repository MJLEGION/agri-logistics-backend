const Wallet = require('../models/wallet');
const User = require('../models/user');

/**
 * Get or create wallet for a user
 */
exports.getOrCreateWallet = async (req, res) => {
  try {
    const userId = req.user.id;

    let wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      // Create wallet if doesn't exist
      wallet = new Wallet({
        userId,
        balance: 0,
        currency: 'RWF',
        status: 'active'
      });
      await wallet.save();
    }

    res.status(200).json({
      success: true,
      data: wallet
    });
  } catch (error) {
    console.error('Error getting wallet:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error getting wallet'
    });
  }
};

/**
 * Get wallet by user ID
 */
exports.getWalletById = async (req, res) => {
  try {
    const { userId } = req.params;

    const wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    res.status(200).json({
      success: true,
      data: wallet
    });
  } catch (error) {
    console.error('Error getting wallet:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error getting wallet'
    });
  }
};

/**
 * Update wallet payment info
 */
exports.updateWalletPaymentInfo = async (req, res) => {
  try {
    const userId = req.user.id;
    const { momoPhoneNumber, airtelPhoneNumber, bankAccount } = req.body;

    let wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      wallet = new Wallet({ userId });
    }

    if (momoPhoneNumber) wallet.momoPhoneNumber = momoPhoneNumber;
    if (airtelPhoneNumber) wallet.airtelPhoneNumber = airtelPhoneNumber;
    if (bankAccount) wallet.bankAccount = bankAccount;

    await wallet.save();

    res.status(200).json({
      success: true,
      message: 'Wallet payment info updated',
      data: wallet
    });
  } catch (error) {
    console.error('Error updating wallet:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating wallet'
    });
  }
};

/**
 * Add funds to wallet (mock implementation)
 */
exports.addFunds = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, paymentMethod, reference } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    let wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      wallet = new Wallet({ userId });
    }

    wallet.balance += amount;
    wallet.totalEarned += amount;
    await wallet.save();

    res.status(200).json({
      success: true,
      message: 'Funds added successfully',
      data: {
        wallet,
        transaction: {
          amount,
          type: 'credit',
          paymentMethod,
          reference,
          timestamp: new Date()
        }
      }
    });
  } catch (error) {
    console.error('Error adding funds:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error adding funds'
    });
  }
};

/**
 * Withdraw funds from wallet
 */
exports.withdrawFunds = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, paymentMethod } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    if (wallet.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    wallet.balance -= amount;
    wallet.totalSpent += amount;
    await wallet.save();

    res.status(200).json({
      success: true,
      message: 'Funds withdrawn successfully',
      data: {
        wallet,
        transaction: {
          amount,
          type: 'debit',
          paymentMethod,
          timestamp: new Date()
        }
      }
    });
  } catch (error) {
    console.error('Error withdrawing funds:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error withdrawing funds'
    });
  }
};

/**
 * Get wallet statement
 */
exports.getWalletStatement = async (req, res) => {
  try {
    const userId = req.user.id;
    const wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    const statement = {
      balance: wallet.balance,
      currency: wallet.currency,
      totalEarned: wallet.totalEarned,
      totalSpent: wallet.totalSpent,
      totalRefunded: wallet.totalRefunded,
      net: wallet.totalEarned - wallet.totalSpent + wallet.totalRefunded,
      status: wallet.status,
      linkedAccounts: {
        momo: wallet.momoPhoneNumber ? '****' + wallet.momoPhoneNumber.slice(-4) : null,
        airtel: wallet.airtelPhoneNumber ? '****' + wallet.airtelPhoneNumber.slice(-4) : null,
        bank: wallet.bankAccount ? '****' + wallet.bankAccount.slice(-4) : null
      }
    };

    res.status(200).json({
      success: true,
      data: statement
    });
  } catch (error) {
    console.error('Error getting statement:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error getting statement'
    });
  }
};

/**
 * Verify KYC (mock)
 */
exports.verifyKYC = async (req, res) => {
  try {
    const userId = req.user.id;

    const wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    wallet.kycVerified = true;
    wallet.kycVerifiedAt = new Date();
    await wallet.save();

    res.status(200).json({
      success: true,
      message: 'KYC verification completed',
      data: wallet
    });
  } catch (error) {
    console.error('Error verifying KYC:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error verifying KYC'
    });
  }
};

/**
 * Freeze wallet (admin)
 */
exports.freezeWallet = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    wallet.status = 'frozen';
    wallet.metadata = {
      ...wallet.metadata,
      frozenReason: reason,
      frozenAt: new Date()
    };
    await wallet.save();

    res.status(200).json({
      success: true,
      message: 'Wallet frozen successfully',
      data: wallet
    });
  } catch (error) {
    console.error('Error freezing wallet:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error freezing wallet'
    });
  }
};

/**
 * Unfreeze wallet (admin)
 */
exports.unfreezeWallet = async (req, res) => {
  try {
    const { userId } = req.params;

    const wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    wallet.status = 'active';
    await wallet.save();

    res.status(200).json({
      success: true,
      message: 'Wallet unfrozen successfully',
      data: wallet
    });
  } catch (error) {
    console.error('Error unfreezing wallet:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error unfreezing wallet'
    });
  }
};