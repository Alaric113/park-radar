import type { Handler } from '@netlify/functions';
import makeFetchCookie from 'fetch-cookie';

const fetchWithCookie = makeFetchCookie(fetch);

const ORIGIN = 'https://itaipeiparking.pma.gov.taipei';

// 更新的標記候選端點
const TOKEN_CANDIDATES: string[] = [
  '/antiforgery/token',
  '/antiforgery/get',
  '/api/antiforgery/token',
  '/Home/GetAntiForgeryToken',
  '/api/token/antiforgery',
  '/token/csrf',
  '/Home/AntiForgeryToken',
  '/w1/InitToken',
];

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ParkingRadar/1.0';
const ACCEPT_HTML = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';
const ACCEPT_ANY = '*/*';
const ACCEPT_LANG = 'zh-TW,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6';

// 修復的隱藏標記提取函數
function extractHiddenToken(html: string): string | null {
  const patterns = [
    /name=["']__RequestVerificationToken["']\s+value=["']([^"']+)["']/i,
    /<input[^>]*name=["']__RequestVerificationToken["'][^>]*value=["']([^"']+)["']/i,
    /"__RequestVerificationToken":\s*"([^"]+)"/i,
    /window\.antiForgeryToken\s*=\s*["']([^"']+)["']/i,
    /data-antiforgery-token=["']([^"']+)["']/i,
    /'__RequestVerificationToken':\s*'([^']+)'/i,
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      console.log('找到HTML標記:', match[1].substring(0, 20) + '...');
      return match[1];
    }
  }
  return null;
}

// 從 Cookie 讀取標記
async function readXsrfFromJar(url: string): Promise<string | null> {
  try {
    // @ts-expect-error fetch-cookie 暴露 cookieJar
    const jar = fetchWithCookie.cookieJar;
    if (!jar || !jar.getCookies) return null;

    const cookies = await jar.getCookies(url);
    const tokenCookies = [
      'XSRF-TOKEN',
      'RequestVerificationToken',
      '__RequestVerificationToken',
      'CSRF-TOKEN',
      'X-CSRF-TOKEN',
    ];
    
    for (const cookieName of tokenCookies) {
      const hit = cookies.find((c: any) => 
        c.key === cookieName || 
        c.key.toLowerCase().includes(cookieName.toLowerCase())
      );
      if (hit?.value) {
        console.log('從Cookie找到標記:', cookieName, hit.value.substring(0, 20) + '...');
        return hit.value;
      }
    }
    return null;
  } catch (e) {
    console.log('讀取Cookie失敗:', e);
    return null;
  }
}

async function getCookieHeader(url: string): Promise<string> {
  try {
    // @ts-expect-error
    const jar = fetchWithCookie.cookieJar;
    if (!jar || !jar.getCookieString) return '';
    return (await jar.getCookieString(url)) || '';
  } catch {
    return '';
  }
}

// 增強的標記獲取功能
async function tryIssueTokenViaCandidates(): Promise<{
  ok: boolean; 
  path?: string; 
  status?: number; 
  token?: string;
  debug?: any;
}> {
  const debug: any = {};
  
  for (const path of TOKEN_CANDIDATES) {
    const url = ORIGIN + path;
    console.log('嘗試標記端點:', path);
    
    try {
      const r = await fetchWithCookie(url, {
        method: 'GET',
        headers: {
          accept: ACCEPT_ANY,
          'accept-language': ACCEPT_LANG,
          'user-agent': UA,
          referer: ORIGIN + '/',
          'sec-fetch-site': 'same-origin',
          'sec-fetch-mode': 'cors',
          'sec-fetch-dest': 'empty',
          'x-requested-with': 'XMLHttpRequest', // 添加 AJAX 標頭
        },
      });

      debug[path] = { 
        status: r.status, 
        contentType: r.headers.get('content-type'),
        size: r.headers.get('content-length')
      };

      // 1. 先嘗試從Cookie讀取
      const cookieToken = await readXsrfFromJar(ORIGIN);
      if (cookieToken) {
        return { ok: true, path, status: r.status, token: cookieToken, debug };
      }

      // 2. 從回應內容讀取
      const text = await r.text();
      if (text) {
        const bodyToken = extractHiddenToken(text);
        if (bodyToken) {
          return { ok: true, path, status: r.status, token: bodyToken, debug };
        }
        
        // 3. 嘗試解析JSON回應
        try {
          const json = JSON.parse(text);
          if (json.token || json.antiforgeryToken || json.__RequestVerificationToken) {
            const token = json.token || json.antiforgeryToken || json.__RequestVerificationToken;
            return { ok: true, path, status: r.status, token, debug };
          }
        } catch {
          // 不是JSON，繼續
        }
      }

    } catch (e: any) {
      debug[path] = { error: e.message };
    }
  }
  
  return { ok: false, debug };
}

// 額外的標記獲取方法
async function getTokenFromMainPage(html: string, cookieHeader: string): Promise<string | null> {
  // 1. 從HTML提取
  let token = extractHiddenToken(html);
  if (token) return token;
  
  // 2. 嘗試模擬表單提交來觸發標記生成
  try {
    const formRes = await fetchWithCookie(ORIGIN + '/Home/Index', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        accept: ACCEPT_HTML,
        'user-agent': UA,
        referer: ORIGIN + '/',
        cookie: cookieHeader,
      },
      body: 'dummy=1',
    });
    
    if (formRes.ok) {
      const formHtml = await formRes.text();
      token = extractHiddenToken(formHtml);
      if (token) return token;
    }
  } catch (e) {
    console.log('表單方法失敗:', e);
  }
  
  return null;
}

export const handler: Handler = async (event) => {
  try {
    // CORS 處理
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
        body: '',
      };
    }

    if (event.httpMethod !== 'GET') {
      return { 
        statusCode: 405, 
        headers: { 'Access-Control-Allow-Origin': '*' }, 
        body: 'Method Not Allowed' 
      };
    }

    // 解析查詢參數
    const qs = new URLSearchParams(event.rawQuery || '');
    const lon = (qs.get('longitude') ?? qs.get('lon') ?? '').trim();
    const lat = (qs.get('latitude') ?? qs.get('lat') ?? '').trim();
    const type = (qs.get('vehicle_type') ?? qs.get('type') ?? 'car').trim();
    const radius = (qs.get('radius') ?? '5').trim();

    if (!lon || !lat) {
      return {
        statusCode: 400,
        headers: { 
          'Content-Type': 'application/json; charset=utf-8', 
          'Access-Control-Allow-Origin': '*' 
        },
        body: JSON.stringify({ ok: false, error: 'missing lon/lat' }),
      };
    }

    console.log('開始處理停車場查詢:', { lon, lat, type, radius });

    // A) 第一次進站：獲取首頁和初始Cookie
    console.log('第一步：獲取首頁');
    const bootRes = await fetchWithCookie(ORIGIN, {
      method: 'GET',
      headers: {
        accept: ACCEPT_HTML,
        'accept-language': ACCEPT_LANG,
        'user-agent': UA,
        referer: 'https://www.google.com/',
        'sec-fetch-site': 'cross-site',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-dest': 'document',
        'upgrade-insecure-requests': '1',
      },
    });

    const bootHtml = await bootRes.text();
    console.log('首頁狀態:', bootRes.status, '內容長度:', bootHtml.length);

    // B) 第二次同源請求：穩定Cookie
    console.log('第二步：穩定Cookie');
    await fetchWithCookie(ORIGIN + '/', {
      method: 'GET',
      headers: {
        accept: ACCEPT_HTML,
        'accept-language': ACCEPT_LANG,
        'user-agent': UA,
        referer: ORIGIN + '/',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-dest': 'document',
        'upgrade-insecure-requests': '1',
      },
    });

    const cookieHeader = await getCookieHeader(ORIGIN);
    console.log('Cookie狀態:', cookieHeader ? '有Cookie' : '無Cookie');

    // C) 多重標記獲取策略
    console.log('第三步：獲取防偽標記');
    
    // 策略1：從首頁HTML提取
    let token = await getTokenFromMainPage(bootHtml, cookieHeader);
    let tokenSource = 'html';
    
    // 策略2：嘗試候選端點
    if (!token) {
      console.log('HTML方法失敗，嘗試候選端點');
      const tokenResult = await tryIssueTokenViaCandidates();
      if (tokenResult.ok && tokenResult.token) {
        token = tokenResult.token;
        tokenSource = `endpoint:${tokenResult.path}`;
      }
      console.log('候選端點結果:', tokenResult);
    }

    // 策略3：從Cookie直接讀取（某些情況下可能有效）
    if (!token) {
      console.log('端點方法失敗，嘗試直接從Cookie讀取');
      token = await readXsrfFromJar(ORIGIN);
      if (token) tokenSource = 'cookie';
    }

    const hasCookie = !!cookieHeader;
    const usedToken = !!token;
    
    console.log('標記狀態:', { 
      hasCookie, 
      usedToken, 
      tokenSource: usedToken ? tokenSource : 'none',
      tokenPreview: token ? token.substring(0, 20) + '...' : 'null'
    });

    // D) 呼叫停車場API
    console.log('第四步：呼叫停車場API');
    const parksUrl = `${ORIGIN}/w1/GetParks/${encodeURIComponent(lon)}/${encodeURIComponent(lat)}/${encodeURIComponent(type)}/${encodeURIComponent(radius)}`;
    
    const headers: Record<string, string> = {
      accept: ACCEPT_ANY,
      'content-type': 'application/json',
      'user-agent': UA,
      referer: ORIGIN + '/',
      'accept-language': ACCEPT_LANG,
      'sec-fetch-site': 'same-origin',
      'sec-fetch-mode': 'cors',
      'sec-fetch-dest': 'empty',
    };

    if (hasCookie) {
      headers.cookie = cookieHeader;
    }

    if (usedToken) {
      // 使用多個可能的標頭名稱
      headers['X-CSRF-TOKEN'] = token!;
      headers['RequestVerificationToken'] = token!;
      headers['X-XSRF-TOKEN'] = token!;
      headers['__RequestVerificationToken'] = token!;
    }

    console.log('發送請求到:', parksUrl);
    console.log('使用標頭:', Object.keys(headers));

    const res = await fetchWithCookie(parksUrl, { 
      method: 'GET', 
      headers 
    });

    const text = await res.text();
    console.log('API回應:', res.status, '內容長度:', text.length);

    if (!res.ok) {
      console.log('API失敗，狀態:', res.status, '回應:', text.substring(0, 500));
      return {
        statusCode: res.status,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store',
        },
        body: JSON.stringify({
          ok: false,
          status: res.status,
          url: parksUrl,
          hasCookie,
          usedToken,
          tokenSource: usedToken ? tokenSource : undefined,
          diagnostics: {
            bootStatus: bootRes.status,
            bootContentType: bootRes.headers.get('content-type'),
            cookiePreview: (cookieHeader || '').slice(0, 200),
            htmlPreview: bootHtml.slice(0, 400),
            responseHeaders: Object.fromEntries(res.headers.entries()),
          },
          text: text.slice(0, 1000),
        }),
      };
    }

    // 解析成功回應
    let data: any;
    try {
      data = JSON.parse(text);
      console.log('成功解析JSON，項目數:', Array.isArray(data) ? data.length : 'unknown');
    } catch {
      data = text;
      console.log('回應不是JSON格式');
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify({ 
        ok: true, 
        data,
        meta: {
          tokenSource: usedToken ? tokenSource : undefined,
          hasCookie,
          usedToken,
        }
      }),
    };

  } catch (e: any) {
    console.error('處理失敗:', e);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ 
        ok: false, 
        error: 'proxy_failed', 
        message: e?.message || String(e) 
      }),
    };
  }
};
