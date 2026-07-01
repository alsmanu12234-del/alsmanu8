// dist/handlers/media-handler.mjs
// Phase 7: Media Handler — مُستخرَج من dist/index.mjs
// [PATCH_PHASE7_MEDIA_EXTRACTED]
//
// الواجهة:
//   setDeps({ _getState, _getStatus }) — DI
//   handleMedia(bot, msg) → true إذا عولجت الرسالة، false إذا لا

let _deps = {};

export function setDeps(d) {
  _deps = { ..._deps, ...d };
}

export async function handleMedia(bot2, msg2) {
  const { _getState, _getStatus } = _deps;
  const _uid = String(msg2.from?.id);
  const { getState: _gs } = await Promise.resolve().then(_getState);
  const _st = _gs(_uid);

  if (_st.state === "awaiting_status_image" || _st.state === "awaiting_status_video") {
    const { handleStatusMedia: _hsm } = await Promise.resolve().then(_getStatus);
    await _hsm(bot2, msg2.chat.id, _uid, msg2, _st);
    return true;
  }

  return false;
}
