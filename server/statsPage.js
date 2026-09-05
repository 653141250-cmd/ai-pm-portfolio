// 访客统计后台页（受 ADMIN_TOKEN 保护）。
// 返回自包含 HTML：内联 JS 拉取 /api/stats 与 /api/daily 并渲染。
// 功能：累计/今日独立访客卡片、日期范围筛选、最近两周每日柱状图（翻页+点击筛选）、
//       5 列脱敏访客表格（IP/地区/访问次数/驻留时长/最近访问时间）、当天实时刷新。
// 注意：内联脚本刻意不用模板字符串（避免与 Node 端 STATS_HTML 外层反引号冲突），统一用 + 拼接。
export const STATS_HTML = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>作品集访客分析</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, Segoe UI, Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif;
    background: #0a0a0f; color: #e6e6ef; padding: 28px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .sub { color: #8a8a9a; font-size: 13px; margin-bottom: 18px; }
  .cards { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 18px; }
  .card { background: #15151f; border: 1px solid #26263a; border-radius: 12px; padding: 14px 18px; min-width: 130px; }
  .card b { display: block; font-size: 24px; color: #84cc16; }
  .card span { font-size: 12px; color: #8a8a9a; }
  .panel { background: #11111a; border: 1px solid #20202e; border-radius: 12px; padding: 16px; margin-bottom: 18px; }
  .panel h2 { font-size: 14px; margin: 0 0 12px; color: #c8c8d8; font-weight: 600; }
  .toolbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .toolbar input[type=date] { background: #0e0e16; color: #e6e6ef; border: 1px solid #2a2a3e; border-radius: 8px; padding: 6px 8px; font-size: 13px; }
  .toolbar button { background: #1d2a12; color: #a3e635; border: 1px solid #2f3d18; border-radius: 8px; padding: 6px 12px; font-size: 13px; cursor: pointer; }
  .toolbar button.ghost { background: #15151f; color: #b8b8c8; border-color: #2a2a3e; }
  .toolbar button:active { transform: translateY(1px); }
  .hint { color: #8a8a9a; font-size: 12px; margin-top: 8px; }
  /* 柱状图 */
  .chart-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .chart-nav button { background: #15151f; color: #b8b8c8; border: 1px solid #2a2a3e; border-radius: 8px; padding: 4px 10px; cursor: pointer; font-size: 13px; }
  .chart-nav button:disabled { opacity: .35; cursor: not-allowed; }
  .chart { display: flex; align-items: flex-end; gap: 6px; height: 180px; padding-top: 10px; }
  .bar-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; cursor: pointer; }
  .bar { width: 70%; background: linear-gradient(180deg, #84cc16, #4d7c0f); border-radius: 5px 5px 0 0; min-height: 2px; transition: height .25s; }
  .bar-wrap:hover .bar { background: linear-gradient(180deg, #a3e635, #65a30d); }
  .bar-wrap.sel .bar { background: linear-gradient(180deg, #6ea8fe, #1d4ed8); }
  .bar-lbl { font-size: 10px; color: #8a8a9a; margin-top: 4px; }
  .bar-val { font-size: 10px; color: #c8c8d8; margin-bottom: 2px; }
  /* 表格 */
  table { width: 100%; border-collapse: collapse; font-size: 13px; border-radius: 12px; overflow: hidden; }
  th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #20202e; }
  th { background: #16161f; color: #b8b8c8; font-weight: 600; white-space: nowrap; }
  tr:hover td { background: #15151f; }
  .tag { display: inline-block; padding: 1px 8px; border-radius: 999px; background: #1d2a12; color: #a3e635; font-size: 11px; }
  .ip { font-family: ui-monospace, Menlo, Consolas, monospace; color: #fca5a5; }
  details { margin-top: 6px; }
  summary { cursor: pointer; color: #6ea8fe; font-size: 12px; }
  .chat { background: #0e0e16; border-left: 2px solid #2a2a3e; padding: 8px 12px; margin: 6px 0; border-radius: 6px; }
  .chat .q { color: #fca5a5; }
  .chat .a { color: #c8c8d8; white-space: pre-wrap; }
  .pg { display: flex; justify-content: space-between; gap: 12px; padding: 4px 0; font-size: 12px; border-bottom: 1px dashed #1c1c2a; }
  .pg:last-child { border-bottom: none; }
  .pg .pp { color: #e6e6ef; font-family: ui-monospace, Menlo, Consolas, monospace; }
  .pg .pd { color: #a3e635; white-space: nowrap; }
  .empty { color: #8a8a9a; padding: 30px; text-align: center; }
  .live { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #84cc16; margin-right: 5px; box-shadow: 0 0 6px #84cc16; }
  a { color: #6ea8fe; }
</style>
</head>
<body>
  <h1>📊 作品集访客分析</h1>
  <div class="sub" id="gen"></div>

  <div class="cards" id="cards"></div>

  <div class="panel">
    <h2>日期筛选</h2>
    <div class="toolbar">
      <input type="date" id="from" />
      <span style="color:#8a8a9a">至</span>
      <input type="date" id="to" />
      <button id="btnFilter">筛选</button>
      <button class="ghost" id="btnToday">今天</button>
      <button class="ghost" id="btnAll">全部</button>
      <button class="ghost" id="btnClear">清除筛选</button>
    </div>
    <div class="hint" id="scopeHint"></div>
  </div>

  <div class="panel">
    <div class="chart-head">
      <h2 style="margin:0">每日到访趋势（独立访客数）</h2>
      <div class="chart-nav">
        <button id="prev">◀ 更早</button>
        <button id="next">更晚 ▶</button>
      </div>
    </div>
    <div class="chart" id="chart"></div>
    <div class="hint">点击某一天柱子，下方列表筛选该天访客；左右箭头翻看更早数据；当天数据每 10 秒自动刷新。</div>
  </div>

  <div class="panel">
    <h2>访客列表 <span id="liveDot" class="live" style="display:none"></span></h2>
    <div id="table"></div>
  </div>

<script>
  var token = new URLSearchParams(location.search).get('token') || '';
  var DAY = 86400000;
  var state = { from: null, to: null, chartEnd: null, selDay: null };
  var pollTimer = null;

  function pad(n) { return String(n).padStart(2, '0'); }
  function ymd(ts) { var d = new Date(ts); return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()); }
  function todayStr() { return ymd(Date.now()); }
  function shiftDays(s, delta) {
    var p = s.split('-'); var t = new Date(Number(p[0]), Number(p[1])-1, Number(p[2])).getTime() + delta * DAY;
    return ymd(t);
  }
  function fmtDur(s) {
    s = Math.max(0, Math.round(s || 0));
    if (s < 60) return s + ' 秒';
    var m = Math.floor(s/60), r = s % 60;
    if (m < 60) return m + ' 分' + (r ? ' ' + r + ' 秒' : '');
    var h = Math.floor(m/60); return h + ' 时 ' + (m%60) + ' 分';
  }
  function fmtTs(t) {
    if (!t) return '-';
    var d = new Date(t);
    return d.toLocaleString('zh-CN', { hour12: false });
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>]/g, function (c) {
      return c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;';
    });
  }
  function maskIp(s) {
    s = String(s || '');
    var v4 = s.match(/^(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})$/);
    if (v4) return v4[1] + '.' + v4[2] + '.' + v4[3] + '.*';
    return s || '未知';
  }
  function cleanPath(s) {
    s = String(s || '/');
    if (s.indexOf('/#') === 0) s = s.slice(1); // /#/about -> #/about
    return s || '/';
  }

  function api(path) {
    return fetch(path + (path.indexOf('?') >= 0 ? '&' : '?') + 'token=' + encodeURIComponent(token))
      .then(function (r) { return r.json(); });
  }

  function loadStats() {
    var q = '';
    if (state.from) q += 'from=' + state.from;
    if (state.to) q += (q ? '&' : '') + 'to=' + state.to;
    api('/api/stats' + (q ? '?' + q : '')).then(function (data) {
      if (data.error) { document.getElementById('table').innerHTML = '<div class="empty">未授权：请使用正确的 token 参数访问。</div>'; return; }
      var t = data.totals || {};
      document.getElementById('gen').textContent = '数据生成于 ' + fmtTs(data.generatedAt) + (data.range ? '　|　当前范围：' + data.range.from + ' ~ ' + data.range.to : '　|　全部时间');
      document.getElementById('cards').innerHTML =
        '<div class="card"><b>' + (t.totalVisitors || 0) + '</b><span>累计访问人数</span></div>' +
        '<div class="card"><b>' + (t.todayVisitors || 0) + '</b><span>今日到访人数</span></div>' +
        '<div class="card"><b>' + (t.totalChats || 0) + '</b><span>累计提问数</span></div>' +
        '<div class="card"><b>' + ((data.visitors || []).length) + '</b><span>当前显示访客数</span></div>';
      renderTable(data.visitors || []);
      updateScopeHint();
    }).catch(function (e) {
      document.getElementById('table').innerHTML = '<div class="empty">加载失败：' + esc(e.message) + '</div>';
    });
  }

  function renderTable(vs) {
    // 保存当前展开状态，避免轮询/筛选后自动收起
    state.openRows = state.openRows || {};
    var prevOpen = state.openRows;
    state.openRows = {};
    var curDetails = document.querySelectorAll('#table details[open]');
    for (var ci = 0; ci < curDetails.length; ci++) {
      var d = curDetails[ci];
      var key = d.getAttribute('data-kind') + ':' + d.getAttribute('data-idx');
      if (key && key.indexOf('null') < 0 && key.indexOf('undefined') < 0) prevOpen[key] = true;
    }

    if (!vs.length) { document.getElementById('table').innerHTML = '<div class="empty">该范围内暂无访客数据～</div>'; return; }
    var rows = '';
    for (var i = 0; i < vs.length; i++) {
      var v = vs[i];
      var ip = v.ipMasked || maskIp(v.ip);
      var isOpenPages = prevOpen['pages:' + i] ? ' open' : '';
      var isOpenChats = prevOpen['chats:' + i] ? ' open' : '';
      // AI 答疑记录
      var chats = '';
      for (var j = 0; j < (v.chats || []).length; j++) {
        var c = v.chats[j];
        chats += '<div class="chat"><div class="q">Q：' + esc(c.question) + '</div><div class="a">A：' + esc(c.answer) + '</div></div>';
      }
      // 浏览页面（各页驻留）
      var pages = '';
      for (var k = 0; k < (v.pages || []).length; k++) {
        var p = v.pages[k];
        pages += '<div class="pg"><span class="pp">' + esc(cleanPath(p.path)) + '</span>' +
          '<span class="pd">' + p.views + ' 次 · 驻留 ' + fmtDur(p.durSec) + '</span></div>';
      }
      var extra = '';
      if (pages) {
        extra += '<tr><td colspan="5" style="background:#0c0c14;padding:0 12px 4px">' +
          '<details data-idx="' + i + '" data-kind="pages"' + isOpenPages + '><summary>查看 ' + v.pages.length + ' 个浏览页面（各页驻留时长）</summary>' + pages + '</details></td></tr>';
      }
      if (chats) {
        extra += '<tr><td colspan="5" style="background:#0c0c14;padding:0 12px 12px">' +
          '<details data-idx="' + i + '" data-kind="chats"' + isOpenChats + '><summary>查看 ' + v.chats.length + ' 条 AI 答疑记录</summary>' + chats + '</details></td></tr>';
      }
      rows += '<tr><td class="ip">' + esc(ip) + '</td><td><span class="tag">' + esc(v.region || '未知') + '</span></td><td>' +
        (v.visits || 0) + '</td><td>' + fmtDur(v.durationSec) + '</td><td>' + fmtTs(v.lastSeen) + '</td></tr>' + extra;
    }
    document.getElementById('table').innerHTML =
      '<table><thead><tr><th>访客IP（脱敏）</th><th>地区</th><th>访问次数</th><th>驻留时长</th><th>最近访问时间</th></tr></thead><tbody>' +
      rows + '</tbody></table>';
  }

  function loadDaily() {
    var end = state.chartEnd || todayStr();
    api('/api/daily?days=14&end=' + end).then(function (data) {
      renderChart(data.series || []);
    }).catch(function () {});
  }

  function renderChart(series) {
    var max = 1;
    for (var i = 0; i < series.length; i++) max = Math.max(max, series[i].visitors);
    var html = '';
    for (var k = 0; k < series.length; k++) {
      var d = series[k];
      var h = Math.round((d.visitors / max) * 150);
      var mmdd = d.date.slice(5);
      var sel = (state.selDay === d.date) ? ' sel' : '';
      html += '<div class="bar-wrap' + sel + '" data-date="' + d.date + '">' +
        '<div class="bar-val">' + d.visitors + '</div>' +
        '<div class="bar" style="height:' + h + 'px"></div>' +
        '<div class="bar-lbl">' + mmdd + '</div></div>';
    }
    var chart = document.getElementById('chart');
    chart.innerHTML = html;
    var wraps = chart.querySelectorAll('.bar-wrap');
    for (var w = 0; w < wraps.length; w++) {
      wraps[w].addEventListener('click', function () {
        var day = this.getAttribute('data-date');
        state.selDay = day; state.from = day; state.to = day;
        document.getElementById('from').value = day;
        document.getElementById('to').value = day;
        loadStats(); loadDaily();
      });
    }
    // 翻页按钮可用性
    var t = todayStr();
    document.getElementById('next').disabled = (state.chartEnd || t) >= t;
  }

  function updateScopeHint() {
    var hint = '';
    if (state.from && state.to) hint = '已筛选：' + state.from + ' ~ ' + state.to + (state.from === state.to ? '（单日）' : '');
    else if (state.from) hint = '已筛选：自 ' + state.from + ' 起';
    else hint = '显示全部时间（点击柱状图某天可只看该天）';
    document.getElementById('scopeHint').textContent = hint;
    // 实时指示：范围覆盖今天则实时刷新
    var live = !state.from || (state.from <= todayStr() && state.to >= todayStr());
    document.getElementById('liveDot').style.display = live ? 'inline-block' : 'none';
  }

  function startPoll() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(function () {
      var t = todayStr();
      var statsLive = !state.from || (state.from <= t && state.to >= t);
      var chartLive = (state.chartEnd || t) >= t;
      if (statsLive) loadStats();
      if (chartLive) loadDaily();
    }, 10000);
  }

  // 事件绑定
  document.getElementById('btnFilter').addEventListener('click', function () {
    state.from = document.getElementById('from').value || null;
    state.to = document.getElementById('to').value || state.from || null;
    state.selDay = null;
    if (state.from && state.to && state.to < state.from) { var x = state.from; state.from = state.to; state.to = x; }
    loadStats(); loadDaily();
  });
  document.getElementById('btnToday').addEventListener('click', function () {
    var t = todayStr();
    state.from = t; state.to = t; state.selDay = t;
    document.getElementById('from').value = t; document.getElementById('to').value = t;
    loadStats(); loadDaily();
  });
  document.getElementById('btnAll').addEventListener('click', function () {
    state.from = null; state.to = null; state.selDay = null;
    document.getElementById('from').value = ''; document.getElementById('to').value = '';
    loadStats(); loadDaily();
  });
  document.getElementById('btnClear').addEventListener('click', function () {
    state.from = null; state.to = null; state.selDay = null;
    document.getElementById('from').value = ''; document.getElementById('to').value = '';
    loadStats(); loadDaily();
  });
  document.getElementById('prev').addEventListener('click', function () {
    state.chartEnd = shiftDays(state.chartEnd || todayStr(), -14);
    state.selDay = null;
    loadDaily();
  });
  document.getElementById('next').addEventListener('click', function () {
    var t = todayStr();
    var n = shiftDays(state.chartEnd || t, 14);
    if (n > t) n = t;
    state.chartEnd = n; state.selDay = null;
    loadDaily();
  });

  // 初始化
  state.chartEnd = todayStr();
  loadStats();
  loadDaily();
  startPoll();
</script>
</body>
</html>`
