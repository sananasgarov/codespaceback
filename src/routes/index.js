const { Router } = require('express');
const roomRoutes = require('./room.routes');
const participantRoutes = require('./participant.routes');
const executionRoutes = require('./execution.routes');

const router = Router();

router.use('/api/v1/rooms', roomRoutes);
router.use('/api/v1/participants', participantRoutes);
router.use('/api/v1/executions', executionRoutes);

module.exports = router;
