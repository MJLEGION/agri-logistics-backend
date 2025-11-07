const express = require('express');
const router = express.Router();
const cargoController = require('../controllers/cargoController');
const { protect, authorize } = require('../middleware/auth');

/**
 * CARGO ROUTES
 * All cargo/product listing endpoints
 */

// GET all cargo with pagination and filtering
router.get('/', cargoController.getAll);

// GET cargo by ID
router.get('/:id', cargoController.getById);

// GET cargo by user ID
router.get('/user/:userId', cargoController.getByUserId);

// GET nearby cargo
router.get('/nearby', cargoController.getNearby);

// SEARCH cargo
router.get('/search', cargoController.search);

// CREATE new cargo (protected, farmers/shippers only)
router.post('/', protect, authorize('farmer', 'shipper'), cargoController.create);

// UPDATE cargo (protected, owner only)
router.put('/:id', protect, cargoController.update);

// DELETE cargo (protected, owner only)
router.delete('/:id', protect, cargoController.delete);

// UPDATE cargo status
router.put('/:id/status', protect, cargoController.updateStatus);

module.exports = router;