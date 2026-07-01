// dist/handlers/points-handler.mjs
// Domain: Points & Features — /points /features + callbacks

export const pluginManifest = {
  name: 'points',
  version: '1.0.0',
  type: 'handler',
  description: 'نظام النقاط والمميزات: /points /features + callbacks',
  textOrder: 5,
  cbOrder: 4,
  enabled: true,
};

let _deps = null;
export function setDeps(d) { _deps = d; }

export async function handleText(bot, msg) {
  if (!msg.text) return false;
  const text = msg.text;
  const chatId = msg.chat.id;
  const userId = String(msg.from?.id);

  if (text === '/points' || text === '/points_balance') {
    await _deps.showPoints(bot, chatId, userId);
    return true;
  }
  if (text === '/features' || text === '/features_list') {
    await _deps.showFeatures(bot, chatId, userId);
    return true;
  }
  return false;
}

export async function handleCallback(bot, query) {
  const data = query.data || '';
  const chatId = query.message?.chat.id;
  const userId = String(query.from.id);

  if (
    data === 'menu_points' ||
    data === 'menu_features' ||
    data.startsWith('points_') ||
    data.startsWith('feature_') ||
    data.startsWith('bundle_') ||
    data === 'redeem_extra_num'
  ) {
    await _deps.handlePointsCallback(bot, chatId, userId, data);
    return true;
  }

  if (data.startsWith('confirm_buy_')) {
    await _deps.handleConfirmBuy(bot, chatId, userId, data.replace('confirm_buy_', ''));
    return true;
  }

  return false;
}
