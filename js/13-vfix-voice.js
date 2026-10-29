/* v-fix-20261018：语音字卡全局导出补齐 + 聊天语音播放保底
   1) 语音字卡模块（script7 内定义）此前从未把 voice* 系列挂到 window.SnowCrystal，
      而 HTML 大量 onclick="SnowCrystal.xxx()" 依赖它们 → 语音字卡入口/按钮点击全部失效。
      此处一次性补齐导出，点击即可打开。
   2) 聊天语音气泡点击播放接口做保底挂载，确保点击气泡必有响应。 */
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
  /* 聊天语音播放保底：仅当接口缺失且聊天数据接口可用时重建（避免作用域不可达误报） */
  if (!S.Chat) { S.Chat = {}; }
  if (typeof S.Chat.playVoiceMsg !== "function" && typeof loadChat === "function") {
    S.Chat.playVoiceMsg = function (el) {
      var bubble = (el && el.classList && el.classList.contains("chat-voice-bubble")) ? el : (el ? closestData(el, "data-mid", document) : null);
      if (!bubble) { return; }
      if (voiceAudio && voiceAudioBubble === bubble) { voiceStopPlay(); return; }
      var mid = bubble.getAttribute("data-mid") || "";
      var c = loadChat();
      var list = (c && c.messages && state.partnerId && c.messages[state.partnerId]) || [];
      var m = null, i;
      for (i = 0; i < list.length; i++) { if (list[i].id === mid) { m = list[i]; break; } }
      if (!m || !m.voice) { voiceStopPlay(); wcToast("语音数据缺失"); return; }
      voicePlaySrc(m.voice, m.voiceDur || 0, null, bubble);
    };
  }
})();

