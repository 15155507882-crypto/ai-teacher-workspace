/**
 * 小程序 H5 独立运行服务器
 * 直接服务 Taro 编译的 H5 JS/CSS，在浏览器中运行真实的小程序 UI
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8099;
const DIST = path.join(__dirname, '..', 'dist-h5');
const API_TARGET = 'http://localhost:3000';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
};

// 读取 dist 中的 JS 和 CSS 文件列表
function getAssets() {
  const jsDir = path.join(DIST, 'js');
  const cssDir = path.join(DIST, 'css');
  let jsFiles = [], cssFiles = [];
  try { jsFiles = fs.readdirSync(jsDir).filter(f => f.endsWith('.js')); } catch {}
  try { cssFiles = fs.readdirSync(cssDir).filter(f => f.endsWith('.css')); } catch {}
  // app.js 最后加载
  const appJs = jsFiles.filter(f => f.startsWith('app.'));
  const chunks = jsFiles.filter(f => !f.startsWith('app.') && !f.startsWith('runtime') && !f.startsWith('taro') && !f.startsWith('vendors'));
  const runtime = jsFiles.filter(f => f.startsWith('runtime') || f.startsWith('taro') || f.startsWith('vendors') || f.startsWith('common'));
  // 排序：runtime → vendors → common → chunks → app
  const orderedJs = [
    ...jsFiles.filter(f => f.startsWith('runtime')),
    ...jsFiles.filter(f => f.startsWith('taro')),
    ...jsFiles.filter(f => f.startsWith('vendors')),
    ...jsFiles.filter(f => f.startsWith('common')),
    ...chunks,
    ...appJs,
  ];
  return { jsFiles: orderedJs, cssFiles };
}

function buildHTML() {
  const { jsFiles, cssFiles } = getAssets();

  const cssLinks = cssFiles.map(f => `<link rel="stylesheet" href="/css/${f}">`).join('\n    ');
  const jsScripts = jsFiles.map(f => `<script src="/js/${f}"></script>`).join('\n    ');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"/>
  <title>AI 教学辅助系统</title>
	  <style>
	    * { margin:0; padding:0; box-sizing:border-box; }
	    html, body { width:100%; height:100%; overflow:hidden; font-family: -apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif; background:#F3F7FF; }
	    #app { width:100%; height:100%; overflow-y:auto; -webkit-overflow-scrolling:touch; }
	    .taro-loading { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; background:#F3F7FF; }
	    .taro-loading-spinner { width:40px; height:40px; border:3px solid #e2e8f0; border-top-color:#2563eb; border-radius:50%; animation:spin .8s linear infinite; }
	    .taro-loading-text { margin-top:16px; color:#94a3b8; font-size:14px; }
	    @keyframes spin { to{transform:rotate(360deg)} }
  </style>
  ${cssLinks}
</head>
<body>
  <div id="app">
    <div class="taro-loading" id="taro-loader">
      <div class="taro-loading-spinner"></div>
      <div class="taro-loading-text">正在加载小程序...</div>
    </div>
  </div>
  ${jsScripts}
  <script>
    // 隐藏加载动画
    setTimeout(function() {
      var loader = document.getElementById('taro-loader');
      if (loader) loader.style.display = 'none';
    }, 5000);
  </script>
</body>
</html>`;
}

function proxyApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const options = { method: req.method, headers: { ...req.headers, host: 'localhost:3000' } };
  delete options.headers['if-none-match'];
  delete options.headers['if-modified-since'];
  const proxyReq = http.request(API_TARGET + url.pathname + url.search, options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, {
      'content-type': proxyRes.headers['content-type'] || 'application/json',
      'access-control-allow-origin': '*',
    });
    proxyRes.pipe(res);
  });
  proxyReq.on('error', () => { res.writeHead(502); res.end('{}'); });
  if (req.method === 'POST' || req.method === 'PUT') {
    let body = ''; req.on('data', c => body += c); req.on('end', () => proxyReq.end(body));
  } else { proxyReq.end(); }
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // API 代理
  if (url.pathname.startsWith('/api/')) return proxyApi(req, res);

  // 静态文件
  const filePath = path.join(DIST, url.pathname);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    return res.end(fs.readFileSync(filePath));
  }

  // SPA 回退
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(buildHTML());
});

server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════╗
║  📱 小程序 H5 → http://localhost:${PORT}  ║
╚══════════════════════════════════╝
  `);
});
