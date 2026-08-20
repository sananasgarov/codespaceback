const participantRepository = require('../repositories/participant.repository');
const roomRepository = require('../repositories/room.repository');
const ParticipantNotFoundException = require('../errors/ParticipantNotFoundException');
const AiChatNotAvailableException = require('../errors/AiChatNotAvailableException');
const ForbiddenException = require('../errors/ForbiddenException');
const AppError = require('../errors/AppError');
const env = require('../config/env');
const logger = require('../utils/logger');

// Student-facing "ask a question" widget - explicitly a concept-explainer,
// not a homework-solver. The hard constraint (see the system instruction
// below) is that it must never hand back actual code, however it's asked.

const GEMINI_ENDPOINT = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const SYSTEM_INSTRUCTION = `Sən bir proqramlaşdırma sinfində şagirdlərə kömək edən dostcasına köməkçisən.
Yalnız anlayışları, terminləri və məntiqi izah et - "dövr (loop) nədir", "dəyişən nə üçündür", "bu xəta nə deməkdir" kimi sualları qısa və aydın, Azərbaycan dilində cavabla.

ƏN VACİB QAYDA: HEÇ VAXT kod yazma. Nə tam proqram, nə funksiya, nə tək sətir nümunə - bunların heç birini yazma, kod bloku (üç apostrof işarəsi) işlətmə, hətta şagird açıq şəkildə kod, tapşırığın həllini və ya ev işini yazmağını xahiş etsə belə.
Belə hallarda nəzakətlə rədd et: "Kodu sənin üçün yaza bilmərəm, amma məntiqini izah edim" de, sonra konsepti sözlə izah et və şagirdi öz kodunu özü yazmağa yönləndir.
Cavablarını qısa saxla (bir neçə cümlə), tələbə səviyyəsinə uyğun sadə dildə izah et.`;

// Defense in depth: even with the system instruction above, strip any
// fenced code block that slips through rather than trusting the model
// output blindly - this is the one hard product requirement here.
function stripCodeArtifacts(text) {
  if (!text) return text;
  return text.replace(
    /```[\s\S]*?```/g,
    '_(kod nümunəsi göstərilmir - məntiqini yuxarıda izah etdim, özün yaz)_'
  );
}

async function askAssistant({ participantId, roomCode, message, history }) {
  if (!env.gemini.apiKey) {
    throw new AiChatNotAvailableException();
  }

  // Same IDOR guard used everywhere else a client-supplied participantId +
  // roomCode pairing is trusted (see execution.service.js) - also doubles as
  // the only real gate on who can spend the (paid) Gemini quota.
  const participant = await participantRepository.findById(participantId);
  if (!participant || !participant.room || participant.room.roomCode !== roomCode) {
    throw new ParticipantNotFoundException(participantId);
  }

  // Teacher-controlled switch (see room.service.js#setAiChatEnabled) -
  // enforced here, not just by hiding the widget client-side, same as
  // editingEnabled is enforced in the /app/stream WS handler.
  const room = await roomRepository.findByRoomCode(roomCode);
  if (room && room.aiChatEnabled === false) {
    throw new ForbiddenException('AI chat has been disabled by your teacher for this room');
  }

  const contents = [
    ...(history || []).map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
    { role: 'user', parts: [{ text: message }] },
  ];

  let res;
  try {
    res = await fetch(`${GEMINI_ENDPOINT(env.gemini.model)}?key=${env.gemini.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents,
        generationConfig: { temperature: 0.4, maxOutputTokens: 400 },
      }),
    });
  } catch (err) {
    logger.error('Gemini API request failed:', err);
    throw new AppError('AI assistant is temporarily unavailable, please try again', 502);
  }

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    logger.error(`Gemini API responded with HTTP ${res.status}: ${errBody.slice(0, 300)}`);
    throw new AppError('AI assistant is temporarily unavailable, please try again', 502);
  }

  const json = await res.json();
  const rawReply = (json.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
  const reply =
    stripCodeArtifacts(rawReply).trim() ||
    'Üzr istəyirəm, bu sualı başa düşmədim - başqa cür soruşa bilərsiniz?';

  logger.debug(`AI chat: participantId=${participantId}, room=${roomCode}, replyLength=${reply.length}`);

  return { reply };
}

module.exports = { askAssistant };
