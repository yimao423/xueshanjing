/* =========================================================
   v100：字卡 / 课程 / 设置 三大页面子页 + 全局页面大小
   - 新增子页：字卡管理；课程表 / 我的课程 / 课程详情 /
     精选讲师 / 课程合集 / 学习技巧；页面大小
   - 页面大小：localStorage「snowcrystal.pageSize」= {"scale": n}，
     配合 theme-engine 的 fitOneScreen() 实时生效并记忆偏好；
     【仅】作用于字卡 / 课程 / 设置三大页面及其子页面，
     首页 / 聊天界面等其余页面不参与缩放（theme-engine 侧按 data-page 归属判断）
   - 新页面全部走 SnowCrystal.switchPage / backPage 导航体系
   ========================================================= */
(function () {
  "use strict";
  var S = window.SnowCrystal || (window.SnowCrystal = {});

  /* ---------------- 课程库默认数据（本机只读展示 + 学习进度单独记忆） ---------------- */
  var COURSES_KEY = "snowcrystal.courses.v1";
  var PROGRESS_KEY = "snowcrystal.courses.progress.v1";
  var DEFAULT_COURSES = [
    { id: "c1", title: "好好说话：让 TA 更懂你", teacher: "林晚", level: "入门", mins: 18, desc: "从日常聊天出发，学会清晰表达感受与需求，减少误会。", chapters: ["为什么 TA 总听不懂", "表达感受的三个句式", "请求 vs 命令", "实战：一次温和沟通"] },
    { id: "c2", title: "亲密关系相处课", teacher: "陈屿", level: "进阶", mins: 24, desc: "理解相处节奏，建立安全感和边界感。", chapters: ["安全感从哪来", "边界不是拒绝", "情绪来了怎么办", "练习：一周相处实验"] },
    { id: "c3", title: "异地恋保鲜手册", teacher: "林晚", level: "主题", mins: 15, desc: "给异地恋的你们：高频小互动与仪式感清单。", chapters: ["早晚安的仪式感", "一起做的事", "情绪同步技巧", "见面倒计时"] },
    { id: "c4", title: "情绪价值入门", teacher: "苏禾", level: "入门", mins: 20, desc: "学会回应情绪，做 TA 最想分享的人。", chapters: ["先接住，再给建议", "共情句式库", "情绪雷区避坑", "练习：接住三次情绪"] }
  ];
  var DEFAULT_TEACHERS = [
    { id: "t1", name: "林晚", focus: "沟通表达 · 亲密关系", bio: "专注两性沟通研究，课程主打「可落地的表达技巧」。", courses: ["好好说话：让 TA 更懂你", "异地恋保鲜手册"] },
    { id: "t2", name: "陈屿", focus: "关系经营 · 自我成长", bio: "关系教练，擅长把心理学知识讲成生活小事。", courses: ["亲密关系相处课"] },
    { id: "t3", name: "苏禾", focus: "情绪管理 · 表达力", bio: "情绪表达研究者，教你稳稳接住每一次情绪。", courses: ["情绪价值入门"] }
  ];
  var DEFAULT_COLLECTIONS = [
    { id: "col1", name: "入门必修", tag: "2 门", desc: "从零开始，建立健康的关系沟通习惯。", ids: ["c1", "c4"] },
    { id: "col2", name: "进阶提升", tag: "1 门", desc: "深入相处节奏与安全感建设。", ids: ["c2"] },
    { id: "col3", name: "主题速学", tag: "1 门", desc: "异地恋 / 节日 / 仪式感等主题速学。", ids: ["c3"] }
  ];
  var DEFAULT_SCHEDULE = [
    { day: "周一", id: "c1" },
    { day: "周三", id: "c2" },
    { day: "周五", id: "c4" }
  ];
  var DEFAULT_TIPS = [
    { title: "3 分钟上手", items: ["打开课程 → 先看「导语」", "每天只学一节，10~20 分钟", "课后做一次小练习，效果翻倍"] },
    { title: "记忆与复习", items: ["学习进度自动保存在本机", "按课程表节奏学习，形成习惯", "回看「章节列表」，随时复习"] },
    { title: "把课程用起来", items: ["把学到的话术写进字卡", "在聊天里自然练习一次", "周末和 TA 分享你的感受"] }
  ];

  function getCourses() {
    try {
      var raw = localStorage.getItem(COURSES_KEY);
      if (raw) { var arr = JSON.parse(raw); if (Array.isArray(arr) && arr.length) { return arr; } }
    } catch (e) { /* 忽略损坏数据 */ }
    return DEFAULT_COURSES;
  }
  function getProgress() {
    try {
      var raw = localStorage.getItem(PROGRESS_KEY);
      if (raw) { var o = JSON.parse(raw); if (o && typeof o === "object") { return o; } }
    } catch (e) { /* 忽略损坏数据 */ }
    return {};
  }
  function saveProgress(p) {
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch (e) { /* 忽略 */ }
  }
  function courseById(id) {
    var cs = getCourses();
    for (var i = 0; i < cs.length; i++) { if (cs[i].id === id) { return cs[i]; } }
    return null;
  }
  function courseProgress(id) {
    var p = getProgress();
    return p[id] || {};
  }
  function toggleChapterDone(id, idx) {
    var p = getProgress();
    var cur = p[id] || {};
    var done = cur.chapters || {};
    done[idx] = done[idx] ? false : true;
    cur.chapters = done;
    p[id] = cur;
    saveProgress(p);
  }
  function courseStat(id) {
    var c = courseById(id);
    if (!c) { return { total: 0, done: 0, pct: 0 }; }
    var p = courseProgress(id).chapters || {};
    var total = c.chapters.length;
    var done = 0;
    for (var i = 0; i < total; i++) { if (p[i]) { done++; } }
    return { total: total, done: done, pct: total ? Math.round((done / total) * 100) : 0 };
  }

  /* ---------------- 页面大小 的读写 ---------------- */
  var PAGE_SIZE_KEY = "snowcrystal.pageSize";

  function loadJson(key, def) {
    try {
      var raw = localStorage.getItem(key);
      if (raw) { var o = JSON.parse(raw); if (o && typeof o === "object") { return o; } }
    } catch (e) { /* 忽略损坏数据 */ }
    return def;
  }
  function saveJson(key, o) {
    try { localStorage.setItem(key, JSON.stringify(o)); } catch (e) { /* 忽略 */ }
  }
  function getPageSize() {
    var o = loadJson(PAGE_SIZE_KEY, {});
    var s = o.scale;
    if (typeof s !== "number" || isNaN(s)) { return 100; }
    return Math.max(70, Math.min(140, Math.round(s)));
  }
  function setPageSize(v) {
    var n = Math.max(70, Math.min(140, Math.round(v)));
    saveJson(PAGE_SIZE_KEY, { scale: n });
    if (typeof window.refitAll === "function") { window.refitAll(); }
    else if (typeof window.fitOneScreen === "function") { window.fitOneScreen(); }
    return n;
  }
  function toast(text) {
    if (typeof window.wcToast === "function") { window.wcToast(text); }
  }

  /* ---------------- 字卡统计 ---------------- */
  function wcStats() {
    var raw = null;
    try { raw = localStorage.getItem("snowcrystal.wordcard.v2"); } catch (e) { /* 忽略 */ }
    var groups = { quote: 0, main: 0, kao: 0, emoji: 0, sticker: 0, pat: 0 };
    var total = 0;
    if (raw) {
      try {
        var o = JSON.parse(raw);
        if (o && typeof o === "object") {
          for (var k in groups) {
            if (Object.prototype.hasOwnProperty.call(groups, k) && Array.isArray(o[k])) {
              for (var i = 0; i < o[k].length; i++) {
                var g = o[k][i];
                if (g && Array.isArray(g.items)) { groups[k] += g.items.length; }
              }
            }
          }
        }
      } catch (e) { /* 忽略损坏数据 */ }
    }
    for (var k2 in groups) { if (Object.prototype.hasOwnProperty.call(groups, k2)) { total += groups[k2]; } }
    return { groups: groups, total: total };
  }

  /* ================= 页面渲染 ================= */

  /* ---- 字卡管理 ---- */
  function renderWordcardManage() {
    var st = wcStats();
    var grid = document.getElementById("wcStatGrid");
    if (!grid) { return; }
    grid.innerHTML =
      '<div class="wc-stat-card"><span class="wc-stat-num">' + st.total + '</span><span class="wc-stat-label">字卡内容（条）</span></div>' +
      '<div class="wc-stat-card"><span class="wc-stat-num">' + st.groups.kao + '</span><span class="wc-stat-label">颜文字（条）</span></div>' +
      '<div class="wc-stat-card"><span class="wc-stat-num">' + st.groups.sticker + '</span><span class="wc-stat-label">表情包（条）</span></div>' +
      '<div class="wc-stat-card"><span class="wc-stat-num">' + st.groups.pat + '</span><span class="wc-stat-label">拍一拍（条）</span></div>';
  }
  function openWordcardManage() {
    renderWordcardManage();
    S.switchPage("wordcard-manage");
  }

  /* ---- 尺寸设置（整合：首页缩放 + 字卡/课程/设置整体缩放） ---- */
  function renderPageSize() {
    var v = getPageSize();
    var val = document.getElementById("psSizeVal");
    var range = document.getElementById("psScaleRange");
    if (val) { val.textContent = v + "%"; }
    if (range) { range.value = v; }
  }
  function openSizeSettings() {
    renderPageSize();
    S.openHomeSize();
  }
  function bindPageSize() {
    var range = document.getElementById("psScaleRange");
    if (range) {
      range.addEventListener("input", function () {
        var n = setPageSize(parseInt(range.value, 10) || 100);
        var val = document.getElementById("psSizeVal");
        if (val) { val.textContent = n + "%"; }
      });
    }
  }
  function resetSizeDefaults() {
    setPageSize(100);
    if (typeof window.homeSizeState === "object" && window.homeSizeState !== null) {
      window.homeSizeState.scale = 100;
    }
    if (typeof window.saveHomeSize === "function") { window.saveHomeSize(); }
    if (typeof window.applyHomeSize === "function") { window.applyHomeSize(); }
    if (typeof window.refitAll === "function") { window.refitAll(); }
    renderPageSize();
    var hsVal = document.getElementById("hsSizeVal");
    var hsRange = document.getElementById("hsScaleRange");
    if (hsVal) { hsVal.textContent = "100%"; }
    if (hsRange) { hsRange.value = 100; }
    toast("已恢复默认尺寸");
  }

  /* ---- 我的课程 ---- */
  function renderCourseList() {
    var wrap = document.getElementById("courseListWrap");
    if (!wrap) { return; }
    var cs = getCourses();
    var html = '<p class="group-title">学习进度</p><div class="row-list">';
    for (var i = 0; i < cs.length; i++) {
      var c = cs[i];
      var st = courseStat(c.id);
      html += '<article class="row-card course-item" onclick="SnowCrystal.openCourseDetail(\'' + c.id + '\')">' +
        '<div class="row-main"><span class="row-title">' + c.title + '</span>' +
        '<span class="row-desc">' + c.teacher + ' · ' + c.level + ' · ' + c.mins + ' 分钟</span>' +
        '<span class="course-bar"><span class="course-bar-fill" style="width:' + st.pct + '%"></span></span>' +
        '<span class="course-pct">已完成 ' + st.done + '/' + st.total + ' 章 · ' + st.pct + '%</span></div>' +
        '<span class="row-arrow">›</span></article>';
    }
    html += '</div>';
    wrap.innerHTML = html;
  }
  function openCourseList() {
    renderCourseList();
    S.switchPage("course-list");
  }

  /* ---- 课程详情 ---- */
  function openCourseDetail(id, from) {
    if (from) { S.courseDetailFrom = from; }
    renderCourseDetail(id);
    S.switchPage("course-detail");
  }
  function renderCourseDetail(id) {
    var c = courseById(id);
    var wrap = document.getElementById("courseDetailWrap");
    var titleEl = document.getElementById("courseDetailTitle");
    if (!wrap || !c) { return; }
    if (titleEl) { titleEl.textContent = c.title; }
    var st = courseStat(c.id);
    var p = courseProgress(c.id).chapters || {};
    var html = '<div class="theme-panel zone-panel"><div class="zone-row">' +
      '<div class="zone-info"><span class="zone-name">' + c.title + '</span>' +
      '<span class="zone-desc">' + c.teacher + ' · ' + c.level + ' · ' + c.mins + ' 分钟</span></div></div>' +
      '<p class="course-desc">' + c.desc + '</p>' +
      '<span class="course-bar"><span class="course-bar-fill" style="width:' + st.pct + '%"></span></span>' +
      '<p class="course-pct-line">已完成 ' + st.done + '/' + st.total + ' 章 · ' + st.pct + '%</p></div>';
    html += '<p class="group-title">章节列表</p><div class="row-list">';
    for (var i = 0; i < c.chapters.length; i++) {
      var done = p[i] === true;
      html += '<article class="row-card hs-switch-row">' +
        '<div class="row-main"><span class="row-title">' + (i + 1) + '. ' + c.chapters[i] + '</span>' +
        '<span class="row-desc">' + (done ? "已学完" : "未开始") + '</span></div>' +
        '<button type="button" class="seg-btn chapter-toggle ' + (done ? "is-on" : "") + '" onclick="SnowCrystal.toggleChapter(\'' + c.id + '\',' + i + ')">' +
        (done ? "✓ 完成" : "标完成") + '</button></article>';
    }
    html += '</div>';
    wrap.innerHTML = html;
  }
  function toggleChapter(id, idx) {
    toggleChapterDone(id, idx);
    renderCourseDetail(id);
  }
  function backCourseDetail() {
    S.backPage(S.courseDetailFrom || "course-list");
  }

  /* ---- 课程表 ---- */
  function renderCourseSchedule() {
    var grid = document.getElementById("courseScheduleGrid");
    if (!grid) { return; }
    var html = "";
    for (var i = 0; i < DEFAULT_SCHEDULE.length; i++) {
      var s = DEFAULT_SCHEDULE[i];
      var c = courseById(s.id);
      if (!c) { continue; }
      html += '<article class="course-slot" onclick="SnowCrystal.openCourseDetail(\'' + s.id + '\',\'course-schedule\')">' +
        '<span class="course-slot-day">' + s.day + '</span>' +
        '<span class="course-slot-title">' + c.title + '</span>' +
        '<span class="course-slot-meta">' + c.teacher + ' · ' + c.mins + ' 分钟</span></article>';
    }
    grid.innerHTML = html;
  }
  function openCourseSchedule() {
    renderCourseSchedule();
    S.switchPage("course-schedule");
  }

  /* ---- 精选讲师 ---- */
  function renderCourseTeachers() {
    var wrap = document.getElementById("courseTeachersWrap");
    if (!wrap) { return; }
    var html = '<div class="row-list">';
    for (var i = 0; i < DEFAULT_TEACHERS.length; i++) {
      var t = DEFAULT_TEACHERS[i];
      html += '<article class="row-card teacher-card"><div class="teacher-avatar">' + t.name.charAt(0) + '</div>' +
        '<div class="row-main"><span class="row-title">' + t.name + '</span>' +
        '<span class="row-desc">' + t.focus + '</span>' +
        '<span class="row-desc">' + t.bio + '</span>' +
        '<span class="teacher-courses">主讲：' + t.courses.join(" · ") + '</span></div></article>';
    }
    html += '</div>';
    wrap.innerHTML = html;
  }
  function openCourseTeachers() {
    renderCourseTeachers();
    S.switchPage("course-teachers");
  }

  /* ---- 课程合集 ---- */
  function renderCourseCollection() {
    var wrap = document.getElementById("courseCollectionWrap");
    if (!wrap) { return; }
    var html = '<div class="row-list">';
    for (var i = 0; i < DEFAULT_COLLECTIONS.length; i++) {
      var col = DEFAULT_COLLECTIONS[i];
      var names = [];
      for (var j = 0; j < col.ids.length; j++) {
        var c = courseById(col.ids[j]);
        if (c) { names.push('<button type="button" class="seg-btn collection-course" onclick="SnowCrystal.openCourseDetail(\'' + c.id + '\',\'course-collection\')">' + c.title + '</button>'); }
      }
      html += '<article class="row-card"><div class="row-main"><span class="row-title">' + col.name + '</span>' +
        '<span class="row-desc">' + col.desc + '</span>' +
        '<span class="collection-chips">' + names.join("") + '</span></div></article>';
    }
    html += '</div>';
    wrap.innerHTML = html;
  }
  function openCourseCollection() {
    renderCourseCollection();
    S.switchPage("course-collection");
  }

  /* ---- 学习技巧 ---- */
  function renderCourseTips() {
    var wrap = document.getElementById("courseTipsWrap");
    if (!wrap) { return; }
    var html = "";
    for (var i = 0; i < DEFAULT_TIPS.length; i++) {
      var tip = DEFAULT_TIPS[i];
      html += '<div class="theme-panel zone-panel"><div class="zone-row">' +
        '<div class="zone-info"><span class="zone-name">' + tip.title + '</span></div></div>' +
        '<ul class="tips-list">';
      for (var j = 0; j < tip.items.length; j++) {
        html += '<li>' + tip.items[j] + '</li>';
      }
      html += '</ul></div>';
    }
    wrap.innerHTML = html;
  }
  function openCourseTips() {
    renderCourseTips();
    S.switchPage("course-tips");
  }

  /* ---------------- 事件绑定（进入页面时由 open 触发一次） ---------------- */
  function bindPage() {
    bindPageSize();
  }

  /* ---------------- 挂载导出 ---------------- */
  S.openWordcardManage = openWordcardManage;
  S.renderWordcardManage = renderWordcardManage;
  S.openSizeSettings = openSizeSettings;
  S.renderPageSize = renderPageSize;
  S.resetSizeDefaults = resetSizeDefaults;
  S.openCourseList = openCourseList;
  S.renderCourseList = renderCourseList;
  S.openCourseDetail = openCourseDetail;
  S.renderCourseDetail = renderCourseDetail;
  S.toggleChapter = toggleChapter;
  S.backCourseDetail = backCourseDetail;
  S.openCourseSchedule = openCourseSchedule;
  S.renderCourseSchedule = renderCourseSchedule;
  S.openCourseTeachers = openCourseTeachers;
  S.renderCourseTeachers = renderCourseTeachers;
  S.openCourseCollection = openCourseCollection;
  S.renderCourseCollection = renderCourseCollection;
  S.openCourseTips = openCourseTips;
  S.renderCourseTips = renderCourseTips;

  /* ---------------- 启动：绑定控件 ---------------- */
  function onReady() {
    bindPage();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady);
  } else {
    onReady();
  }
})();

