const { Router } = require('express');
const roomRoutes = require('./room.routes');
const participantRoutes = require('./participant.routes');
const executionRoutes = require('./execution.routes');
const authRoutes = require('./auth.routes');
const billingRoutes = require('./billing.routes');

const router = Router();

router.use('/api/v1/rooms', roomRoutes);
router.use('/api/v1/participants', participantRoutes);
router.use('/api/v1/executions', executionRoutes);
router.use('/api/v1/auth', authRoutes);
router.use('/api/v1/billing', billingRoutes);

module.exports = router;
