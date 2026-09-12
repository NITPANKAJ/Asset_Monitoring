const API_URL="https://script.google.com/macros/s/AKfycbwdbAHWKbaIPpSyxV0XNuKzjHUiEdY7XsjPz_MPBgMw7LEAxO9iSlQrun3IwW_TYYFl/exec";

const USERS={
  "entry":   {password:"entry123", role:"entry"},
  "analysis":{password:"analysis123", role:"analysis"},
  "admin":   {password:"admin123", role:"admin"}
};

function clean(v){return String(v??"").trim()}
function esc(v){return clean(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function currentUser(){try{return JSON.parse(sessionStorage.getItem("jsdg_user")||"null")}catch(e){return null}}
function logout(){sessionStorage.removeItem("jsdg_user"); location.href="index.html"}

function requireRole(allowed){
  const u=currentUser();
  if(!u || !allowed.includes(u.role)){location.href="index.html"; return null}
  const el=document.getElementById("currentUser");
  if(el) el.textContent=u.username+" ("+u.role+")";
  return u;
}

function closed(s){return /(closed|complete|completed|rectified|done|ok|fit|working|resolved)/i.test(clean(s))}
function countBy(data,i,label="Not Specified"){const o={};data.forEach(r=>{const k=clean(r[i])||label;o[k]=(o[k]||0)+1});return o}
function topN(o,n){return Object.fromEntries(Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,n))}

async function apiGetData(){
  const url = API_URL + "?action=getData&t=" + Date.now();
  const response = await fetch(url, {method:"GET", cache:"no-store"});
  if(!response.ok) throw new Error("HTTP " + response.status);
  const result = await response.json();
  if(!result.success) throw new Error(result.message || "Could not load data");
  return result.data || [];
}

async function apiSaveRecord(record, rowNumber=null){
  const payload = rowNumber
    ? {action:"update", rowNumber:Number(rowNumber), record}
    : {action:"add", record};

  const response = await fetch(API_URL, {
    method:"POST",
    headers:{"Content-Type":"text/plain;charset=utf-8"},
    body:JSON.stringify(payload)
  });
  if(!response.ok) throw new Error("HTTP " + response.status);
  const result = await response.json();
  if(!result.success) throw new Error(result.message || "Save failed");
  return result;
}

async function apiDeleteRecord(rowNumber){
  const response = await fetch(API_URL, {
    method:"POST",
    headers:{"Content-Type":"text/plain;charset=utf-8"},
    body:JSON.stringify({action:"delete", rowNumber:Number(rowNumber)})
  });
  if(!response.ok) throw new Error("HTTP " + response.status);
  const result = await response.json();
  if(!result.success) throw new Error(result.message || "Delete failed");
  return result;
}

function drawChart(id,obj,palette){
  const c=document.getElementById(id); if(!c)return;
  const box=c.parentElement.getBoundingClientRect(),dpr=window.devicePixelRatio||1;
  c.width=Math.max(300,box.width)*dpr;c.height=Math.max(170,box.height)*dpr;
  const ctx=c.getContext("2d");ctx.scale(dpr,dpr);
  const W=c.width/dpr,H=c.height/dpr;ctx.clearRect(0,0,W,H);
  const entries=Object.entries(obj);
  if(!entries.length){ctx.fillStyle="#748188";ctx.font="13px Arial";ctx.textAlign="center";ctx.fillText("No data",W/2,H/2);return}
  const p={l:40,r:12,t:15,b:58},cw=W-p.l-p.r,ch=H-p.t-p.b,max=Math.max(...entries.map(e=>e[1]),1);
  ctx.strokeStyle="#e3e9ec";ctx.fillStyle="#65737a";ctx.font="9px Arial";
  for(let i=0;i<=5;i++){const y=p.t+ch-(ch*i/5);ctx.beginPath();ctx.moveTo(p.l,y);ctx.lineTo(W-p.r,y);ctx.stroke();ctx.textAlign="right";ctx.fillText(Math.round(max*i/5),p.l-5,y+3)}
  const slot=cw/entries.length,bw=Math.min(48,slot*.62);
  entries.forEach(([lab,val],i)=>{
    const x=p.l+slot*i+(slot-bw)/2,h=(val/max)*ch,y=p.t+ch-h;
    ctx.fillStyle=palette[i%palette.length];ctx.fillRect(x,y,bw,h);
    ctx.fillStyle="#24343c";ctx.font="bold 9px Arial";ctx.textAlign="center";ctx.fillText(val,x+bw/2,Math.max(10,y-3));
    ctx.save();ctx.translate(x+bw/2,p.t+ch+7);ctx.rotate(-Math.PI/5);ctx.fillStyle="#617078";ctx.font="9px Arial";ctx.textAlign="right";
    ctx.fillText(lab.length>18?lab.slice(0,17)+"…":lab,0,0);ctx.restore();
  });
}
