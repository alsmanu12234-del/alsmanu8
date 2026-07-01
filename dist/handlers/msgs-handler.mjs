// dist/handlers/msgs-handler.mjs
// Domain: Messages — msgs/mymsgs/viewonce callbacks + handleMyMsgsTextInput2

export const pluginManifest = {
  name: 'msgs',
  version: '1.0.0',
  type: 'handler',
  description: 'رسائلي: msgs/mymsgs/viewonce callbacks',
  textOrder: 17,
  cbOrder: 16,
  enabled: true,
};

let _deps = null;
export function setDeps(d) { _deps = d; }

// معالج نصي مبكر — يُستدعى بعد أوامر النصوص العادية
export async function handleText(bot, msg) {
  // لا أوامر نصية لهذا الـ domain — فقط state handling عبر handleMyMsgsTextInput2
  // يُعالَج في text-handler.mjs كـ early handler قبل switch
  return false;
}

export async function handleCallback(bot, query) {
  const data = query.data || '';
  const chatId = query.message?.chat.id;
  const userId = String(query.from.id);

  if (data === 'menu_msgs' || data.startsWith('msgs_')) {
    await _deps.handleMsgsCallback(bot, chatId, userId, data);
    return true;
  }

  if (data === 'menu_mymsgs' || data.startsWith('mymsgs_')) {
    await _deps.handleMyMsgsCallback(bot, chatId, userId, data);
    return true;
  }

  if (data === 'menu_viewonce' || data.startsWith('viewonce_')) {
    await _deps.handleMsgsCallback(bot, chatId, userId, data.startsWith('viewonce_') ? `msgs_${data}` : 'msgs_viewonce_toggle');
    return true;
  }

  return false;
}
