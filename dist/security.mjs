let _deps = {};
export function setDeps(d) { _deps = d; }

export async function handleSecurityCallback(bot2, chatId, userId, data) {
  const { getUser, saveUser, setState, cancelKeyboard, securityMenuKeyboard, _getNumberMgr, _getBaileys } = _deps;
  const user = getUser(userId);
  const sec = user.securitySettings || {};
  if (data === "menu_security") {
    const { getUserNumbers } = _getNumberMgr();
    const nums = getUserNumbers(userId);
    const active = nums.find((n) => n.status === "active");
    await bot2.sendMessage(
      chatId,
      `\u{1F512} *\u0627\u0644\u0623\u0645\u0627\u0646 \u0648\u0627\u0644\u062E\u0635\u0648\u0635\u064A\u0629*\n\n\u{1F510} \u0642\u0641\u0644 PIN: ${sec.pin ? "\u2705 \u0645\u0641\u0639\u0651\u0644" : "\u274C \u0645\u0639\u0637\u0651\u0644"}\n\u{1F441}\uFE0F \u0625\u062E\u0641\u0627\u0621 \u0622\u062E\u0631 \u0638\u0647\u0648\u0631: ${sec.hideLastSeen ? "\u2705" : "\u274C"}\n\u2705 \u0625\u062E\u0641\u0627\u0621 \u0639\u0644\u0627\u0645\u0629 \u0627\u0644\u0642\u0631\u0627\u0621\u0629: ${sec.hideReadReceipt ? "\u2705" : "\u274C"}\n\u2328\uFE0F \u0625\u062E\u0641\u0627\u0621 \u064A\u0643\u062A\u0628: ${sec.hideTyping ? "\u2705" : "\u274C"}\n\u{1F507} \u0631\u0641\u0636 \u0627\u0644\u0645\u0643\u0627\u0644\u0645\u0627\u062A: ${sec.rejectCalls ? "\u2705" : "\u274C"}\n\u{1F47B} \u0648\u0636\u0639 \u0627\u0644\u062A\u062E\u0641\u064A: ${sec.ghostMode ? "\u2705" : "\u274C"}\n\u{1F310} \u0627\u0644\u0638\u0647\u0648\u0631 \u0627\u0644\u0645\u0633\u062A\u0645\u0631: ${active?.alwaysOnline ? "\u2705" : "\u274C"}`,
      { parse_mode: "Markdown", reply_markup: securityMenuKeyboard(sec, active?.alwaysOnline) }
    );
    return true;
  }
  if (data === "sec_pin") {
    if (sec.pin) {
      await bot2.sendMessage(chatId, `\u{1F510} *\u0642\u0641\u0644 PIN*\n\n\u0627\u0644\u062D\u0627\u0644\u0629: \u0645\u0641\u0639\u0651\u0644 \u2705\n\u0623\u062F\u062E\u0644 PIN \u0644\u0644\u062A\u062D\u0642\u0642 \u0623\u0648 \u0627\u062E\u062A\u0631:`, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "\u{1F504} \u062A\u063A\u064A\u064A\u0631 PIN", callback_data: "sec_pin_change" }, { text: "\u{1F513} \u0625\u0644\u063A\u0627\u0621 PIN", callback_data: "sec_pin_remove" }],
            [{ text: "\u{1F519} \u0631\u062C\u0648\u0639", callback_data: "menu_security" }]
          ]
        }
      });
    } else {
      setState(userId, "awaiting_security_pin");
      await bot2.sendMessage(chatId, "\u{1F510} *\u0625\u0639\u062F\u0627\u062F \u0642\u0641\u0644 PIN*\n\n\u0623\u062F\u062E\u0644 PIN \u0645\u0643\u0648\u0651\u0646 \u0645\u0646 4 \u0623\u0631\u0642\u0627\u0645:", {
        parse_mode: "Markdown",
        reply_markup: cancelKeyboard()
      });
    }
    return true;
  }
  if (data === "sec_pin_change") {
    setState(userId, "awaiting_security_pin_change");
    await bot2.sendMessage(chatId, "\u{1F504} \u0623\u062F\u062E\u0644 PIN \u0627\u0644\u062C\u062F\u064A\u062F (4 \u0623\u0631\u0642\u0627\u0645):", { reply_markup: cancelKeyboard() });
    return true;
  }
  if (data === "sec_pin_remove") {
    saveUser(userId, { securitySettings: { ...sec, pin: null } });
    await bot2.sendMessage(chatId, "\u2705 \u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u0642\u0641\u0644 PIN");
    return true;
  }
  if (data === "sec_lastseen") {
    const val = !sec.hideLastSeen;
    saveUser(userId, { securitySettings: { ...sec, hideLastSeen: val } });
    await bot2.sendMessage(chatId, `\u2705 \u0625\u062E\u0641\u0627\u0621 \u0622\u062E\u0631 \u0638\u0647\u0648\u0631: ${val ? "\u0645\u0641\u0639\u0651\u0644 \u2705" : "\u0645\u0639\u0637\u0651\u0644 \u274C"}\n\n\u26A0\uFE0F \u064A\u0639\u062A\u0645\u062F \u0639\u0644\u0649 \u0625\u0645\u0643\u0627\u0646\u064A\u0627\u062A \u0627\u0644\u062D\u0633\u0627\u0628.`);
    return true;
  }
  if (data === "sec_readreceipt") {
    const val = !sec.hideReadReceipt;
    saveUser(userId, { securitySettings: { ...sec, hideReadReceipt: val } });
    await bot2.sendMessage(chatId, `\u2705 \u0625\u062E\u0641\u0627\u0621 \u0639\u0644\u0627\u0645\u0629 \u0627\u0644\u0642\u0631\u0627\u0621\u0629 (\u2713\u2713): ${val ? "\u0645\u0641\u0639\u0651\u0644 \u2705" : "\u0645\u0639\u0637\u0651\u0644 \u274C"}`);
    return true;
  }
  if (data === "sec_typing") {
    const val = !sec.hideTyping;
    saveUser(userId, { securitySettings: { ...sec, hideTyping: val } });
    await bot2.sendMessage(chatId, `\u2705 \u0625\u062E\u0641\u0627\u0621 "\u064A\u0643\u062A\u0628...": ${val ? "\u0645\u0641\u0639\u0651\u0644 \u2705" : "\u0645\u0639\u0637\u0651\u0644 \u274C"}`);
    return true;
  }
  if (data === "sec_always_online") {
    const { getUserNumbers, updateNumber } = _getNumberMgr();
    const { setAlwaysOnline } = _getBaileys();
    const nums = getUserNumbers(userId);
    const activeNum = nums.find((n) => n.status === "active");
    if (!activeNum) {
      await bot2.sendMessage(chatId, "\u274C \u0644\u0627 \u064A\u0648\u062C\u062F \u0631\u0642\u0645 \u0646\u0634\u0637");
      return true;
    }
    const newVal = !activeNum.alwaysOnline;
    await updateNumber(userId, activeNum.id, { ...activeNum, alwaysOnline: newVal });
    setAlwaysOnline(userId, newVal);
    const freshNums = getUserNumbers(userId);
    const freshActive = freshNums.find((n) => n.status === "active");
    await bot2.sendMessage(
      chatId,
      `\u{1F310} *\u0627\u0644\u0638\u0647\u0648\u0631 \u0627\u0644\u0645\u0633\u062A\u0645\u0631*\n\n${newVal ? "\u2705 \u0645\u0641\u0639\u0651\u0644 \u2014 \u0633\u064A\u0638\u0647\u0631 \u062F\u0627\u0626\u0645\u0627\u064B \u0643\u0645\u062A\u0635\u0644" : "\u274C \u0645\u0639\u0637\u0651\u0644"}`,
      { parse_mode: "Markdown", reply_markup: securityMenuKeyboard(sec, freshActive?.alwaysOnline) }
    );
    return true;
  }
  if (data === "sec_reject_calls") {
    const val = !sec.rejectCalls;
    saveUser(userId, { securitySettings: { ...sec, rejectCalls: val } });
    await bot2.sendMessage(chatId, `\u2705 \u0631\u0641\u0636 \u0627\u0644\u0645\u0643\u0627\u0644\u0645\u0627\u062A \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B: ${val ? "\u0645\u0641\u0639\u0651\u0644 \u2705\n\n\u0633\u062A\u064F\u0631\u0641\u0636 \u0643\u0644 \u0645\u0643\u0627\u0644\u0645\u0629 \u0648\u0627\u062A\u0633\u0627\u0628." : "\u0645\u0639\u0637\u0651\u0644 \u274C"}`, {
      reply_markup: securityMenuKeyboard({ ...sec, rejectCalls: val })
    });
    return true;
  }
  if (data === "sec_ghost_mode") {
    const val = !sec.ghostMode;
    const newSec = { ...sec, ghostMode: val };
    if (val) {
      newSec.hideLastSeen = true;
      newSec.hideReadReceipt = true;
      newSec.hideTyping = true;
    }
    saveUser(userId, { securitySettings: newSec });
    await bot2.sendMessage(
      chatId,
      `\u{1F47B} *\u0648\u0636\u0639 \u0627\u0644\u062A\u062E\u0641\u064A \u0627\u0644\u0643\u0627\u0645\u0644: ${val ? "\u0645\u0641\u0639\u0651\u0644 \u2705" : "\u0645\u0639\u0637\u0651\u0644 \u274C"}*\n\n${val ? "\u064A\u064F\u062E\u0641\u064A \u0622\u062E\u0631 \u0638\u0647\u0648\u0631 + \u0639\u0644\u0627\u0645\u0629 \u0627\u0644\u0642\u0631\u0627\u0621\u0629 + \u064A\u0643\u062A\u0628... \u0641\u064A \u0622\u0646\u064D \u0648\u0627\u062D\u062F." : ""}`,
      { reply_markup: securityMenuKeyboard(newSec) }
    );
    return true;
  }
  if (data === "sec_block") {
    setState(userId, "awaiting_person_search");
    saveUser(userId, { _pendingPersonAction: "security_block" });
    await bot2.sendMessage(chatId, "\u{1F6AB} \u0623\u062F\u062E\u0644 \u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641 \u0644\u062D\u0638\u0631\u0647:", { reply_markup: cancelKeyboard() });
    return true;
  }
  if (data === "sec_log") {
    const logs = user.activityLog || [];
    if (logs.length === 0) {
      await bot2.sendMessage(chatId, "\u{1F4DD} \u0633\u062C\u0644 \u0627\u0644\u0623\u0646\u0634\u0637\u0629 \u0641\u0627\u0631\u063A", { reply_markup: securityMenuKeyboard(sec) });
      return true;
    }
    const text = logs.slice(-10).reverse().map((l) => `\u2022 ${l.action} \u2014 ${l.date}`).join("\n");
    await bot2.sendMessage(chatId, `\u{1F4DD} *\u0622\u062E\u0631 \u0627\u0644\u0623\u0646\u0634\u0637\u0629:*\n\n${text}`, { parse_mode: "Markdown", reply_markup: securityMenuKeyboard(sec) });
    return true;
  }
  if (data === "sec_scan") {
    await bot2.sendMessage(
      chatId,
      `\u{1F50D} *\u0641\u062D\u0635 \u0623\u0645\u0627\u0646\u064A \u0634\u0627\u0645\u0644*\n\n\u2705 \u062A\u0634\u0641\u064A\u0631 E2E: \u0645\u0641\u0639\u0651\u0644\n${sec.pin ? "\u2705" : "\u26A0\uFE0F"} \u0642\u0641\u0644 PIN: ${sec.pin ? "\u0645\u0641\u0639\u0651\u0644" : "\u063A\u064A\u0631 \u0645\u0641\u0639\u0651\u0644"}\n${sec.hideLastSeen ? "\u2705" : "\u26A0\uFE0F"} \u0625\u062E\u0641\u0627\u0621 \u0622\u062E\u0631 \u0638\u0647\u0648\u0631: ${sec.hideLastSeen ? "\u0645\u0641\u0639\u0651\u0644" : "\u0645\u0639\u0637\u0651\u0644"}\n${sec.hideReadReceipt ? "\u2705" : "\u26A0\uFE0F"} \u0625\u062E\u0641\u0627\u0621 \u0627\u0644\u0642\u0631\u0627\u0621\u0629: ${sec.hideReadReceipt ? "\u0645\u0641\u0639\u0651\u0644" : "\u0645\u0639\u0637\u0651\u0644"}\n${sec.rejectCalls ? "\u2705" : "\u26A0\uFE0F"} \u0631\u0641\u0636 \u0627\u0644\u0645\u0643\u0627\u0644\u0645\u0627\u062A: ${sec.rejectCalls ? "\u0645\u0641\u0639\u0651\u0644" : "\u0645\u0639\u0637\u0651\u0644"}\n${sec.ghostMode ? "\u2705" : "\u26A0\uFE0F"} \u0648\u0636\u0639 \u0627\u0644\u062A\u062E\u0641\u064A: ${sec.ghostMode ? "\u0645\u0641\u0639\u0651\u0644" : "\u0645\u0639\u0637\u0651\u0644"}\n\n\u{1F4A1} *\u0646\u0635\u064A\u062D\u0629:* \u0641\u0639\u0651\u0644 \u0648\u0636\u0639 \u0627\u0644\u062A\u062E\u0641\u064A \u0644\u0644\u062D\u0645\u0627\u064A\u0629 \u0627\u0644\u0643\u0627\u0645\u0644\u0629.`,
      { parse_mode: "Markdown", reply_markup: securityMenuKeyboard(sec) }
    );
    return true;
  }
  if (data === "sec_report") {
    const blockedNums = user.blockedNumbers || [];
    await bot2.sendMessage(
      chatId,
      `\u{1F4CB} *\u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u062E\u0635\u0648\u0635\u064A\u0629 \u0627\u0644\u0643\u0627\u0645\u0644*\n\n\u{1F510} \u0642\u0641\u0644 PIN: ${sec.pin ? "\u2705" : "\u274C"}\n\u{1F441}\uFE0F \u0625\u062E\u0641\u0627\u0621 \u0622\u062E\u0631 \u0638\u0647\u0648\u0631: ${sec.hideLastSeen ? "\u2705" : "\u274C"}\n\u2705 \u0625\u062E\u0641\u0627\u0621 \u0627\u0644\u0642\u0631\u0627\u0621\u0629: ${sec.hideReadReceipt ? "\u2705" : "\u274C"}\n\u2328\uFE0F \u0625\u062E\u0641\u0627\u0621 \u064A\u0643\u062A\u0628: ${sec.hideTyping ? "\u2705" : "\u274C"}\n\u{1F310} \u0627\u0644\u0638\u0647\u0648\u0631 \u0627\u0644\u0645\u0633\u062A\u0645\u0631: ${sec.alwaysOnline ? "\u2705" : "\u274C"}\n\u{1F507} \u0631\u0641\u0636 \u0627\u0644\u0645\u0643\u0627\u0644\u0645\u0627\u062A: ${sec.rejectCalls ? "\u2705" : "\u274C"}\n\u{1F47B} \u0648\u0636\u0639 \u0627\u0644\u062A\u062E\u0641\u064A: ${sec.ghostMode ? "\u2705" : "\u274C"}\n\u{1F6AB} \u0623\u0631\u0642\u0627\u0645 \u0645\u062D\u0638\u0648\u0631\u0629: ${blockedNums.length}`,
      { parse_mode: "Markdown", reply_markup: securityMenuKeyboard(sec) }
    );
    return true;
  }
  return false;
}
