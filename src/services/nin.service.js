const axios = require('axios');

/**
 * Verify NIN with Nigerian NIMC API
 * Note: You'll need to register for NIMC API access
 * For now, this is a mock implementation
 */
exports.verifyNIN = async (nin, userData) => {
  try {
    // OPTION 1: Using NIMC Official API (Requires API Key)
    // Register at: https://nimc.gov.ng/
    
    if (process.env.NIMC_API_KEY) {
      const response = await axios.post(
        'https://api.nimc.gov.ng/verification/nin',
        {
          nin: nin
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.NIMC_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.status === 'success') {
        return {
          success: true,
          data: {
            fullName: response.data.data.firstname + ' ' + response.data.data.surname,
            dateOfBirth: response.data.data.birthdate,
            gender: response.data.data.gender,
            phone: response.data.data.telephoneno
          }
        };
      }
    }

    // OPTION 2: Using Third-Party Verification Services
    // Examples: Youverify, Dojah, Verified, etc.
    
    if (process.env.YOUVERIFY_API_KEY) {
      const response = await axios.post(
        'https://api.youverify.co/v2/identities/verifications/nin',
        {
          id: nin,
          isSubjectConsent: true
        },
        {
          headers: {
            'Token': process.env.YOUVERIFY_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        return {
          success: true,
          data: {
            fullName: response.data.data.fullName,
            dateOfBirth: response.data.data.birthDate,
            gender: response.data.data.gender,
            phone: response.data.data.phone
          }
        };
      }
    }

    // OPTION 3: Mock Verification (FOR DEVELOPMENT ONLY)
    // Remove this in production!
    if (process.env.NODE_ENV === 'development') {
      // Basic validation
      if (!/^\d{11}$/.test(nin)) {
        return {
          success: false,
          error: 'Invalid NIN format. Must be 11 digits.'
        };
      }

      // Mock successful verification
      return {
        success: true,
        data: {
          fullName: `${userData.firstName} ${userData.lastName}`,
          dateOfBirth: new Date('1990-01-01'),
          gender: 'Not Specified',
          phone: userData.phone
        },
        note: 'MOCK VERIFICATION - Replace with real API in production'
      };
    }

    // No verification service configured
    return {
      success: false,
      error: 'NIN verification service not configured'
    };

  } catch (error) {
    console.error('NIN Verification Error:', error);
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'NIN verification failed'
    };
  }
};

/**
 * Validate NIN format (Nigerian NIN)
 */
exports.validateNINFormat = (nin) => {
  // Nigerian NIN is exactly 11 digits
  const ninRegex = /^\d{11}$/;
  return ninRegex.test(nin);
};

/**
 * Check if NIN is already registered
 */
exports.checkNINExists = async (nin, excludeUserId = null) => {
  const User = require('../models/User');
  
  const query = { NIN: nin };
  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }
  
  const existingUser = await User.findOne(query);
  return !!existingUser;
};