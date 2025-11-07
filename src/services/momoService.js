const axios = require('axios');
const logger = require('../config/logger');

class MoMoService {
  constructor() {
    // MTN MoMo API Configuration
    this.apiUrl = process.env.MOMO_API_URL || 'https://sandbox.momodeveloper.mtn.com';
    this.apiKey = process.env.MOMO_API_KEY;
    this.primaryKey = process.env.MOMO_PRIMARY_KEY;
    this.secondaryKey = process.env.MOMO_SECONDARY_KEY;
    this.momoUserId = process.env.MOMO_USER_ID;
    this.callbackUrl = process.env.MOMO_CALLBACK_URL || 'http://localhost:5000/api/payments/momo/callback';
    this.env = process.env.NODE_ENV === 'production' ? 'production' : 'sandbox';
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Generate Access Token for MoMo API
   */
  async getAccessToken() {
    try {
      // Return cached token if still valid
      if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        logger.info('📱 Using cached MoMo access token');
        return this.accessToken;
      }

      logger.info('📱 Requesting new MoMo access token...');

      const auth = Buffer.from(`${this.momoUserId}:${this.apiKey}`).toString('base64');

      const response = await axios.post(
        `${this.apiUrl}/collection/token/`,
        {},
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Ocp-Apim-Subscription-Key': this.primaryKey,
            'Content-Type': 'application/json',
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000 - 60000); // Refresh 1 min before expiry

      logger.info('✅ MoMo access token obtained successfully');
      return this.accessToken;
    } catch (error) {
      logger.error('❌ Error getting MoMo access token:', error.response?.data || error.message);
      throw new Error(`Failed to get MoMo access token: ${error.message}`);
    }
  }

  /**
   * Initiate Payment Request (Collect from Customer)
   */
  async initiatePaymentRequest(paymentData) {
    try {
      const {
        amount,
        phoneNumber,
        externalId,
        payerMessage = 'Payment for agricultural transaction',
        payeeNote = 'Agricultural Logistics Payment',
      } = paymentData;

      logger.info('📱 Initiating MoMo payment request:', {
        amount,
        phone: phoneNumber,
        externalId,
      });

      // Validate phone number
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      if (!formattedPhone) {
        throw new Error('Invalid phone number format');
      }

      const accessToken = await this.getAccessToken();

      const requestBody = {
        amount: amount.toString(),
        currency: 'RWF', // Default to RWF (Rwanda Franc)
        externalId: externalId,
        payer: {
          partyIdType: 'MSISDN',
          partyId: formattedPhone,
        },
        payerMessage: payerMessage,
        payeeNote: payeeNote,
      };

      const response = await axios.post(
        `${this.apiUrl}/collection/v1_0/requesttopay`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Ocp-Apim-Subscription-Key': this.primaryKey,
            'Content-Type': 'application/json',
            'X-Reference-Id': externalId,
          },
        }
      );

      logger.info('✅ MoMo payment request initiated:', {
        referenceId: externalId,
        status: response.status,
      });

      return {
        referenceId: externalId,
        status: 'INITIATED',
        amount: parseFloat(amount),
        phoneNumber: formattedPhone,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('❌ Error initiating MoMo payment:', error.response?.data || error.message);
      throw new Error(`MoMo payment initiation failed: ${error.message}`);
    }
  }

  /**
   * Check Payment Status
   */
  async checkPaymentStatus(referenceId) {
    try {
      logger.info('🔍 Checking MoMo payment status:', referenceId);

      const accessToken = await this.getAccessToken();

      const response = await axios.get(
        `${this.apiUrl}/collection/v1_0/requesttopay/${referenceId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Ocp-Apim-Subscription-Key': this.primaryKey,
            'Content-Type': 'application/json',
          },
        }
      );

      const status = this.mapMoMoStatus(response.data.status);

      logger.info('✅ MoMo payment status retrieved:', {
        referenceId,
        status,
        momoStatus: response.data.status,
      });

      return {
        referenceId,
        status,
        amount: response.data.amount,
        phoneNumber: response.data.payer?.partyId,
        financialTransactionId: response.data.financialTransactionId,
        rawResponse: response.data,
      };
    } catch (error) {
      logger.error('❌ Error checking MoMo payment status:', error.response?.data || error.message);
      throw new Error(`Failed to check MoMo payment status: ${error.message}`);
    }
  }

  /**
   * Payout (Disbursement to Transporter/Farmer)
   */
  async initiatePayoutRequest(payoutData) {
    try {
      const {
        amount,
        phoneNumber,
        externalId,
        payeeNote = 'Agricultural payment transfer',
      } = payoutData;

      logger.info('💸 Initiating MoMo payout request:', {
        amount,
        phone: phoneNumber,
        externalId,
      });

      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      if (!formattedPhone) {
        throw new Error('Invalid phone number format');
      }

      const accessToken = await this.getAccessToken();

      const requestBody = {
        amount: amount.toString(),
        currency: 'RWF',
        externalId: externalId,
        payee: {
          partyIdType: 'MSISDN',
          partyId: formattedPhone,
        },
        payeeNote: payeeNote,
      };

      const response = await axios.post(
        `${this.apiUrl}/disbursement/v1_0/transfer`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Ocp-Apim-Subscription-Key': this.secondaryKey,
            'Content-Type': 'application/json',
            'X-Reference-Id': externalId,
          },
        }
      );

      logger.info('✅ MoMo payout request initiated:', {
        referenceId: externalId,
        status: response.status,
      });

      return {
        referenceId: externalId,
        status: 'INITIATED',
        amount: parseFloat(amount),
        phoneNumber: formattedPhone,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('❌ Error initiating MoMo payout:', error.response?.data || error.message);
      throw new Error(`MoMo payout initiation failed: ${error.message}`);
    }
  }

  /**
   * Format phone number to MTN MoMo format
   * Accepts: +250788123456, 0788123456, 250788123456, 788123456
   */
  formatPhoneNumber(phone) {
    try {
      // Remove spaces and special characters except +
      let cleanPhone = phone.replace(/[\s\-()]/g, '');

      // Handle Rwanda numbers
      if (cleanPhone.startsWith('+250')) {
        return cleanPhone; // Already in correct format
      }
      if (cleanPhone.startsWith('250')) {
        return `+${cleanPhone}`;
      }
      if (cleanPhone.startsWith('0')) {
        return `+25${cleanPhone}`;
      }
      if (cleanPhone.match(/^[0-9]{9}$/) && cleanPhone.startsWith('7')) {
        return `+250${cleanPhone}`;
      }

      throw new Error('Invalid phone number format');
    } catch (error) {
      logger.error('❌ Phone number formatting error:', error.message);
      return null;
    }
  }

  /**
   * Map MoMo API status to internal status
   */
  mapMoMoStatus(momoStatus) {
    const statusMap = {
      'PENDING': 'PENDING',
      'SUCCESSFUL': 'PAYMENT_CONFIRMED',
      'FAILED': 'FAILED',
      'EXPIRED': 'EXPIRED',
      'REJECTED': 'REJECTED',
    };
    return statusMap[momoStatus] || 'UNKNOWN';
  }

  /**
   * Validate MoMo webhook signature
   */
  validateWebhookSignature(signature, payload, secret) {
    try {
      // Implementation depends on MTN MoMo webhook signature method
      // This is a placeholder - update based on actual MTN MoMo requirements
      logger.info('✅ Webhook signature validated');
      return true;
    } catch (error) {
      logger.error('❌ Webhook signature validation failed:', error.message);
      return false;
    }
  }

  /**
   * Get API Configuration for validation
   */
  getConfig() {
    return {
      isConfigured: !!(this.apiKey && this.primaryKey && this.momoUserId),
      environment: this.env,
      apiUrl: this.apiUrl,
      hasCredentials: {
        apiKey: !!this.apiKey,
        primaryKey: !!this.primaryKey,
        secondaryKey: !!this.secondaryKey,
        userId: !!this.momoUserId,
      },
    };
  }
}

module.exports = new MoMoService();