let _deps = {};
export function setDeps(d) { _deps = d; }

export async function showPoints2(bot2, chatId, userId, user) {
  const { getUser, inMemoryDB, TIER_NAMES, pointsMenuKeyboard } = _deps;
  user = user || getUser(userId);
  const log = inMemoryDB.pointsLog.filter((l) => l.userId === userId).slice(-5).reverse();
  const logText = log.length > 0 ? log.map(
    (l) => `${l.amount > 0 ? "+" : ""}${l.amount} \u2014 ${l.reason}`
  ).join("\n") : "\u0644\u0627 \u062A\u0648\u062C\u062F \u062D\u0631\u0643\u0627\u062A \u0628\u0639\u062F";
  await bot2.sendMessage(
    chatId,
    `\u{1F48E} *\u0646\u0642\u0627\u0637\u064A \u0648\u0631\u0635\u064A\u062F\u064A*\n\n\u{1F4B0} \u0631\u0635\u064A\u062F\u0643: *${(user.points || 0).toLocaleString()} \u0646\u0642\u0637\u0629*\n\u2B50 \u0641\u0626\u062A\u0643: *${TIER_NAMES[user.tier] || "\u0645\u062C\u0627\u0646\u064A"}*\n\u{1F4F1} \u0627\u0644\u0623\u0631\u0642\u0627\u0645: *${(user.whatsappNumbers || []).length}/${user.maxNumbers || 1}*\n\n\u{1F4CA} *\u0622\u062E\u0631 \u0627\u0644\u062D\u0631\u0643\u0627\u062A:*\n${logText}`,
    { parse_mode: "Markdown", reply_markup: pointsMenuKeyboard(user.points || 0) }
  );
}

export async function showFeatures2(bot2, chatId, userId, user) {
  const { getUser, TIER_NAMES, TIER_ORDER, TIER_COSTS, getDynamicPrice, featuresMenuKeyboard } = _deps;
  user = user || getUser(userId);
  const currentIndex = TIER_ORDER.indexOf(user.tier);
  let text = `\u2B50 *\u0645\u064A\u0632\u0627\u062A\u064A \u0648\u0627\u0644\u062A\u0631\u0642\u064A\u0629*\n\n\u0641\u0626\u062A\u0643 \u0627\u0644\u062D\u0627\u0644\u064A\u0629: *${TIER_NAMES[user.tier] || "\u0645\u062C\u0627\u0646\u064A"}*\n\u{1F4B0} \u0631\u0635\u064A\u062F\u0643: *${(user.points || 0).toLocaleString()} \u0646\u0642\u0637\u0629*\n\n`;
  if (user.tier !== "mizaj") {
    const nextTier = TIER_ORDER[currentIndex + 1];
    if (nextTier) {
      const cost = getDynamicPrice(`tier_${nextTier}`, TIER_COSTS[nextTier] || 0);
      const canAfford = (user.points || 0) >= cost;
      text += `\u{1F4C8} *\u0627\u0644\u062A\u0631\u0642\u064A\u0629 \u0627\u0644\u062A\u0627\u0644\u064A\u0629:* ${TIER_NAMES[nextTier]}\n\u{1F4B5} \u0627\u0644\u0633\u0639\u0631: ${cost.toLocaleString()} \u0646\u0642\u0637\u0629\n${canAfford ? "\u2705 \u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u062A\u0631\u0642\u064A\u0629 \u0627\u0644\u0622\u0646!" : `\u274C \u062A\u062D\u062A\u0627\u062C ${(cost - (user.points || 0)).toLocaleString()} \u0646\u0642\u0637\u0629 \u0625\u0636\u0627\u0641\u064A\u0629`}\n\n`;
    }
  } else {
    text += "\u{1F3C6} *\u0623\u0646\u062A \u0641\u064A \u0623\u0639\u0644\u0649 \u0641\u0626\u0629 \u2014 \u0645\u064A\u0632\u0627\u062C!*\n\n";
  }
  text += "\u0627\u062E\u062A\u0631 \u0644\u0644\u062A\u0641\u0627\u0635\u064A\u0644:";
  await bot2.sendMessage(chatId, text, {
    parse_mode: "Markdown",
    reply_markup: featuresMenuKeyboard(user.tier, user.points || 0)
  });
}

export async function handlePointsCallback(bot2, chatId, userId, data) {
  const { getUser, saveUser, addPoints, setState, getState, clearState, inMemoryDB, DEVELOPER_ID, TIER_NAMES, TIER_COSTS, TIER_ORDER, TIER_MAX_NUMBERS, TIER_FEATURES, MULTI_TIER_DISCOUNTS, getDynamicPrice, mainMenuKeyboard, pointsMenuKeyboard, featuresMenuKeyboard, confirmKeyboard, cancelKeyboard, bundleKeyboard, bulkPointsKeyboard } = _deps;
  const user = getUser(userId);
  const isDev2 = userId === DEVELOPER_ID;
  if (data === "menu_points") {
    await showPoints2(bot2, chatId, userId, user);
    return true;
  }
  if (data === "menu_features") {
    await showFeatures2(bot2, chatId, userId, user);
    return true;
  }
  if (data === "points_earn") {
    await bot2.sendMessage(
      chatId,
      `\u{1F4A1} *\u0643\u064A\u0641 \u062A\u0643\u0633\u0628 \u0627\u0644\u0646\u0642\u0627\u0637\u061F*\n\n\u{1F381} \u062A\u0633\u062C\u064A\u0644 \u0623\u0648\u0644 \u0645\u0631\u0629: +100 \u0646\u0642\u0637\u0629\n\u2699\uFE0F \u0625\u0636\u0627\u0641\u0629 \u0631\u062F \u062A\u0644\u0642\u0627\u0626\u064A: +5 \u0646\u0642\u0627\u0637\n\u{1F916} \u0631\u062F \u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064A: +10 \u0646\u0642\u0627\u0637\n\u{1F465} \u062F\u0639\u0648\u0629 \u0635\u062F\u064A\u0642: +200 \u0646\u0642\u0637\u0629\n\u{1F4C5} \u062C\u062F\u0648\u0644\u0629 \u0631\u0633\u0627\u0644\u0629: +3 \u0646\u0642\u0627\u0637\n\u26A1 \u0625\u0631\u0633\u0627\u0644 \u0628\u0644\u0627\u063A: \u064A\u0643\u0633\u0628 \u0639\u0646\u062F \u0627\u0644\u062A\u0631\u0627\u0643\u0645\n\n\u{1F48E} \u0627\u0644\u0646\u0642\u0627\u0637 \u062A\u064F\u0633\u062A\u062E\u062F\u0645 \u0644\u0644\u062A\u0631\u0642\u064A\u0629 \u0648\u0641\u062A\u062D \u0627\u0644\u0645\u064A\u0632\u0627\u062A.`,
      { parse_mode: "Markdown", reply_markup: pointsMenuKeyboard(user.points || 0) }
    );
    return true;
  }
  if (data === "points_log") {
    const log = inMemoryDB.pointsLog.filter((l) => l.userId === userId).slice(-20).reverse();
    if (log.length === 0) {
      await bot2.sendMessage(chatId, "\u{1F4CA} \u0644\u0627 \u062A\u0648\u062C\u062F \u062D\u0631\u0643\u0627\u062A \u0646\u0642\u0627\u0637 \u0628\u0639\u062F.");
      return true;
    }
    const text = log.map(
      (l) => `${l.amount > 0 ? "\u{1F7E2} +" : "\u{1F534} "}${l.amount} \u2014 ${l.reason}`
    ).join("\n");
    await bot2.sendMessage(chatId, `\u{1F4CA} *\u0633\u062C\u0644 \u0627\u0644\u0646\u0642\u0627\u0637 (\u0622\u062E\u0631 20):*\n\n${text}`, { parse_mode: "Markdown" });
    return true;
  }
  if (data === "points_referral") {
    const code = user.referralCode || `REF${userId.slice(-6)}`;
    await bot2.sendMessage(
      chatId,
      `\u{1F517} *\u0646\u0638\u0627\u0645 \u0627\u0644\u0625\u062D\u0627\u0644\u0629*\n\n\u0631\u0645\u0632 \u0627\u0644\u0625\u062D\u0627\u0644\u0629 \u0627\u0644\u062E\u0627\u0635 \u0628\u0643:\n\`${code}\`\n\n\u0639\u062F\u062F \u0645\u0646 \u062F\u0639\u0648\u062A\u0647\u0645: ${user.referralCount || 0}\n\u0645\u0643\u0627\u0641\u0623\u0629 \u0627\u0644\u0625\u062D\u0627\u0644\u0629: +200 \u0646\u0642\u0637\u0629 \u0644\u0643\u0644 \u062F\u0639\u0648\u0629\n\n\u0634\u0627\u0631\u0643 \u0647\u0630\u0627 \u0627\u0644\u0631\u0645\u0632 \u0645\u0639 \u0623\u0635\u062F\u0642\u0627\u0626\u0643 \u0648\u0633\u062A\u062D\u0635\u0644 \u0639\u0644\u0649 \u0627\u0644\u0646\u0642\u0627\u0637 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B!`,
      { parse_mode: "Markdown", reply_markup: pointsMenuKeyboard(user.points || 0) }
    );
    return true;
  }
  if (data === "redeem_extra_num") {
    const cost = getDynamicPrice("extra_num", 5e4);
    if ((user.points || 0) < cost) {
      await bot2.sendMessage(
        chatId,
        `\u274C *\u0646\u0642\u0627\u0637 \u063A\u064A\u0631 \u0643\u0627\u0641\u064A\u0629*\n\n\u062A\u062D\u062A\u0627\u062C: ${cost.toLocaleString()} \u0646\u0642\u0637\u0629\n\u0644\u062F\u064A\u0643: ${(user.points || 0).toLocaleString()} \u0646\u0642\u0637\u0629`,
        { parse_mode: "Markdown" }
      );
      return true;
    }
    addPoints(userId, -cost, "\u0641\u062A\u062D \u0631\u0642\u0645 \u0625\u0636\u0627\u0641\u064A");
    saveUser(userId, { maxNumbers: (user.maxNumbers || 1) + 1 });
    const fresh = getUser(userId);
    await bot2.sendMessage(
      chatId,
      `\u2705 *\u062A\u0645 \u0641\u062A\u062D \u0631\u0642\u0645 \u0625\u0636\u0627\u0641\u064A!*\n\n\u{1F4F1} \u0623\u0631\u0642\u0627\u0645 \u0645\u0633\u0645\u0648\u062D\u0629: ${fresh.maxNumbers}\n\u{1F4B0} \u0627\u0644\u0645\u062A\u0628\u0642\u064A: ${fresh.points.toLocaleString()} \u0646\u0642\u0637\u0629`,
      { parse_mode: "Markdown", reply_markup: mainMenuKeyboard(fresh.points || 0, fresh.tier, isDev2) }
    );
    return true;
  }
  if (data.startsWith("feature_buy_")) {
    await handleFeatureBuy(bot2, chatId, userId, data, user);
    return true;
  }
  if (data.startsWith("feature_info_")) {
    await handleFeatureInfo(bot2, chatId, userId, data);
    return true;
  }
  if (data === "feature_bundle") {
    await bot2.sendMessage(
      chatId,
      `\u{1F4E6} *\u0628\u0627\u0642\u0627\u062A \u0645\u062A\u0639\u062F\u062F\u0629*\n\n\u0627\u062E\u062A\u0631 \u0628\u0627\u0642\u062A\u064A\u0646 \u0623\u0648 \u0623\u0643\u062B\u0631 \u0644\u0644\u062D\u0635\u0648\u0644 \u0639\u0644\u0649 \u062E\u0635\u0645:`,
      { parse_mode: "Markdown", reply_markup: bundleKeyboard(user.points || 0) }
    );
    return true;
  }
  if (data.startsWith("bundle_toggle_")) {
    await handleBundleToggle(bot2, chatId, userId, data);
    return true;
  }
  if (data === "bundle_calc") {
    await handleBundleCalc(bot2, chatId, userId, user);
    return true;
  }
  if (data === "bundle_confirm") {
    await handleBundleConfirm(bot2, chatId, userId, user);
    return true;
  }
  return false;
}

async function handleFeatureBuy(bot2, chatId, userId, data, user) {
  const { TIER_NAMES, TIER_COSTS, TIER_ORDER, getDynamicPrice, featuresMenuKeyboard, confirmKeyboard } = _deps;
  const tier = data.replace("feature_buy_", "");
  const currentIndex = TIER_ORDER.indexOf(user.tier);
  const targetIndex = TIER_ORDER.indexOf(tier);
  if (targetIndex <= currentIndex) {
    await bot2.sendMessage(chatId, `\u26A0\uFE0F \u0644\u062F\u064A\u0643 \u0628\u0627\u0644\u0641\u0639\u0644 \u0641\u0626\u0629 ${TIER_NAMES[user.tier] || user.tier} \u0623\u0648 \u0623\u0639\u0644\u0649.`);
    return;
  }
  const cost = getDynamicPrice(`tier_${tier}`, TIER_COSTS[tier] || 0);
  if ((user.points || 0) < cost) {
    await bot2.sendMessage(
      chatId,
      `\u274C *\u0646\u0642\u0627\u0637 \u063A\u064A\u0631 \u0643\u0627\u0641\u064A\u0629*\n\n\u0627\u0644\u0641\u0626\u0629: ${TIER_NAMES[tier]}\n\u0627\u0644\u062A\u0643\u0644\u0641\u0629: ${cost.toLocaleString()} \u0646\u0642\u0637\u0629\n\u0631\u0635\u064A\u062F\u0643: ${(user.points || 0).toLocaleString()} \u0646\u0642\u0637\u0629\n\u064A\u0646\u0642\u0635\u0643: ${(cost - (user.points || 0)).toLocaleString()} \u0646\u0642\u0637\u0629`,
      { parse_mode: "Markdown", reply_markup: featuresMenuKeyboard(user.tier, user.points || 0) }
    );
    return;
  }
  await bot2.sendMessage(
    chatId,
    `\u2705 *\u062A\u0623\u0643\u064A\u062F \u0627\u0644\u062A\u0631\u0642\u064A\u0629*\n\n\u0627\u0644\u0641\u0626\u0629: ${TIER_NAMES[tier]}\n\u0627\u0644\u062A\u0643\u0644\u0641\u0629: ${cost.toLocaleString()} \u0646\u0642\u0637\u0629\n\u0631\u0635\u064A\u062F\u0643 \u0628\u0639\u062F \u0627\u0644\u0634\u0631\u0627\u0621: ${((user.points || 0) - cost).toLocaleString()} \u0646\u0642\u0637\u0629\n\n\u0647\u0644 \u062A\u0623\u0643\u062F\u061F`,
    { parse_mode: "Markdown", reply_markup: confirmKeyboard(`confirm_buy_${tier}`, "cancel") }
  );
}

async function handleFeatureInfo(bot2, chatId, userId, data) {
  const { TIER_NAMES, TIER_COSTS, TIER_FEATURES, TIER_MAX_NUMBERS, getDynamicPrice } = _deps;
  const tier = data.replace("feature_info_", "");
  const features = TIER_FEATURES[tier] || [];
  const cost = getDynamicPrice(`tier_${tier}`, TIER_COSTS[tier] || 0);
  await bot2.sendMessage(
    chatId,
    `\u{1F4CB} *${TIER_NAMES[tier] || tier}*\n\n\u{1F4B0} \u0627\u0644\u0633\u0639\u0631: ${cost.toLocaleString()} \u0646\u0642\u0637\u0629\n\u{1F4F1} \u0623\u0631\u0642\u0627\u0645: ${TIER_MAX_NUMBERS[tier] || 1}\n\n\u2728 *\u0627\u0644\u0645\u064A\u0632\u0627\u062A:*\n${features.map((f) => `\u2022 ${f}`).join("\n")}`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: `\u{1F48E} \u0634\u0631\u0627\u0621 ${TIER_NAMES[tier]}`, callback_data: `feature_buy_${tier}` }],
          [{ text: "\u{1F519} \u0631\u062C\u0648\u0639", callback_data: "menu_features" }]
        ]
      }
    }
  );
}

export async function handleConfirmBuy(bot2, chatId, userId, tier) {
  const { getUser, saveUser, addPoints, inMemoryDB, DEVELOPER_ID, TIER_NAMES, TIER_COSTS, TIER_MAX_NUMBERS, getDynamicPrice, mainMenuKeyboard } = _deps;
  const user = getUser(userId);
  const cost = getDynamicPrice(`tier_${tier}`, TIER_COSTS[tier] || 0);
  if ((user.points || 0) < cost) {
    await bot2.sendMessage(chatId, "\u274C \u0646\u0642\u0627\u0637 \u063A\u064A\u0631 \u0643\u0627\u0641\u064A\u0629");
    return;
  }
  addPoints(userId, -cost, `\u0634\u0631\u0627\u0621 \u0628\u0627\u0642\u0629 ${tier}`);
  saveUser(userId, { tier, maxNumbers: TIER_MAX_NUMBERS[tier] || 1 });
  const fresh = getUser(userId);
  const isDev2 = userId === DEVELOPER_ID;
  await bot2.sendMessage(
    chatId,
    `\u{1F389} *\u062A\u0647\u0627\u0646\u064A\u0646\u0627! \u062A\u0645\u062A \u0627\u0644\u062A\u0631\u0642\u064A\u0629!*\n\n\u2B50 \u0627\u0644\u0641\u0626\u0629 \u0627\u0644\u062C\u062F\u064A\u062F\u0629: *${TIER_NAMES[tier]}*\n\u{1F4F1} \u0623\u0631\u0642\u0627\u0645 \u0645\u0633\u0645\u0648\u062D\u0629: ${TIER_MAX_NUMBERS[tier] || 1}\n\u{1F4B0} \u0627\u0644\u0645\u062A\u0628\u0642\u064A: ${fresh.points.toLocaleString()} \u0646\u0642\u0637\u0629\n\n\u0627\u0633\u062A\u0645\u062A\u0639 \u0628\u0645\u064A\u0632\u0627\u062A\u0643 \u0627\u0644\u062C\u062F\u064A\u062F\u0629! \u{1F680}`,
    { parse_mode: "Markdown", reply_markup: mainMenuKeyboard(fresh.points || 0, fresh.tier, isDev2) }
  );
  const devId = parseInt(DEVELOPER_ID);
  if (!isNaN(devId)) {
    bot2.sendMessage(
      devId,
      `\u{1F4B0} *\u062A\u0631\u0642\u064A\u0629 \u062C\u062F\u064A\u062F\u0629!*\n\n\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645: ${fresh.firstName || userId} (${userId})\n\u0627\u0644\u0641\u0626\u0629: ${TIER_NAMES[tier]}\n\u0627\u0644\u062A\u0643\u0644\u0641\u0629: ${cost.toLocaleString()} \u0646\u0642\u0637\u0629`,
      { parse_mode: "Markdown" }
    ).catch(() => {});
  }
}

async function handleBundleToggle(bot2, chatId, userId, data) {
  const { getUser, setState, getState, TIER_NAMES, bundleKeyboard } = _deps;
  const tier = data.replace("bundle_toggle_", "");
  const state = getState(userId);
  const selected = state.data.selectedBundle || [];
  const idx = selected.indexOf(tier);
  if (idx > -1) selected.splice(idx, 1);
  else selected.push(tier);
  setState(userId, "idle", { selectedBundle: selected });
  await bot2.sendMessage(
    chatId,
    `\u{1F4E6} *\u0627\u062E\u062A\u064A\u0627\u0631\u0643:* ${selected.length > 0 ? selected.map((t) => TIER_NAMES[t]).join("\u060C ") : "\u0644\u0645 \u062A\u062E\u062A\u0631 \u0628\u0639\u062F"}\n\n\u0627\u0636\u063A\u0637 "\u062D\u0633\u0627\u0628 \u0627\u0644\u062E\u0635\u0645" \u0644\u0631\u0624\u064A\u0629 \u0627\u0644\u0633\u0639\u0631:`,
    { parse_mode: "Markdown", reply_markup: bundleKeyboard(getUser(userId).points || 0, selected) }
  );
}

async function handleBundleCalc(bot2, chatId, userId, user) {
  const { getState, TIER_NAMES, TIER_COSTS, MULTI_TIER_DISCOUNTS, getDynamicPrice, confirmKeyboard } = _deps;
  const state = getState(userId);
  const selected = state.data.selectedBundle || [];
  if (selected.length < 2) {
    await bot2.sendMessage(chatId, "\u274C \u0627\u062E\u062A\u0631 \u0628\u0627\u0642\u062A\u064A\u0646 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644 \u0644\u0644\u062D\u0635\u0648\u0644 \u0639\u0644\u0649 \u062E\u0635\u0645");
    return;
  }
  const totalCost = selected.reduce((s, t) => s + getDynamicPrice(`tier_${t}`, TIER_COSTS[t] || 0), 0);
  const discountPct = MULTI_TIER_DISCOUNTS[selected.length] || 0;
  const discount = Math.floor(totalCost * discountPct / 100);
  const finalCost = totalCost - discount;
  const canAfford = (user.points || 0) >= finalCost;
  await bot2.sendMessage(
    chatId,
    `\u{1F4E6} *\u0645\u0644\u062E\u0635 \u0627\u0644\u0628\u0627\u0642\u0627\u062A \u0627\u0644\u0645\u062A\u0639\u062F\u062F\u0629*\n\n\u0627\u0644\u0628\u0627\u0642\u0627\u062A: ${selected.map((t) => TIER_NAMES[t]).join("\u060C ")}\n\u0627\u0644\u0633\u0639\u0631 \u0627\u0644\u0623\u0635\u0644\u064A: ${totalCost.toLocaleString()} \u0646\u0642\u0637\u0629\n\u0627\u0644\u062E\u0635\u0645 (${discountPct}%): -${discount.toLocaleString()} \u0646\u0642\u0637\u0629\n*\u0627\u0644\u0633\u0639\u0631 \u0627\u0644\u0646\u0647\u0627\u0626\u064A: ${finalCost.toLocaleString()} \u0646\u0642\u0637\u0629*\n\n${canAfford ? "\u2705 \u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u0634\u0631\u0627\u0621!" : `\u274C \u064A\u0646\u0642\u0635\u0643 ${(finalCost - (user.points || 0)).toLocaleString()} \u0646\u0642\u0637\u0629`}`,
    {
      parse_mode: "Markdown",
      reply_markup: canAfford ? confirmKeyboard("bundle_confirm", "cancel") : { inline_keyboard: [[{ text: "\u{1F519} \u0631\u062C\u0648\u0639", callback_data: "menu_features" }]] }
    }
  );
}

async function handleBundleConfirm(bot2, chatId, userId, user) {
  const { getUser, saveUser, addPoints, clearState, getState, DEVELOPER_ID, TIER_NAMES, TIER_COSTS, TIER_ORDER, TIER_MAX_NUMBERS, MULTI_TIER_DISCOUNTS, getDynamicPrice, mainMenuKeyboard } = _deps;
  const state = getState(userId);
  const selected = state.data.selectedBundle || [];
  if (selected.length === 0) {
    await bot2.sendMessage(chatId, "\u274C \u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u0627\u0642\u0627\u062A \u0645\u062D\u062F\u062F\u0629");
    return;
  }
  const totalCost = selected.reduce((s, t) => s + getDynamicPrice(`tier_${t}`, TIER_COSTS[t] || 0), 0);
  const discountPct = MULTI_TIER_DISCOUNTS[selected.length] || 0;
  const finalCost = Math.floor(totalCost - totalCost * discountPct / 100);
  if ((user.points || 0) < finalCost) {
    await bot2.sendMessage(chatId, "\u274C \u0646\u0642\u0627\u0637 \u063A\u064A\u0631 \u0643\u0627\u0641\u064A\u0629");
    return;
  }
  const highestTier = selected.sort((a2, b) => TIER_ORDER.indexOf(b) - TIER_ORDER.indexOf(a2))[0];
  addPoints(userId, -finalCost, `\u0634\u0631\u0627\u0621 \u0628\u0627\u0642\u0627\u062A \u0645\u062A\u0639\u062F\u062F\u0629: ${selected.join(",")}`);
  saveUser(userId, { tier: highestTier, maxNumbers: TIER_MAX_NUMBERS[highestTier] || 1 });
  clearState(userId);
  const fresh = getUser(userId);
  const isDev2 = userId === DEVELOPER_ID;
  await bot2.sendMessage(
    chatId,
    `\u{1F389} *\u062A\u0645\u062A \u0639\u0645\u0644\u064A\u0629 \u0627\u0644\u0634\u0631\u0627\u0621 \u0628\u0646\u062C\u0627\u062D!*\n\n\u0627\u0644\u0641\u0626\u0629 \u0627\u0644\u0645\u0641\u0639\u0651\u0644\u0629: *${TIER_NAMES[highestTier]}*\n\u0627\u0644\u0646\u0642\u0627\u0637 \u0627\u0644\u0645\u062E\u0635\u0648\u0645\u0629: ${finalCost.toLocaleString()}\n\u0627\u0644\u0645\u062A\u0628\u0642\u064A: ${fresh.points.toLocaleString()} \u0646\u0642\u0637\u0629`,
    { parse_mode: "Markdown", reply_markup: mainMenuKeyboard(fresh.points || 0, fresh.tier, isDev2) }
  );
}

export function getBulkUsers2(category) {
  const { inMemoryDB } = _deps;
  return Array.from(inMemoryDB.users.values()).filter((u3) => {
    if (category === "all") return true;
    if (category === "active")
      return u3.lastSeen && Date.now() - new Date(u3.lastSeen).getTime() < 7 * 24 * 60 * 60 * 1e3;
    if (category === "new")
      return u3.createdAt && Date.now() - new Date(u3.createdAt).getTime() < 24 * 60 * 60 * 1e3;
    return u3.tier === category;
  });
}

export async function handleBulkPoints(bot2, chatId, userId, data) {
  const { DEVELOPER_ID, setState, getState, clearState, addPoints, cancelKeyboard } = _deps;
  if (userId !== DEVELOPER_ID) return false;
  if (data.startsWith("bulk_cat_")) {
    const category = data.replace("bulk_cat_", "");
    setState(userId, "awaiting_bulk_points_amount", { bulkCategory: category });
    const users = getBulkUsers2(category);
    await bot2.sendMessage(
      chatId,
      `\u{1F48E} *\u0625\u0631\u0633\u0627\u0644 \u0646\u0642\u0627\u0637 \u062C\u0645\u0627\u0639\u064A*\n\n\u0627\u0644\u0641\u0626\u0629: ${category}\n\u0639\u062F\u062F \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646: ${users.length}\n\n\u0623\u062F\u062E\u0644 \u0639\u062F\u062F \u0627\u0644\u0646\u0642\u0627\u0637 \u0644\u0643\u0644 \u0645\u0633\u062A\u062E\u062F\u0645:`,
      { parse_mode: "Markdown", reply_markup: cancelKeyboard() }
    );
    return true;
  }
  if (data === "bulk_confirm") {
    const state = getState(userId);
    const category = state.data.bulkCategory || "all";
    const amount = state.data.bulkAmount || 0;
    const message = state.data.bulkMessage || "";
    const users = getBulkUsers2(category);
    for (const u3 of users) {
      addPoints(u3.telegramId, amount, `\u0645\u0637\u0648\u0631: \u0625\u0631\u0633\u0627\u0644 \u062C\u0645\u0627\u0639\u064A \u2014 ${category}`);
      if (u3.telegramChatId && message) {
        const personalMsg = message.replace(/{name}/g, u3.firstName || u3.telegramId).replace(/{points}/g, amount.toString()).replace(/{date}/g, (/* @__PURE__ */ new Date()).toLocaleDateString("ar"));
        bot2.sendMessage(u3.telegramChatId, personalMsg).catch(() => {});
      }
    }
    clearState(userId);
    await bot2.sendMessage(
      chatId,
      `\u2705 *\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 ${amount.toLocaleString()} \u0646\u0642\u0637\u0629 \u0644\u0640 ${users.length} \u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0646\u062C\u0627\u062D!*`,
      { parse_mode: "Markdown" }
    );
    return true;
  }
  return false;
}
