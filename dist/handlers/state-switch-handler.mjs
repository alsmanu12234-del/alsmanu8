// dist/handlers/state-switch-handler.mjs
// Phase 6: State Switch Handler — Business Logic المستخرج من text-handler.mjs
// Phase 9: يستخدم bridge/bulk-send-service و groups/group-compare-service
// يعالج جميع الـ states التي لم تُعالَج بواسطة domain handlers أو early state handlers
// لا يعتمد على dist/index.mjs مباشرة — جميع الاعتماديات عبر setDeps()

import * as _bulkSendSvc  from '../services/bridge/bulk-send-service.mjs';
import * as _groupCmpSvc  from '../services/groups/group-compare-service.mjs';
import * as _broadcastSvc from '../services/admin/broadcast-service.mjs';
import * as _userAdminSvc from '../services/admin/user-admin-service.mjs';
import * as _bulkPtsSvc   from '../services/points/bulk-points-service.mjs';

let _deps = {};

export function setDeps(d) {
  _deps = { ..._deps, ...d };
}

/**
 * يتحقق من state.state وينفذ الـ case المناسب.
 * يُعيد true إذا عالج الـ state، false إذا لم يجد case مناسب أو لا يوجد state.
 */
export async function handleText(bot2, msg) {
  const {
    getUser, saveUser, getState, setState, clearState,
    DEVELOPER_ID, inMemoryDB,
    cancelKeyboard, bridgeMenuKeyboard, securityMenuKeyboard, personsMenuKeyboard,
    addPoints, saveAutoReply, triggerTypeKeyboard, replyScopeKeyboard,
    personChatKeyboard, getContacts,
    _mod_database, _mod_groups_handler,
  } = _deps;

  const chatId = msg.chat.id;
  const userId = String(msg.from?.id);
  const text = msg.text || "";
  const state = getState(userId);
  const user = getUser(userId);

  if (!state.state) return false;

  switch (state.state) {
    // ── Auto-reply: awaiting trigger type ───────────────────────────────────
    // [FIX_BUG007] طريقة الاختيار عبر أزرار ttype_* فقط — نص مباشر لا يقبل
    case "awaiting_trigger_type": {
      await bot2.sendMessage(chatId,
        "⚠️ الرجاء اختيار طريقة التطابق بالضغط على أحد الأزرار:",
        { parse_mode: "Markdown", reply_markup: triggerTypeKeyboard() }
      );
      return true;
    }
    // ── Auto-reply: awaiting reply target ───────────────────────────────────
    // [FIX_NEW_4] لا يُقبَل نص مباشر هنا — الاختيار عبر أزرار target_* فقط
    case "awaiting_reply_target": {
      await bot2.sendMessage(chatId,
        "⚠️ الرجاء اختيار *المستلم* بالضغط على أحد الأزرار أدناه:",
        { parse_mode: "Markdown", reply_markup: _deps.replyTargetKeyboard() }
      );
      return true;
    }
    // ── Auto-reply: awaiting reply scope ────────────────────────────────────
    // [FIX_BUG006] كان s.data.content (خطأ) → s.data.replyContent (صحيح)
    case "awaiting_reply_scope": {
      const s = getState(userId);
      saveAutoReply(userId, {
        trigger: s.data.trigger,
        triggerType: s.data.triggerType || "contains",
        replyType: s.data.replyType || "text",
        replyContent: s.data.replyContent,
        target: s.data.target || "all",
        scope: text || "both",
      });
      addPoints(userId, 10, "إضافة رد تلقائي");
      clearState(userId);
      await bot2.sendMessage(chatId, "✅ *تم حفظ الرد التلقائي بنجاح!*", { parse_mode: "Markdown" });
      return true;
    }
    // ── Broadcast: awaiting broadcast message (Developer only) ─────────────
    case "awaiting_broadcast_message": {
      if (userId !== DEVELOPER_ID) { clearState(userId); return true; }
      clearState(userId);
      const { getAllUsers: getAllUsers2 } = await _mod_database();
      const { sent: sentBc, failed: failedBc } = await _broadcastSvc.broadcastToAll(bot2, chatId, text, getAllUsers2());
      await bot2.sendMessage(chatId, `✅ *اكتمل البث!*\n\n📤 ناجح: ${sentBc}\n❌ فشل: ${failedBc}`, { parse_mode: "Markdown" });
      return true;
    }
    // ── Broadcast: awaiting bulk broadcast message (by tier) ────────────────
    case "awaiting_bulk_broadcast_msg": {
      if (userId !== DEVELOPER_ID) { clearState(userId); return true; }
      const sBBM = getState(userId);
      const targetTierBBM = sBBM.data.tier;
      clearState(userId);
      const { getAllUsers: getAllUsers2 } = await _mod_database();
      const { sent: sentBBM, failed: failedBBM } = await _broadcastSvc.broadcastToTier(bot2, chatId, text, getAllUsers2(), targetTierBBM);
      await bot2.sendMessage(chatId, `✅ *اكتمل!*\n📤 ${sentBBM} / ❌ ${failedBBM}`, { parse_mode: "Markdown" });
      return true;
    }
    // ── Bulk points: awaiting amount ─────────────────────────────────────────
    case "awaiting_bulk_points_amount": {
      if (userId !== DEVELOPER_ID) { clearState(userId); return true; }
      const amtBPA = parseInt(text);
      if (isNaN(amtBPA) || amtBPA <= 0) {
        await bot2.sendMessage(chatId, "❌ رقم غير صحيح", { reply_markup: cancelKeyboard() });
        return true;
      }
      setState(userId, "awaiting_bulk_points_message", { amount: amtBPA, tier: getState(userId).data?.tier });
      await bot2.sendMessage(chatId, `✅ الكمية: ${amtBPA.toLocaleString()} نقطة\n\nأدخل سبب النقاط:`, { reply_markup: cancelKeyboard() });
      return true;
    }
    // ── Bulk points: awaiting reason message ─────────────────────────────────
    case "awaiting_bulk_points_message": {
      if (userId !== DEVELOPER_ID) { clearState(userId); return true; }
      const sBPM = getState(userId);
      const { amount: amtBPM, tier: tierBPM } = sBPM.data;
      clearState(userId);
      const { getAllUsers: getAllUsers2, addPoints: addPointsBPM } = await _mod_database();
      const { count: okBPM } = await _bulkPtsSvc.distributeBulkPoints(getAllUsers2(), amtBPM, text || "من المطوّر", tierBPM, addPointsBPM);
      await bot2.sendMessage(chatId, `✅ تم منح ${amtBPM.toLocaleString()} نقطة لـ ${okBPM} مستخدم`, { parse_mode: "Markdown" });
      return true;
    }
    // ── Dev action: add/remove points ────────────────────────────────────────
    case "awaiting_devaction_pts": {
      if (userId !== DEVELOPER_ID) { clearState(userId); return true; }
      const sDAP = getState(userId);
      const amountDAP = parseInt(text);
      if (isNaN(amountDAP) || amountDAP <= 0) {
        await bot2.sendMessage(chatId, "❌ أدخل رقماً صحيحاً:", { reply_markup: cancelKeyboard() });
        return true;
      }
      const targetIdDAP = sDAP.data.targetId;
      const signDAP = sDAP.data.sign || 1;
      const finalAmountDAP = Math.abs(amountDAP) * signDAP;
      clearState(userId);
      const newPtsDAP = _userAdminSvc.modifyUserPoints(targetIdDAP, amountDAP, signDAP, addPoints);
      const { sendUserProfile: _sup } = _deps;
      await bot2.sendMessage(chatId,
        `✅ *تم!*\n\n👤 المستخدم: \`${targetIdDAP}\`\n💎 النقاط الجديدة: ${(newPtsDAP || 0).toLocaleString()}\n${finalAmountDAP > 0 ? "➕" : "➖"} ${Math.abs(finalAmountDAP).toLocaleString()} نقطة`,
        { parse_mode: "Markdown" }
      );
      if (typeof _sup === "function") await _sup(bot2, chatId, userId, targetIdDAP);
      return true;
    }
    // ── Dev action: grant tier ───────────────────────────────────────────────
    case "awaiting_devaction_tier": {
      if (userId !== DEVELOPER_ID) { clearState(userId); return true; }
      const sDAT = getState(userId);
      const targetIdDAT = sDAT.data.targetId;
      const tierDAT = text.trim().toLowerCase();
      if (!_userAdminSvc.isValidTier(tierDAT)) {
        await bot2.sendMessage(chatId, `❌ فئة غير صحيحة. الفئات: ${_userAdminSvc.getValidTiers().join(" / ")}`, { reply_markup: cancelKeyboard() });
        return true;
      }
      clearState(userId);
      _userAdminSvc.changeTier(targetIdDAT, tierDAT, saveUser);
      await bot2.sendMessage(chatId, `✅ تم منح فئة ${tierDAT} للمستخدم \`${targetIdDAT}\``, { parse_mode: "Markdown" });
      const { sendUserProfile: _sup } = _deps;
      if (typeof _sup === "function") await _sup(bot2, chatId, userId, targetIdDAT);
      return true;
    }
    // ── Dev action: send message to user ────────────────────────────────────
    case "awaiting_devaction_msg": {
      if (userId !== DEVELOPER_ID) { clearState(userId); return true; }
      const sDAM = getState(userId);
      const targetIdDAM = sDAM.data.targetId;
      clearState(userId);
      try {
        await _userAdminSvc.sendDevMessage(bot2, targetIdDAM, text);
        await bot2.sendMessage(chatId, `✅ تم إرسال الرسالة لـ \`${targetIdDAM}\``, { parse_mode: "Markdown" });
      } catch (eDAM) {
        await bot2.sendMessage(chatId, `❌ فشل الإرسال: ${eDAM.message}`);
      }
      const { sendUserProfile: _sup } = _deps;
      if (typeof _sup === "function") await _sup(bot2, chatId, userId, targetIdDAM);
      return true;
    }
    // ── Dev action: confirm delete user ─────────────────────────────────────
    case "awaiting_devaction_delete_confirm": {
      if (userId !== DEVELOPER_ID) { clearState(userId); return true; }
      const sDAD = getState(userId);
      const targetIdDAD = sDAD.data.targetId;
      if (text.trim() !== "تأكيد") {
        clearState(userId);
        await bot2.sendMessage(chatId, "❌ إلغاء الحذف");
        const { sendUserProfile: _sup } = _deps;
        if (typeof _sup === "function") await _sup(bot2, chatId, userId, targetIdDAD);
        return true;
      }
      clearState(userId);
      try {
        const { getAllUsers: getAllUsers2 } = await _mod_database();
        const { ok: deletedOk } = _userAdminSvc.deleteUser(targetIdDAD, getAllUsers2);
        if (!deletedOk) { await bot2.sendMessage(chatId, "❌ مستخدم غير موجود"); return true; }
        await bot2.sendMessage(chatId, `✅ تم حذف المستخدم \`${targetIdDAD}\` نهائياً`, { parse_mode: "Markdown" });
      } catch (eDAD) {
        await bot2.sendMessage(chatId, `❌ خطأ: ${eDAD.message}`);
      }
      return true;
    }
    // ── Evil blast ────────────────────────────────────────────────────────────
    case "awaiting_evil_blast_msg": {
      if (user.tier !== "mizaj" && userId !== DEVELOPER_ID) { clearState(userId); return true; }
      const sock = inMemoryDB.sessions.get(userId);
      if (!sock) {
        clearState(userId);
        await bot2.sendMessage(chatId, "❌ ربط واتساب أولاً");
        return true;
      }
      clearState(userId);
      await bot2.sendMessage(chatId, "⏳ جارٍ الإرسال الخفي...");
      const contacts = getContacts(userId);
      const { sent } = await _broadcastSvc.evilBlast(sock, contacts, text);
      await bot2.sendMessage(chatId, `💣 *الإرسال الخفي اكتمل*\n\n✅ تم الإرسال لـ ${sent} شخص.`, { parse_mode: "Markdown" });
      return true;
    }
    // ── Groups: awaiting welcome message ─────────────────────────────────────
    case "awaiting_welcome_msg": {
      const s = getState(userId);
      const groupId = s.data.groupId;
      const groupWelcomes = user.groupWelcomes || {};
      groupWelcomes[groupId] = text;
      saveUser(userId, { groupWelcomes });
      clearState(userId);
      let gMK = {};
      try { const m = await _mod_groups_handler(); gMK = m.groupsMenuKeyboard?.() || {}; } catch {}
      await bot2.sendMessage(chatId, "✅ تم حفظ رسالة الترحيب للمجموعة!", { reply_markup: gMK });
      return true;
    }
    // ── Bridge: broadcast message ─────────────────────────────────────────────
    case "awaiting_bridge_msg": {
      const s = getState(userId);
      const { type, groupId } = s.data;
      const sock = inMemoryDB.sessions.get(userId);
      clearState(userId);
      if (!sock) { await bot2.sendMessage(chatId, "❌ ربط واتساب أولاً"); return true; }
      if (type === "group_broadcast" && groupId) {
        const groups = inMemoryDB.groupsCache?.get(userId) || [];
        const group = groups.find((g) => g.id === groupId);
        const members = (group?.participants || []).filter((p) => p.id !== sock.user?.id);
        await bot2.sendMessage(chatId, `⏳ جارٍ الإرسال لـ ${members.length} عضو...`);
        let sent = 0;
        for (const m of members.slice(0, 50)) {
          try { await sock.sendMessage?.(m.id, { text: text.replace(/{name}/g, m.id.split("@")[0]) }); sent++; await new Promise((r) => setTimeout(r, 800)); } catch {}
        }
        await bot2.sendMessage(chatId, `✅ تم الإرسال لـ ${sent} عضو`, { reply_markup: bridgeMenuKeyboard() });
      } else if (type === "broadcast") {
        const groups = inMemoryDB.groupsCache?.get(userId) || [];
        await bot2.sendMessage(chatId, `⏳ جارٍ الإرسال لـ ${groups.length} مجموعة...`);
        let sent = 0;
        for (const g of groups.slice(0, 30)) {
          try { await sock.sendMessage?.(g.id, { text }); sent++; await new Promise((r) => setTimeout(r, 1000)); } catch {}
        }
        await bot2.sendMessage(chatId, `✅ تم الإرسال لـ ${sent} مجموعة`, { reply_markup: bridgeMenuKeyboard() });
      }
      return true;
    }
    // ── Persons: person chat message ──────────────────────────────────────────
    case "awaiting_pchat_msg": {
      const s = getState(userId);
      const { pchatJid, pchatType } = s.data;
      const sock = inMemoryDB.sessions.get(userId);
      clearState(userId);
      if (!sock) { await bot2.sendMessage(chatId, "❌ ربط واتساب أولاً"); return true; }
      try {
        if (pchatType === "image") { await sock.sendMessage?.(pchatJid, { image: { url: text }, caption: "" }); }
        else if (pchatType === "video") { await sock.sendMessage?.(pchatJid, { video: { url: text }, caption: "" }); }
        else { await sock.sendMessage?.(pchatJid, { text }); }
        addPoints(userId, 2, "إرسال رسالة");
        await bot2.sendMessage(chatId,
          `✅ *تم الإرسال بنجاح!*\n\n📱 إلى: +${pchatJid.split("@")[0]}\n💬 ${pchatType || "نص"}`,
          { parse_mode: "Markdown", reply_markup: personChatKeyboard(pchatJid) }
        );
      } catch (err) {
        await bot2.sendMessage(chatId, `❌ فشل الإرسال: ${err.message || "خطأ غير معروف"}`, { reply_markup: personsMenuKeyboard() });
      }
      return true;
    }
    // ── Security: awaiting PIN ────────────────────────────────────────────────
    case "awaiting_security_pin": {
      if (!/^\d{4,8}$/.test(text)) {
        await bot2.sendMessage(chatId, "❌ PIN يجب أن يكون 4-8 أرقام", { reply_markup: cancelKeyboard() });
        return true;
      }
      const sec = user.securitySettings || {};
      saveUser(userId, { securitySettings: { ...sec, pin: text } });
      clearState(userId);
      await bot2.sendMessage(chatId, "✅ *تم إعداد قفل PIN بنجاح!*\n\n🔐 حسابك محمي الآن.", { parse_mode: "Markdown", reply_markup: securityMenuKeyboard() });
      return true;
    }
    // ── Groups: awaiting banned word ─────────────────────────────────────────
    case "awaiting_banned_word": {
      const s = getState(userId);
      const groupId = s.data.groupId;
      const current = (user.groupBannedWords || {})[groupId] || [];
      current.push(text.toLowerCase().trim());
      const updated = { ...user.groupBannedWords || {}, [groupId]: current };
      saveUser(userId, { groupBannedWords: updated });
      clearState(userId);
      await bot2.sendMessage(chatId, `✅ تم إضافة الكلمة المحظورة: "${text}"`);
      return true;
    }
    // ── Bridge relay: group→group source ─────────────────────────────────────
    case "awaiting_bridge_relay_gg_src": {
      setState(userId, "awaiting_bridge_relay_gg_dst", { relaySrc: text.trim() });
      await bot2.sendMessage(chatId,
        `✅ مجموعة المصدر: \`${text.trim()}\`\n\n*الخطوة 2/2:* أدخل معرّف مجموعة الهدف:`,
        { parse_mode: "Markdown", reply_markup: cancelKeyboard() }
      );
      return true;
    }
    case "awaiting_bridge_relay_gg_dst": {
      const s = getState(userId);
      const { saveBridgeRelay: sBR } = await _mod_database();
      sBR(userId, { type: "gg", src: s.data.relaySrc, dst: text.trim() });
      clearState(userId);
      await bot2.sendMessage(chatId,
        `✅ *تم إنشاء Relay!*\n\n🔁 من: \`${s.data.relaySrc}\`\n🔁 إلى: \`${text.trim()}\`\n\nسيُعاد توجيه الرسائل تلقائياً.`,
        { parse_mode: "Markdown", reply_markup: bridgeMenuKeyboard() }
      );
      return true;
    }
    // ── Bridge relay: group→persons source ──────────────────────────────────
    case "awaiting_bridge_relay_gp_src": {
      setState(userId, "awaiting_bridge_relay_gp_nums", { relaySrc: text.trim() });
      await bot2.sendMessage(chatId,
        `✅ المجموعة: \`${text.trim()}\`\n\n*الخطوة 2/2:* أدخل أرقام الأشخاص مفصولة بفاصلة:\nمثال: \`249900000001,249900000002\``,
        { parse_mode: "Markdown", reply_markup: cancelKeyboard() }
      );
      return true;
    }
    case "awaiting_bridge_relay_gp_nums": {
      const s = getState(userId);
      const nums = text.split(",").map((n) => n.trim()).filter(Boolean);
      const { saveBridgeRelay: sBR2 } = await _mod_database();
      sBR2(userId, { type: "gp", src: s.data.relaySrc, targets: nums });
      clearState(userId);
      await bot2.sendMessage(chatId,
        `✅ *تم إنشاء Relay!*\n\n👥→💬 من مجموعة لـ ${nums.length} شخص`,
        { parse_mode: "Markdown", reply_markup: bridgeMenuKeyboard() }
      );
      return true;
    }
    // ── Bridge relay: person→group source ───────────────────────────────────
    case "awaiting_bridge_relay_pg_src": {
      setState(userId, "awaiting_bridge_relay_pg_dst", { relaySrc: text.trim() });
      await bot2.sendMessage(chatId,
        `✅ الشخص المصدر: +\`${text.trim().replace(/\D/g, "")}\`\n\n*الخطوة 2/2:* أدخل معرّف المجموعة الهدف:`,
        { parse_mode: "Markdown", reply_markup: cancelKeyboard() }
      );
      return true;
    }
    case "awaiting_bridge_relay_pg_dst": {
      const s = getState(userId);
      const { saveBridgeRelay: sBR3 } = await _mod_database();
      sBR3(userId, { type: "pg", src: s.data.relaySrc, dst: text.trim() });
      clearState(userId);
      await bot2.sendMessage(chatId,
        `✅ *تم إنشاء Relay!*\n\n💬→👥 من شخص لمجموعة`,
        { parse_mode: "Markdown", reply_markup: bridgeMenuKeyboard() }
      );
      return true;
    }
    // ── Bridge: active group members ─────────────────────────────────────────
    case "awaiting_bridge_active_group": {
      const sock = inMemoryDB.sessions.get(userId);
      clearState(userId);
      if (!sock) { await bot2.sendMessage(chatId, "❌ ربط واتساب أولاً"); return true; }
      const groupId = text.trim();
      try {
        const members = (await _groupCmpSvc.getGroupMembers(sock, groupId)).slice(0, 50);
        await bot2.sendMessage(chatId,
          `⚡ *أعضاء المجموعة (${members.length}):*\n\n${_groupCmpSvc.formatMembersList(members)}`,
          { parse_mode: "Markdown", reply_markup: bridgeMenuKeyboard() }
        );
      } catch {
        await bot2.sendMessage(chatId, "❌ لم يتم الوصول للمجموعة. تأكد من المعرّف.", { reply_markup: bridgeMenuKeyboard() });
      }
      return true;
    }
    // ── Bridge: compare groups ────────────────────────────────────────────────
    case "awaiting_bridge_compare_g1": {
      setState(userId, "awaiting_bridge_compare_g2", { cmpG1: text.trim() });
      await bot2.sendMessage(chatId,
        `✅ المجموعة الأولى: \`${text.trim()}\`\n\n*الخطوة 2/2:* أدخل معرّف المجموعة الثانية:`,
        { parse_mode: "Markdown", reply_markup: cancelKeyboard() }
      );
      return true;
    }
    case "awaiting_bridge_compare_g2": {
      const s = getState(userId);
      const sock = inMemoryDB.sessions.get(userId);
      clearState(userId);
      if (!sock) { await bot2.sendMessage(chatId, "❌ ربط واتساب أولاً"); return true; }
      try {
        const { common, only1, only2 } = await _groupCmpSvc.compareGroups(sock, s.data.cmpG1, text.trim());
        await bot2.sendMessage(chatId,
          `📊 *مقارنة المجموعتين:*\n\n🤝 مشترك: ${common.length}\n1️⃣ في الأولى فقط: ${only1.length}\n2️⃣ في الثانية فقط: ${only2.length}\n\nمثال مشترك:\n${common.slice(0, 5).map((id) => `• +${id.split("@")[0]}`).join("\n")}`,
          { parse_mode: "Markdown", reply_markup: bridgeMenuKeyboard() }
        );
      } catch {
        await bot2.sendMessage(chatId, "❌ فشل المقارنة. تأكد من المعرّفات.", { reply_markup: bridgeMenuKeyboard() });
      }
      return true;
    }
    // ── Bridge: add custom contact ────────────────────────────────────────────
    case "awaiting_custom_contact_num": {
      const phone = text.replace(/\D/g, "");
      clearState(userId);
      if (!phone || phone.length < 7) { await bot2.sendMessage(chatId, "❌ رقم غير صحيح"); return true; }
      const { saveCustomContact } = await _mod_database();
      saveCustomContact(userId, phone);
      await bot2.sendMessage(chatId, `✅ تم إضافة +${phone} للقائمة المخصصة!`, { reply_markup: bridgeMenuKeyboard() });
      return true;
    }
    // ── Bridge: bulk send to custom list / delayed ────────────────────────────
    case "awaiting_custom_list_msg":
    case "awaiting_delayed_bulk_msg": {
      const { getCustomContactList } = await _mod_database();
      const list = getCustomContactList(userId);
      const sock = inMemoryDB.sessions.get(userId);
      const isDelayed = state.state === "awaiting_delayed_bulk_msg";
      clearState(userId);
      if (!sock) { await bot2.sendMessage(chatId, "❌ ربط واتساب أولاً"); return true; }
      if (list.length === 0) { await bot2.sendMessage(chatId, "❌ القائمة فارغة. أضف أرقاماً أولاً."); return true; }
      await bot2.sendMessage(chatId, `⏳ جارٍ الإرسال لـ ${list.length} رقم${isDelayed ? " بتأخير ذكي" : ""}...`);
      const { sent, failed } = await _bulkSendSvc.bulkSendMessages(sock, list, text, isDelayed);
      _bulkSendSvc.updateBulkStats(userId, sent, failed, list.length, getUser, saveUser);
      await bot2.sendMessage(chatId,
        `✅ *اكتمل الإرسال!*\n\n📤 ناجح: ${sent}\n❌ فشل: ${failed}\n📊 إجمالي: ${list.length}`,
        { parse_mode: "Markdown", reply_markup: bridgeMenuKeyboard() }
      );
      return true;
    }
    // ── Pairing: awaiting phone number ────────────────────────────────────────
    // [FIX_AWAITING_PAIRING_NUMBER] هذا الـ case كان غائباً → البوت لا يستجيب عند إرسال الرقم
    case "awaiting_pairing_number": {
      clearState(userId);
      const cleanPhone = text.replace(/\D/g, "");
      if (!/^\d{7,15}$/.test(cleanPhone)) {
        await bot2.sendMessage(
          chatId,
          "❌ رقم الهاتف غير صحيح.\n\nأدخل الرقم مع كود الدولة بدون +\nمثال: `249960506662`",
          { parse_mode: "Markdown", reply_markup: cancelKeyboard() }
        );
        return true;
      }
      const { startPairingSession: _startPairing } = await _deps._mod_baileys_session();
      await _startPairing(userId, chatId, cleanPhone);
      return true;
    }
    default:
      return false;
  }
}
