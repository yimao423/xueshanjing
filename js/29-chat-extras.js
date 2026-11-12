/* 雪山晶 · 29-chat-extras ｜ 源：雪山晶.html L21919-L22065 ｜ JS 模块 */
(function () {
  var S = window.SnowCrystal || (window.SnowCrystal = {});
  var Chat = S.Chat = S.Chat || {};
  /* v-fix：聊天语音气泡点击播放保持主模块导出（见 5357 行 S.Chat.playVoiceMsg = playV */
  var V11_MY_KEY = "snowcrystal.account.my.v1";
  function v11LsGet(k) {
    try { var v = window.localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; }
  }
  function v11LsSet(k, v) {
    try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 本机写满时静默 */ }
  }
  function v11LoadMy() {
    var m = v11LsGet(V11_MY_KEY);
    return (m && typeof m === "object") ? m : { name: "", avatar: "", shape: "square" };
  }
  function v11PersistMy(patch) {
    var my = v11LoadMy(), k;
    if (!my || typeof my !== "object") { my = {}; }
    for (k in patch) {
      if (Object.prototype.hasOwnProperty.call(patch, k)) { my[k] = patch[k]; }
    }
    v11LsSet(V11_MY_KEY, my);
  }
  function renderChatRoomInfoV11() {
    var moodEl = document.getElementById("chatInfoMood");
    var heartEl = document.getElementById("chatInfoHeart");
    if (!moodEl && !heartEl) { return; }
    var my = v11LoadMy();
    var mood = (my && my.mood) ? String(my.mood).trim() : "";
    var heart = 0;
    if (my && my.heart !== undefined && my.heart !== null && my.heart !== "") { heart = Math.max(0, Math.floor(Number(my.heart) || 0)); }
    if (moodEl) { moodEl.textContent = "当前情绪为" + (mood || "平静"); }
    if (heartEl) { heartEl.textContent = "心动值 " + heart; }
  }
  /* 内联编辑：把 span 换成 input，Enter/失焦保存，Esc 取消 */
  function v11BeginInlineEdit(id, isNumber) {
    var el = document.getElementById(id);
    if (!el) { return; }
    if (el.querySelector("input")) { return; }
    var m = String(el.textContent || "").match(/(?:当前情绪为|心动值)\s*(.*)$/);
    var val = m ? m[1] : "";
    if (isNumber) { val = val.replace(/[^\d]/g, ""); }
    var input = document.createElement("input");
    input.type = isNumber ? "number" : "text";
    input.value = val;
    input.className = "chat-info-edit";
    input.setAttribute("aria-label", isNumber ? "修改心动值" : "修改当前情绪");
    el.textContent = "";
    el.appendChild(input);
    input.focus();
    if (input.select) { input.select(); }
    function v11Finish(save) {
      if (!el || !el.contains(input)) { return; }
      var newVal = input.value;
      el.removeChild(input);
      if (save && newVal !== "") {
        if (isNumber) {
          var n = Math.max(0, Math.floor(Number(newVal) || 0));
          v11PersistMy({ heart: n });
        } else {
          v11PersistMy({ mood: String(newVal).trim() });
        }
      }
      renderChatRoomInfoV11();
    }
    input.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") { ev.preventDefault(); v11Finish(true); }
      if (ev.key === "Escape") { ev.preventDefault(); v11Finish(false); }
    });
    input.addEventListener("blur", function () { v11Finish(true); });
    input.addEventListener("click", function (ev) { ev.stopPropagation(); });
  }
  function editMoodV11() { v11BeginInlineEdit("chatInfoMood", false); }
  function editHeartV11() { v11BeginInlineEdit("chatInfoHeart", true); }

  /* ---- 导出：新增 / 覆盖同名导出 ---- */
  Chat.renderChatRoomInfo = renderChatRoomInfoV11;
  Chat.editMood = editMoodV11;
  Chat.editHeart = editHeartV11;

  /* 覆盖 openChatRoom：打开聊天室后按持久化值刷新信息区 */
  var v11OrigOpen = Chat.openChatRoom || (window.SnowCrystal && window.SnowCrystal.openChatRoom);
  if (typeof v11OrigOpen === "function") {
    Chat.openChatRoom = function (pid) {
      var r = v11OrigOpen.apply(Chat, arguments);
      renderChatRoomInfoV11();
      return r;
    };
  } else {
    Chat.openChatRoom = function () { renderChatRoomInfoV11(); };
  }

  /* 页面就绪后立即渲染一次（保证已打开的聊天室同步持久化值） */
  renderChatRoomInfoV11();
})();

/* v-fix-20261018：语音字卡全局导出补齐 + 聊天语音播放保底 */
(function () {
  var S = window.SnowCrystal || (window.SnowCrystal = {});
  function need(name, fn) { if (typeof S[name] !== "function" && typeof fn === "function") { S[name] = fn; } }
  need("openVoiceLib", openVoiceLib);
  need("openVoiceGroup", openVoiceGroup);
  need("voiceAddGroup", voiceAddGroup);
  need("voiceRenameGroupAt", voiceRenameGroupAt);
  need("voiceDeleteGroupAt", voiceDeleteGroupAt);
  need("voiceImportFiles", voiceImportFiles);
  need("voiceAddItem", voiceAddItem);
  need("voiceHandleFiles", voiceHandleFiles);
  need("voiceEditName", voiceEditName);
  need("voiceDeleteItem", voiceDeleteItem);
  need("voicePlayItem", voicePlayItem);
  need("voiceDeletePicked", voiceDeletePicked);
  need("voiceBlockPicked", voiceBlockPicked);
  need("voiceUnblockAll", voiceUnblockAll);
  need("voiceMovePicked", voiceMovePicked);
  need("voiceToggleSel", voiceToggleSel);
  need("voiceSelAll", voiceSelAll);
  need("voiceToggleSearch", voiceToggleSearch);
  need("voiceDoSearch", voiceDoSearch);
  need("voiceClearSearch", voiceClearSearch);
  need("renderVoiceGroup", renderVoiceGroup);
  need("renderVoiceLib", renderVoiceLib);
  need("renderVoiceEntry", renderVoiceEntry);
  need("voiceGroups", voiceGroups);
  need("voiceStopPlay", voiceStopPlay);
  need("voicePlaySrc", voicePlaySrc);
  if (!S.voiceNav && typeof voiceNav !== "undefined") { S.voiceNav = voiceNav; }
  /* 聊天语音播放保底：仅当接口缺失且聊天数据接口可用时重建 */
  if (!S.Chat) { S.Chat = {}; }
  if (typeof S.Chat.playVoiceMsg !== "function" && typeof S.Chat.loadChat === "function" && typeof S.Chat.getPartnerId === "function") {
    S.Chat.playVoiceMsg = function (el) {
      var bubble = (el && el.classList && el.classList.contains("chat-voice-bubble")) ? el : (el ? closestData(el, "data-mid", document) : null);
      if (!bubble) { return; }
      if (voiceAudio && voiceAudioBubble === bubble) { voiceStopPlay(); return; }
      var mid = bubble.getAttribute("data-mid") || "";
      var c = S.Chat.loadChat();
      var pid = S.Chat.getPartnerId();
      var list = (c && c.messages && pid && c.messages[pid]) || [];
      var m = null, i;
      for (i = 0; i < list.length; i++) { if (list[i].id === mid) { m = list[i]; break; } }
      if (!m || !m.voice) { voiceStopPlay(); wcToast("语音数据缺失"); return; }
      voicePlaySrc(m.voice, m.voiceDur || 0, null, bubble);
    };
  }
})();
