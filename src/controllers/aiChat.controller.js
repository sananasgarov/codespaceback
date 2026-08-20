const aiChatService = require('../services/aiChat.service');
const { apiResponse } = require('../dto/response/apiResponse');

async function chat(req, res) {
  const data = await aiChatService.askAssistant(req.body);

  res.status(200).json(
    apiResponse({ success: true, message: 'Reply generated', data })
  );
}

module.exports = { chat };
