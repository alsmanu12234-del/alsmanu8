let _deps = {};
export function setDeps(d) { _deps = d; }

export async function handleBridgeCallback(bot2, chatId, userId, data) {
  const { getUser, saveUser, setState, inMemoryDB, cancelKeyboard, bridgeMenuKeyboard, getBridgeRelays, getCustomContactList } = _deps;
  const user = getUser(userId);
  const sock = inMemoryDB.sessions.get(userId);
  if (data === "menu_bridge") {
    const relays = getBridgeRelays(userId);
    const customList = getCustomContactList(userId);
    await bot2.sendMessage(
      chatId,
      `\u{1F309} *\u0627\u0644\u062C\u0633\u0631 \u0627\u0644\u0630\u0643\u064A*\n\n\u{1F501} Relays \u0646\u0634\u0637\u0629: ${relays.filter((r) => r.active).length}\n\u{1F4CB} \u0642\u0627\u0626\u0645\u0629 \u0645\u062E\u0635\u0635\u0629: ${customList.length} \u0631\u0642\u0645\n\u{1F514} \u062A\u0646\u0628\u064A\u0647 \u0627\u0644\u0627\u0646\u0636\u0645\u0627\u0645: ${user.bridgeNotifyJoin ? "\u2705" : "\u274C"}`,
      { parse_mode: "Markdown", reply_markup: bridgeMenuKeyboard() }
    );
    return true;
  }
  if (data === "bridge_broadcast") {
    if (!sock) {
      await bot2.sendMessage(chatId, "\u274C \u0631\u0628\u0637 \u0648\u0627\u062A\u0633\u0627\u0628 \u0623\u0648\u0644\u0627\u064B");
      return true;
    }
    setState(userId, "awaiting_bridge_msg", { type: "broadcast" });
    await bot2.sendMessage(
      chatId,
      `\u{1F4E2} *\u0627\u0644\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u062C\u0645\u0627\u0639\u064A \u0627\u0644\u0630\u0643\u064A*\n\n\u2705 \u0633\u064A\u064F\u0631\u0633\u064E\u0644 \u0644\u0644\u0645\u062C\u0645\u0648\u0639\u0627\u062A \u0648\u062C\u0647\u0627\u062A \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0641\u064A \u0622\u0646\u064D \u0648\u0627\u062D\u062F.\n\n*\u0627\u0644\u062E\u0637\u0648\u0629 1:* \u0627\u0643\u062A\u0628 \u0627\u0644\u0631\u0633\u0627\u0644\u0629 (\u064A\u0645\u0643\u0646 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 {name}):`,
      { parse_mode: "Markdown", reply_markup: cancelKeyboard() }
    );
    return true;
  }
  if (data === "bridge_copy_members") {
    if (!sock) {
      await bot2.sendMessage(chatId, "\u274C \u0631\u0628\u0637 \u0648\u0627\u062A\u0633\u0627\u0628 \u0623\u0648\u0644\u0627\u064B");
      return true;
    }
    let groups = inMemoryDB.groupsCache.get(userId) || [];
    if (groups.length === 0) {
      try {
        const c = await sock.groupFetchAllParticipating?.();
        groups = c ? Object.values(c) : [];
        inMemoryDB.groupsCache.set(userId, groups);
      } catch {}
    }
    if (groups.length === 0) {
      await bot2.sendMessage(chatId, "\u274C \u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u062C\u0645\u0648\u0639\u0627\u062A");
      return true;
    }
    setState(userId, "awaiting_group_select_for_action", { bridgeAction: "copy_members" });
    const kb = {
      inline_keyboard: [
        ...groups.slice(0, 10).map((g) => [{ text: `\u{1F465} ${(g.subject || g.id).slice(0, 30)}`, callback_data: `bridge_selgrp_${g.id}` }]),
        [{ text: "\u274C \u0625\u0644\u063A\u0627\u0621", callback_data: "cancel" }]
      ]
    };
    await bot2.sendMessage(chatId, "\u{1F465} \u0627\u062E\u062A\u0631 \u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0629 \u0644\u0646\u0633\u062E \u0623\u0639\u0636\u0627\u0626\u0647\u0627:", { reply_markup: kb });
    return true;
  }
  if (data.startsWith("bridge_selgrp_")) {
    const groupId = data.replace("bridge_selgrp_", "");
    const groups = inMemoryDB.groupsCache.get(userId) || [];
    const group = groups.find((g) => g.id === groupId);
    const members = (group?.participants || []).map((p) => p.id?.split("@")[0]).filter(Boolean);
    await bot2.sendMessage(
      chatId,
      `\u2705 *\u062A\u0645 \u0646\u0633\u062E \u0623\u0639\u0636\u0627\u0621 \u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0629!*\n\n\u{1F465} ${group?.subject || groupId}\n\u{1F464} \u0627\u0644\u0623\u0639\u0636\u0627\u0621: ${members.length}`,
      { parse_mode: "Markdown", reply_markup: bridgeMenuKeyboard() }
    );
    return true;
  }
  if (data === "bridge_sync") {
    await bot2.sendMessage(
      chatId,
      `\u{1F504} *\u0645\u0632\u0627\u0645\u0646\u0629 \u0627\u0644\u0631\u0633\u0627\u0626\u0644 \u0628\u064A\u0646 \u0645\u062C\u0645\u0648\u0639\u062A\u064A\u0646*\n\n\u0633\u062A\u064F\u0639\u0627\u062F \u0643\u0644 \u0631\u0633\u0627\u0644\u0629 \u0641\u064A \u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u0623\u0648\u0644\u0649 \u0644\u0644\u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u062B\u0627\u0646\u064A\u0629 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B.\n\n\u2699\uFE0F \u0627\u0644\u0645\u064A\u0632\u0629 \u0645\u062A\u0627\u062D\u0629 \u0644\u0644\u0625\u0639\u062F\u0627\u062F:`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "\u{1F501} \u0625\u0639\u062F\u0627\u062F Relay \u0645\u062C\u0645\u0648\u0639\u0629\u2194\u0645\u062C\u0645\u0648\u0639\u0629", callback_data: "bridge_relay_gg" }],
            [{ text: "\u{1F519} \u0631\u062C\u0648\u0639", callback_data: "menu_bridge" }]
          ]
        }
      }
    );
    return true;
  }
  if (data === "bridge_relay_gg") {
    setState(userId, "awaiting_bridge_relay_gg_src");
    await bot2.sendMessage(
      chatId,
      `\u{1F501} *\u062A\u0631\u062D\u064A\u0644 \u0645\u062C\u0645\u0648\u0639\u0629 \u2190\u2192 \u0645\u062C\u0645\u0648\u0639\u0629*\n\n*\u0627\u0644\u062E\u0637\u0648\u0629 1/2:* \u0623\u062F\u062E\u0644 \u0645\u0639\u0631\u0651\u0641 \u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u0645\u0635\u062F\u0631:`,
      { parse_mode: "Markdown", reply_markup: cancelKeyboard() }
    );
    return true;
  }
  if (data === "bridge_relay_gp") {
    if (!sock) { await bot2.sendMessage(chatId, "\u274C \u0631\u0628\u0637 \u0648\u0627\u062A\u0633\u0627\u0628 \u0623\u0648\u0644\u0627\u064B"); return true; }
    setState(userId, "awaiting_bridge_relay_gp_src");
    await bot2.sendMessage(chatId, `\u{1F465}\u2192\u{1F4AC} *\u062A\u0648\u062C\u064A\u0647 \u0645\u062C\u0645\u0648\u0639\u0629 \u2192 \u0623\u0634\u062E\u0627\u0635*\n\n*\u0627\u0644\u062E\u0637\u0648\u0629 1/2:* \u0623\u062F\u062E\u0644 \u0645\u0639\u0631\u0651\u0641 \u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u0645\u0635\u062F\u0631:`, { parse_mode: "Markdown", reply_markup: cancelKeyboard() });
    return true;
  }
  if (data === "bridge_relay_pg") {
    if (!sock) { await bot2.sendMessage(chatId, "\u274C \u0631\u0628\u0637 \u0648\u0627\u062A\u0633\u0627\u0628 \u0623\u0648\u0644\u0627\u064B"); return true; }
    setState(userId, "awaiting_bridge_relay_pg_src");
    await bot2.sendMessage(chatId, `\u{1F4AC}\u2192\u{1F465} *\u062A\u0648\u062C\u064A\u0647 \u0634\u062E\u0635 \u2192 \u0645\u062C\u0645\u0648\u0639\u0629*\n\n*\u0627\u0644\u062E\u0637\u0648\u0629 1/2:* \u0623\u062F\u062E\u0644 \u0631\u0642\u0645 \u0627\u0644\u0634\u062E\u0635 \u0627\u0644\u0645\u0635\u062F\u0631:`, { parse_mode: "Markdown", reply_markup: cancelKeyboard() });
    return true;
  }
  if (data === "bridge_active_members") {
    if (!sock) { await bot2.sendMessage(chatId, "\u274C \u0631\u0628\u0637 \u0648\u0627\u062A\u0633\u0627\u0628 \u0623\u0648\u0644\u0627\u064B"); return true; }
    setState(userId, "awaiting_bridge_active_group");
    await bot2.sendMessage(chatId, `\u26A1 *\u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0627\u0644\u0623\u0639\u0636\u0627\u0621 \u0627\u0644\u0646\u0634\u0637\u064A\u0646*\n\n\u064A\u0633\u062A\u062E\u0631\u062C \u0627\u0644\u0623\u0639\u0636\u0627\u0621 \u0627\u0644\u0630\u064A\u0646 \u0623\u0631\u0633\u0644\u0648\u0627 \u0631\u0633\u0627\u0626\u0644 \u0622\u062E\u0631 7 \u0623\u064A\u0627\u0645.\n\n\u0623\u062F\u062E\u0644 \u0645\u0639\u0631\u0651\u0641 \u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0629:`, { parse_mode: "Markdown", reply_markup: cancelKeyboard() });
    return true;
  }
  if (data === "bridge_notify_join") {
    const current = user.bridgeNotifyJoin ?? false;
    saveUser(userId, { bridgeNotifyJoin: !current });
    await bot2.sendMessage(chatId, `\u2705 \u062A\u0646\u0628\u064A\u0647 \u0627\u0644\u0627\u0646\u0636\u0645\u0627\u0645/\u0627\u0644\u0645\u063A\u0627\u062F\u0631\u0629: ${!current ? "\u0645\u0641\u0639\u0651\u0644 \u2705" : "\u0645\u0639\u0637\u0651\u0644 \u274C"}`, { reply_markup: bridgeMenuKeyboard() });
    return true;
  }
  if (data === "bridge_compare_groups") {
    if (!sock) { await bot2.sendMessage(chatId, "\u274C \u0631\u0628\u0637 \u0648\u0627\u062A\u0633\u0627\u0628 \u0623\u0648\u0644\u0627\u064B"); return true; }
    setState(userId, "awaiting_bridge_compare_g1");
    await bot2.sendMessage(chatId, `\u{1F4CA} *\u0645\u0642\u0627\u0631\u0646\u0629 \u0623\u0639\u0636\u0627\u0621 \u0645\u062C\u0645\u0648\u0639\u062A\u064A\u0646*\n\n*\u0627\u0644\u062E\u0637\u0648\u0629 1/2:* \u0623\u062F\u062E\u0644 \u0645\u0639\u0631\u0651\u0641 \u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u0623\u0648\u0644\u0649:`, { parse_mode: "Markdown", reply_markup: cancelKeyboard() });
    return true;
  }
  if (data === "bridge_custom_list") {
    const customList = getCustomContactList(userId);
    const kb = {
      inline_keyboard: [
        [{ text: "\u2795 \u0625\u0636\u0627\u0641\u0629 \u0631\u0642\u0645", callback_data: "bridge_custom_add" }],
        [{ text: "\u{1F4E2} \u0625\u0631\u0633\u0627\u0644 \u0644\u0644\u0642\u0627\u0626\u0645\u0629", callback_data: "bridge_custom_send" }],
        [{ text: `\u{1F4CB} \u0627\u0644\u0642\u0627\u0626\u0645\u0629 (${customList.length} \u0631\u0642\u0645)`, callback_data: "bridge_custom_view" }],
        [{ text: "\u{1F5D1}\uFE0F \u0645\u0633\u062D \u0627\u0644\u0642\u0627\u0626\u0645\u0629", callback_data: "bridge_custom_clear" }],
        [{ text: "\u{1F519} \u0631\u062C\u0648\u0639", callback_data: "menu_bridge" }]
      ]
    };
    const nums = customList.slice(0, 5).map((c) => `\u2022 ${c.label || c.number}`).join("\n");
    await bot2.sendMessage(chatId, `\u{1F4CB} *\u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u062E\u0635\u0635\u0629*\n\n\u0623\u0631\u0642\u0627\u0645: ${customList.length}\n${nums || "\u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0641\u0627\u0631\u063A\u0629"}`, { parse_mode: "Markdown", reply_markup: kb });
    return true;
  }
  if (data === "bridge_custom_add") {
    setState(userId, "awaiting_custom_contact_num");
    await bot2.sendMessage(chatId, "\u2795 \u0623\u062F\u062E\u0644 \u0627\u0644\u0631\u0642\u0645:\n\u0645\u062B\u0627\u0644: `249960506662`", { parse_mode: "Markdown", reply_markup: cancelKeyboard() });
    return true;
  }
  if (data === "bridge_custom_send") {
    const customList = getCustomContactList(userId);
    if (!sock) { await bot2.sendMessage(chatId, "\u274C \u0631\u0628\u0637 \u0648\u0627\u062A\u0633\u0627\u0628 \u0623\u0648\u0644\u0627\u064B"); return true; }
    if (customList.length === 0) { await bot2.sendMessage(chatId, "\u274C \u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0641\u0627\u0631\u063A\u0629"); return true; }
    setState(userId, "awaiting_custom_list_msg");
    await bot2.sendMessage(chatId, `\u{1F4E2} \u0633\u062A\u064F\u0631\u0633\u064E\u0644 \u0644\u0640 ${customList.length} \u0631\u0642\u0645.\n\n\u0627\u0643\u062A\u0628 \u0627\u0644\u0631\u0633\u0627\u0644\u0629:`, { reply_markup: cancelKeyboard() });
    return true;
  }
  if (data === "bridge_custom_view") {
    const customList = getCustomContactList(userId);
    if (customList.length === 0) { await bot2.sendMessage(chatId, "\u274C \u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0641\u0627\u0631\u063A\u0629"); return true; }
    const text = customList.map((c, i) => `${i + 1}. ${c.label || c.number} (+${c.number})`).join("\n");
    await bot2.sendMessage(chatId, `\u{1F4CB} *\u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u062E\u0635\u0635\u0629:*\n\n${text}`, { parse_mode: "Markdown" });
    return true;
  }
  if (data === "bridge_custom_clear") {
    inMemoryDB.customContactLists.set(userId, []);
    await bot2.sendMessage(chatId, "\u2705 \u062A\u0645 \u0645\u0633\u062D \u0627\u0644\u0642\u0627\u0626\u0645\u0629.");
    return true;
  }
  if (data === "bridge_delayed_bulk") {
    if (!sock) { await bot2.sendMessage(chatId, "\u274C \u0631\u0628\u0637 \u0648\u0627\u062A\u0633\u0627\u0628 \u0623\u0648\u0644\u0627\u064B"); return true; }
    setState(userId, "awaiting_delayed_bulk_msg");
    await bot2.sendMessage(chatId, `\u23F1\uFE0F *\u0625\u0631\u0633\u0627\u0644 \u062C\u0645\u0627\u0639\u064A \u0628\u062A\u0623\u062E\u064A\u0631 \u0630\u0643\u064A*\n\n\u2705 \u064A\u0636\u064A\u0641 \u062A\u0623\u062E\u064A\u0631\u0627\u064B \u0639\u0634\u0648\u0627\u0626\u064A\u0627\u064B 2-5 \u062B\u0648\u0627\u0646\u064D \u0628\u064A\u0646 \u0643\u0644 \u0631\u0633\u0627\u0644\u0629\n\n\u0627\u0643\u062A\u0628 \u0627\u0644\u0631\u0633\u0627\u0644\u0629:`, { parse_mode: "Markdown", reply_markup: cancelKeyboard() });
    return true;
  }
  if (data === "bridge_stats_bulk" || data === "bridge_stats") {
    const relays = getBridgeRelays(userId);
    const customList = getCustomContactList(userId);
    const stats = user.bulkStats || { sent: 0, failed: 0, total: 0 };
    await bot2.sendMessage(
      chatId,
      `\u{1F4CA} *\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u062C\u0633\u0631*\n\n\u{1F501} Relays \u0646\u0634\u0637\u0629: ${relays.filter((r) => r.active).length}\n\u{1F4CB} \u0642\u0627\u0626\u0645\u0629 \u0645\u062E\u0635\u0635\u0629: ${customList.length} \u0631\u0642\u0645\n\u{1F4E4} \u0625\u0631\u0633\u0627\u0644 \u0646\u0627\u062C\u062D: ${stats.sent}\n\u274C \u0641\u0634\u0644: ${stats.failed}\n\u2705 \u0645\u0639\u062F\u0644 \u0627\u0644\u0646\u062C\u0627\u062D: ${stats.total ? Math.round(stats.sent / stats.total * 100) : 0}%`,
      { parse_mode: "Markdown", reply_markup: bridgeMenuKeyboard() }
    );
    return true;
  }
  return false;
}
