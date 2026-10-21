import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {attachMultiplayer} from './multiplayer-server.mjs';
// The game files: ROOT if set; dist/ when run from the project (npm run dev);
// otherwise this file's own folder - the published site, where the build
// copies this server in as server.mjs (for hosts such as Render).
const root=process.env.ROOT?path.resolve(process.env.ROOT)
  :fs.existsSync(path.resolve('dist/index.html'))?path.resolve('dist')
  :path.dirname(fileURLToPath(import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8','.md':'text/markdown; charset=utf-8','.ico':'image/x-icon','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.glb':'model/gltf-binary','.woff2':'font/woff2'};

// ADS-B providers reject browser requests (no CORS headers), so the local
// server relays them. adsb.lol allows roughly one large query every ~10 s,
// so calls are queued 11 s apart and identical requests are shared. A 429
// rests that provider briefly and the request is retried once after the
// rest; 403 means blocked (an hour). If all fail, the newest nearby answer
// (< 3 min old) is served.
// adsb.fi first (fast, about one request a second allowed), then adsb.lol
// (same data format), then airplanes.live (blocks unregistered projects
// with 403). The last answer from each is kept for /api/traffic/status.
const PROVIDERS={
  'opendata.adsb.fi':(lat,lon,r)=>`https://opendata.adsb.fi/api/v2/lat/${lat}/lon/${lon}/dist/${r}`,
  'api.adsb.lol':(lat,lon,r)=>`https://api.adsb.lol/v2/point/${lat}/${lon}/${r}`,
  'api.airplanes.live':(lat,lon,r)=>`https://api.airplanes.live/v2/point/${lat}/${lon}/${r}`,
};
const TRAFFIC_HOSTS=Object.keys(PROVIDERS),lastAnswer={};
const trafficCache=new Map(),inflight=new Map(),resting=new Map();
// Each provider has its own queue and spacing (adsb.fi allows about one
// request a second; the others about one every 10 s).
const SPACING={'opendata.adsb.fi':1500},queues=new Map(),lastCalls=new Map();
const spaced=(host,task)=>{
  const next=(queues.get(host)||Promise.resolve()).then(async()=>{
    const wait=(lastCalls.get(host)||0)+(SPACING[host]??11000)-Date.now();
    if(wait>0)await new Promise(r=>setTimeout(r,wait));
    lastCalls.set(host,Date.now());
    return task();
  }).catch(()=>null);
  queues.set(host,next);
  return next;
};
async function fetchTraffic(lat,lon,radius,retry=true){
  const body=await tryHosts(lat,lon,radius);
  if(body||!retry)return body;
  // Every provider resting after a 429: wait it out once, then try again.
  const until=Math.min(...TRAFFIC_HOSTS.map(h=>resting.get(h)||0))-Date.now();
  if(until>0&&until<20000){await new Promise(r=>setTimeout(r,until+200));return fetchTraffic(lat,lon,radius,false);}
  return null;
}
async function tryHosts(lat,lon,radius){
  for(const host of TRAFFIC_HOSTS){
    if((resting.get(host)||0)>Date.now())continue;
    const body=await spaced(host,async()=>{
      try{
        const r=await fetch(PROVIDERS[host](lat.toFixed(3),lon.toFixed(3),radius),{signal:AbortSignal.timeout(6000),headers:{'User-Agent':'OnlineFlightSim/1.0 (hobby flight simulator; +https://github.com/RandomFox8956/online-flight-sim)','Accept':'application/json'}});
        lastAnswer[host]={status:r.status,at:new Date().toISOString()};
        if(r.status===403||r.status===429){resting.set(host,Date.now()+(r.status===403?3600000:12000));return null;}
        if(!r.ok)return null;
        const text=await r.text();JSON.parse(text);return text;
      }catch(e){lastAnswer[host]={error:e.cause?.code||e.name||String(e),at:new Date().toISOString()};return null;}
    });
    if(body)return body;
  }
  return null;
}
async function traffic(url,res){
  const lat=Number(url.searchParams.get('lat')),lon=Number(url.searchParams.get('lon'));
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180){res.writeHead(400).end('lat/lon required');return;}
  // Providers cap the query radius at 250 NM.
  const radius=Math.round(Math.min(250,Math.max(5,Number(url.searchParams.get('radius'))||100)));
  const key=`${lat.toFixed(1)},${lon.toFixed(1)},${radius}`,hit=trafficCache.get(key);
  if(hit&&Date.now()-hit.time<10000){send(res,hit.body);return;}
  if(!inflight.has(key))inflight.set(key,fetchTraffic(lat,lon,radius).finally(()=>inflight.delete(key)));
  const body=await inflight.get(key);
  if(body){
    trafficCache.set(key,{time:Date.now(),body});
    if(trafficCache.size>200)trafficCache.delete(trafficCache.keys().next().value);
    send(res,body);return;
  }
  // Fall back to the freshest cached answer centred within 150 NM.
  let stale=null;
  for(const [k,v] of trafficCache){
    const [la,lo]=k.split(',').map(Number),nm=Math.hypot(la-lat,(lo-lon)*Math.cos(lat*Math.PI/180))*60;
    if(nm<150&&Date.now()-v.time<180000&&(!stale||v.time>stale.time))stale=v;
  }
  if(stale){send(res,stale.body);return;}
  res.writeHead(502,{'Content-Type':'application/json'}).end(JSON.stringify({error:'traffic providers unavailable',providers:lastAnswer}));
}
// Every aircraft in the world, for a chart zoomed far out: the OpenSky
// Network's public feed (https://opensky-network.org). Anonymous use allows
// about 100 worldwide requests a day, so one copy is fetched at most every
// 15 minutes and shared by every player; the game moves each aircraft along
// its track in between. Converted to the same shape as the regional data.
let world=null,worldFetch=null,worldRetry=0;
async function fetchWorld(){
  // After a failure (such as the daily allowance running out) wait 15
  // minutes before asking again, and keep serving the last good copy.
  worldRetry=Date.now()+15*60000;
  try{
    const r=await fetch('https://opensky-network.org/api/states/all',{signal:AbortSignal.timeout(30000),headers:{'User-Agent':'OnlineFlightSim/1.0 (hobby flight simulator; +https://github.com/RandomFox8956/online-flight-sim)'}});
    lastAnswer['opensky-network.org']={status:r.status,at:new Date().toISOString(),remaining:r.headers.get('x-rate-limit-remaining')};
    if(!r.ok)return;
    const d=await r.json(),ac=[];
    for(const v of d.states||[]){
      const [hex,callsign,country,timePos,,lon,lat,baroAlt,onGround,velocity,track,vrate,,geoAlt,squawk]=v;
      if(onGround||lat==null||lon==null)continue;
      const alt=baroAlt??geoAlt;
      if(alt==null)continue;
      ac.push({hex,flight:(callsign||'').trim(),lat,lon,alt_baro:Math.round(alt/0.3048),gs:Math.round((velocity||0)/0.514444),track:Math.round(track||0),baro_rate:Math.round((vrate||0)/0.3048*60),squawk,country,position_time:timePos});
    }
    const body=JSON.stringify({world:true,time:d.time,ac});
    world={time:Date.now(),body,gz:zlib.gzipSync(body)};
  }catch(e){lastAnswer['opensky-network.org']={error:e.cause?.code||e.name||String(e),at:new Date().toISOString()};}
}
async function worldTraffic(req,res){
  if((!world||Date.now()-world.time>15*60000)&&Date.now()>=worldRetry){
    worldFetch||=fetchWorld().finally(()=>(worldFetch=null));
    // A first request waits for the data; later ones get the current copy.
    if(!world)await worldFetch;
  }
  if(!world){res.writeHead(502,{'Content-Type':'application/json'}).end(JSON.stringify({error:'world traffic unavailable',providers:lastAnswer}));return;}
  const gzip=/gzip/.test(req.headers['accept-encoding']||'');
  res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store','X-Data-Age':String(Math.round((Date.now()-world.time)/1000)),...(gzip?{'Content-Encoding':'gzip',Vary:'Accept-Encoding'}:{})});
  res.end(gzip?world.gz:world.body);
}
function send(res,body){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(body);}

// Static files: revalidated with an ETag (304 when unchanged) and gzipped
// for text types, so repeat visits and the large airport list load quickly.
const COMPRESS=new Set(['.html','.js','.mjs','.css','.json','.svg','.txt','.md']);
const gzipped=new Map();
function serveFile(req,res,file,stat){
  const ext=path.extname(file),etag=`"${stat.size.toString(36)}-${Math.round(stat.mtimeMs).toString(36)}"`;
  const headers={'Content-Type':mime[ext]||'application/octet-stream','Cache-Control':'no-cache',ETag:etag,'Last-Modified':stat.mtime.toUTCString(),'X-Content-Type-Options':'nosniff'};
  if(req.headers['if-none-match']===etag){res.writeHead(304,headers).end();return;}
  if(COMPRESS.has(ext)&&/\bgzip\b/.test(req.headers['accept-encoding']||'')){
    let gz=gzipped.get(file);
    if(gz?.etag!==etag){gz={etag,body:zlib.gzipSync(fs.readFileSync(file))};gzipped.set(file,gz);}
    res.writeHead(200,{...headers,'Content-Encoding':'gzip',Vary:'Accept-Encoding','Content-Length':gz.body.length});
    res.end(req.method==='HEAD'?undefined:gz.body);return;
  }
  res.writeHead(200,{...headers,'Content-Length':stat.size});
  if(req.method==='HEAD'){res.end();return;}
  fs.createReadStream(file).on('error',()=>res.destroy()).pipe(res);
}

// Local by default. A hosting platform sets PORT: then listen publicly.
// HOST overrides either way.
const PORT=Number(process.env.PORT)||4173,HOST=process.env.HOST||(process.env.PORT?'0.0.0.0':'127.0.0.1');
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/api/traffic'){traffic(url,res);return;}
  if(url.pathname==='/api/traffic/world'){worldTraffic(req,res);return;}
  if(url.pathname==='/api/traffic/status'){send(res,JSON.stringify({providers:lastAnswer,resting:Object.fromEntries([...resting].map(([h,t])=>[h,new Date(t).toISOString()]))}));return;}
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,{Allow:'GET, HEAD'}).end();return;}
  let file;
  try{file=path.resolve(root,'.'+decodeURIComponent(url.pathname));}catch{res.writeHead(400).end('Bad request');return;}
  if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403).end();return;}
  // Never serve dot-files and folders (.git) or the server itself.
  const rel=path.relative(root,file);
  if(rel.split(path.sep).some((part)=>part.startsWith('.'))||rel==='server.mjs'||rel==='multiplayer-server.mjs'){res.writeHead(404).end('Not found');return;}
  let stat=fs.statSync(file,{throwIfNoEntry:false});
  if(stat?.isDirectory()){file=path.join(file,'index.html');stat=fs.statSync(file,{throwIfNoEntry:false});}
  if(!stat?.isFile()){res.writeHead(404).end('Not found');return;}
  serveFile(req,res,file,stat);
});
// Multiplayer relay on /api/mp (WebSocket).
attachMultiplayer(server);
server.listen(PORT,HOST,()=>console.log(`Online Flight Sim: http://${HOST==='0.0.0.0'?'localhost':HOST}:${PORT}`));
