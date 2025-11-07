const logger = require('../config/logger');

/**
 * GEOSPATIAL SERVICE
 * Handles distance calculations and location-based queries
 */

// Earth's radius in kilometers
const EARTH_RADIUS_KM = 6371;

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - First latitude
 * @param {number} lon1 - First longitude
 * @param {number} lat2 - Second latitude
 * @param {number} lon2 - Second longitude
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  try {
    // Validate inputs
    if (!isValidLatitude(lat1) || !isValidLatitude(lat2) ||
        !isValidLongitude(lon1) || !isValidLongitude(lon2)) {
      throw new Error('Invalid coordinates');
    }

    // Convert to radians
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = EARTH_RADIUS_KM * c;

    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  } catch (error) {
    logger.error('Error calculating distance:', error);
    throw error;
  }
}

/**
 * Calculate bearing (direction) between two coordinates
 * @param {number} lat1 - First latitude
 * @param {number} lon1 - First longitude
 * @param {number} lat2 - Second latitude
 * @param {number} lon2 - Second longitude
 * @returns {number} Bearing in degrees (0-360)
 */
function calculateBearing(lat1, lon1, lat2, lon2) {
  try {
    const dLon = toRad(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(toRad(lat2));
    const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
              Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);

    const bearing = (toDeg(Math.atan2(y, x)) + 360) % 360;
    return Math.round(bearing * 100) / 100;
  } catch (error) {
    logger.error('Error calculating bearing:', error);
    throw error;
  }
}

/**
 * Get bounding box coordinates for a circular radius
 * Useful for approximate filtering before precise calculation
 * @param {number} latitude - Center latitude
 * @param {number} longitude - Center longitude
 * @param {number} radiusKm - Radius in kilometers
 * @returns {object} Bounding box with min/max coordinates
 */
function getBoundingBox(latitude, longitude, radiusKm) {
  try {
    const latChange = (radiusKm / EARTH_RADIUS_KM) * (180 / Math.PI);
    const lonChange = (radiusKm / (EARTH_RADIUS_KM * Math.cos(toRad(latitude)))) * (180 / Math.PI);

    return {
      minLat: latitude - latChange,
      maxLat: latitude + latChange,
      minLon: longitude - lonChange,
      maxLon: longitude + lonChange
    };
  } catch (error) {
    logger.error('Error calculating bounding box:', error);
    throw error;
  }
}

/**
 * Find items near a location
 * @param {Model} model - Mongoose model to query
 * @param {number} latitude - Center latitude
 * @param {number} longitude - Center longitude
 * @param {number} maxDistance - Maximum distance in kilometers
 * @param {object} additionalFilter - Additional query filters
 * @returns {array} Items sorted by distance
 */
async function findNearby(model, latitude, longitude, maxDistance = 50, additionalFilter = {}) {
  try {
    validateCoordinates(latitude, longitude);

    // Use MongoDB geospatial query
    const results = await model.find({
      ...additionalFilter,
      coordinates: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: maxDistance * 1000 // Convert to meters
        }
      }
    });

    return results;
  } catch (error) {
    logger.error('Error finding nearby items:', error);
    throw error;
  }
}

/**
 * Calculate estimated time of arrival
 * @param {number} distance - Distance in kilometers
 * @param {number} averageSpeed - Average speed in km/h (default 40)
 * @returns {number} Estimated time in minutes
 */
function calculateETA(distance, averageSpeed = 40) {
  try {
    if (distance < 0 || averageSpeed <= 0) {
      throw new Error('Invalid distance or speed values');
    }

    const hours = distance / averageSpeed;
    const minutes = Math.round(hours * 60);
    return minutes;
  } catch (error) {
    logger.error('Error calculating ETA:', error);
    throw error;
  }
}

/**
 * Check if point is within radius of center
 * @param {number} centerLat - Center latitude
 * @param {number} centerLon - Center longitude
 * @param {number} pointLat - Point latitude
 * @param {number} pointLon - Point longitude
 * @param {number} radiusKm - Radius in kilometers
 * @returns {boolean} Whether point is within radius
 */
function isWithinRadius(centerLat, centerLon, pointLat, pointLon, radiusKm) {
  try {
    const distance = calculateDistance(centerLat, centerLon, pointLat, pointLon);
    return distance <= radiusKm;
  } catch (error) {
    logger.error('Error checking if within radius:', error);
    throw error;
  }
}

/**
 * Format coordinates to GeoJSON Point
 * @param {number} latitude
 * @param {number} longitude
 * @returns {object} GeoJSON Point
 */
function toGeoJSON(latitude, longitude) {
  validateCoordinates(latitude, longitude);
  return {
    type: 'Point',
    coordinates: [longitude, latitude] // GeoJSON uses [lon, lat]
  };
}

/**
 * Convert degrees to radians
 * @param {number} degrees
 * @returns {number} Radians
 */
function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 * @param {number} radians
 * @returns {number} Degrees
 */
function toDeg(radians) {
  return radians * (180 / Math.PI);
}

/**
 * Validate latitude (-90 to 90)
 * @param {number} latitude
 * @returns {boolean}
 */
function isValidLatitude(latitude) {
  return typeof latitude === 'number' && latitude >= -90 && latitude <= 90;
}

/**
 * Validate longitude (-180 to 180)
 * @param {number} longitude
 * @returns {boolean}
 */
function isValidLongitude(longitude) {
  return typeof longitude === 'number' && longitude >= -180 && longitude <= 180;
}

/**
 * Validate both coordinates
 * @param {number} latitude
 * @param {number} longitude
 * @throws {Error} If coordinates are invalid
 */
function validateCoordinates(latitude, longitude) {
  if (!isValidLatitude(latitude)) {
    throw new Error('Invalid latitude. Must be between -90 and 90');
  }
  if (!isValidLongitude(longitude)) {
    throw new Error('Invalid longitude. Must be between -180 and 180');
  }
}

module.exports = {
  calculateDistance,
  calculateBearing,
  getBoundingBox,
  findNearby,
  calculateETA,
  isWithinRadius,
  toGeoJSON,
  validateCoordinates,
  isValidLatitude,
  isValidLongitude,
  EARTH_RADIUS_KM
};