/* Eve Beauty Source: search engine, search overlay, desktop suggestions, category sheet, app navigation */
(function(){
  'use strict';
  var D=window.PRODUCTS||[];
  function $(id){return document.getElementById(id)}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function slug(s){return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
  function reEsc(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
  function norm(s){
    s=String(s==null?'':s).toLowerCase();
    try{s=s.normalize('NFD').replace(/[̀-ͯ]/g,'')}catch(e){}
    return s.replace(/&/g,' and ').replace(/['’`]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/^ +| +$/g,'');
  }
  function stem(w){
    if(w.length>4&&/ies$/.test(w))return w.slice(0,-3)+'y';
    if(w.length>4&&/(ch|sh|x|ss|zz)es$/.test(w))return w.slice(0,-2);
    if(w.length>3&&/s$/.test(w)&&!/(ss|us|is)$/.test(w))return w.slice(0,-1);
    return w;
  }
  var PHRASE=[[/\bblow ?dr(y|yer|yers)\b/g,'hair dryer'],[/\blip ?stick\b/g,'lipstick'],[/\beye ?liner\b/g,'eyeliner'],[/\bsun ?screen\b/g,'sunscreen'],[/\bnail ?polish(es)?\b/g,'nail polish'],[/\bhair ?dryer\b/g,'hair dryer'],[/\bfoundations?\b/g,'foundation']];
  function qnorm(q){var s=norm(q);for(var i=0;i<PHRASE.length;i++)s=s.replace(PHRASE[i][0],PHRASE[i][1]);return s}
  var STOP={and:1,the:1,for:1,with:1,of:1,a:1,an:1,to:1,in:1,on:1,by:1,or:1};
  /* spelling variants and common alternative words */
  var SYN={moisturiser:['moisturizer'],colour:['color'],sunblock:['sunscreen','spf'],spf:['sunscreen'],sunscreen:['spf'],perfume:['fragrance'],cologne:['fragrance'],parfum:['fragrance'],lipgloss:['gloss'],lippie:['lipstick'],blowdryer:['dryer'],flatiron:['straightener'],flat:['straightener'],iron:['straightener','curling'],tweezer:['tweezer'],cleanser:['wash','cleansing'],facewash:['wash'],shampo:['shampoo'],condtioner:['conditioner'],lotion:['moisturizer','cream'],cream:['moisturizer'],serum:['serum'],makeup:['cosmetic'],cosmetics:['makeup'],mani:['nail'],manicure:['nail'],polish:['nail'],hairspray:['hair'],eyeliner:['eye','liner'],brow:['eyebrow'],eyebrow:['brow'],bomb:['bath'],'oil':['oil'],kajal:['eyeliner'],lashes:['lash'],gua:['gua'],blender:['sponge']};

  /* ---------- index ---------- */
  var VOCAB={},CATS=[],catMap={},ready=false;
  function prep(p){
    if(p._p)return;
    p._p=1;
    var t=norm(p.title||''),c=norm(p.category||''),d=norm(p.dept||'');
    p._ts=t;p._cs=c;
    p._tw=t?t.split(' ').map(stem):[];
    p._cw=c?c.split(' ').map(stem):[];
    p._dw=d?d.split(' ').map(stem):[];
    p._tj=t.replace(/ /g,'');
  }
  function build(){
    if(ready)return;ready=true;
    for(var i=0;i<D.length;i++){
      var p=D[i];prep(p);
      var ws=p._tw.concat(p._cw,p._dw);
      for(var j=0;j<ws.length;j++){if(ws[j].length>=3)VOCAB[ws[j]]=(VOCAB[ws[j]]||0)+1}
      var k=p.dept+'|'+p.category;
      if(!catMap[k]){catMap[k]={dept:p.dept,cat:p.category,n:0,w:p._cw.concat(p._dw)};CATS.push(catMap[k])}
      catMap[k].n++;
    }
  }
  var VOCAB_ARR=null;
  function vocabArr(){if(!VOCAB_ARR)VOCAB_ARR=Object.keys(VOCAB);return VOCAB_ARR}
  function lev(a,b,max){
    if(Math.abs(a.length-b.length)>max)return max+1;
    var prev=[],cur=[],i,j;
    for(j=0;j<=b.length;j++)prev[j]=j;
    for(i=1;i<=a.length;i++){
      cur[0]=i;var rowMin=cur[0];
      for(j=1;j<=b.length;j++){
        cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+(a.charAt(i-1)===b.charAt(j-1)?0:1));
        if(cur[j]<rowMin)rowMin=cur[j];
      }
      if(rowMin>max)return max+1;
      var t=prev;prev=cur;cur=t;
    }
    return prev[b.length];
  }
  function inVocab(tk){
    if(VOCAB[tk])return true;
    var a=vocabArr();
    for(var i=0;i<a.length;i++){if(a[i].indexOf(tk)===0||(tk.length>=4&&a[i].indexOf(tk)>0))return true}
    return false;
  }
  /* fix a misspelled word using the words that actually exist in the catalog */
  function fix(tk){
    if(tk.length<4||inVocab(tk)||SYN[tk])return tk;
    var a=vocabArr(),max=tk.length>=8?2:1,best=tk,bd=max+1,bc=0;
    for(var i=0;i<a.length;i++){
      var d=lev(tk,a[i],max);
      if(d<bd||(d===bd&&d<=max&&VOCAB[a[i]]>bc)){bd=d;best=a[i];bc=VOCAB[a[i]]}
    }
    return bd<=max?best:tk;
  }

  /* ---------- scoring ---------- */
  function tokenize(q0){
    var raw=q0?q0.split(' '):[],out=[],i;
    for(i=0;i<raw.length;i++){if(raw[i]&&!STOP[raw[i]])out.push(stem(raw[i]))}
    if(!out.length&&raw.length)out=raw.filter(Boolean).map(stem);
    return out;
  }
  function wordScore(words,tk){
    var best=0;
    for(var i=0;i<words.length;i++){
      var w=words[i];
      if(w===tk){return 3}
      if(tk.length>=2&&w.indexOf(tk)===0){if(best<2.4)best=2.4}
      else if(tk.length>=4&&w.indexOf(tk)>0){if(best<1.4)best=1.4}
    }
    return best;
  }
  function tokScore(p,tk){
    var alts=[tk],i,best=0;
    var sy=SYN[tk];if(sy)alts=alts.concat(sy);
    for(i=0;i<alts.length;i++){
      var a=alts[i],s=wordScore(p._tw,a),c=wordScore(p._cw,a);
      if(c)s=Math.max(s,c+0.4);
      if(!s){var dd=wordScore(p._dw,a);if(dd)s=dd*0.5}
      if(!s&&a.length>=4&&p._tj.indexOf(a)>-1)s=1.2;
      if(s>best)best=s;
    }
    return best;
  }
  function scoreAll(p,toks,phrase){
    prep(p);
    var total=0;
    for(var i=0;i<toks.length;i++){
      var s=tokScore(p,toks[i]);
      if(!s)return 0;
      total+=s;
    }
    if(phrase){
      if(p._ts.indexOf(phrase)===0)total+=4;
      else if(p._ts.indexOf(phrase)>-1)total+=3;
      if(p._cs===phrase)total+=3;
    }
    return total;
  }
  function scoreAny(p,toks){
    prep(p);var total=0,hit=0;
    for(var i=0;i<toks.length;i++){var s=tokScore(p,toks[i]);if(s){total+=s;hit++}}
    return hit?total+hit:0;
  }
  function run(list,toks,phrase,any){
    var out=[],i,s;
    for(i=0;i<list.length;i++){
      s=any?scoreAny(list[i],toks):scoreAll(list[i],toks,phrase);
      if(s>0)out.push({p:list[i],s:s,i:i});
    }
    out.sort(function(a,b){return b.s-a.s||a.i-b.i});
    return out.map(function(o){return o.p});
  }
  /* main entry: returns {items, q2, corrected, partial, toks} */
  function rank(list,q){
    build();
    var q0=qnorm(q);
    if(!q0)return {items:list.slice(),q2:'',corrected:false,partial:false,toks:[]};
    var toks=tokenize(q0),items=run(list,toks,q0),corrected=false,partial=false,q2=q0;
    if(!items.length){
      var fixed=toks.map(fix),changed=fixed.join(' ')!==toks.join(' ');
      if(changed){
        var r2=run(list,fixed,fixed.join(' '));
        if(r2.length){items=r2;corrected=true;q2=fixed.join(' ');toks=fixed}
      }
    }
    if(!items.length&&toks.length>1){
      items=run(list,toks,q0,true);partial=items.length>0;
    }
    return {items:items,q2:q2,corrected:corrected,partial:partial,toks:toks};
  }
  /* quick yes/no used by the department filter */
  function test(p,q){
    build();
    var q0=qnorm(q);if(!q0)return true;
    var toks=tokenize(q0);
    if(scoreAll(p,toks,q0)>0)return true;
    var fixed=toks.map(fix);
    return fixed.join(' ')!==toks.join(' ')&&scoreAll(p,fixed,fixed.join(' '))>0;
  }
  function suggestCats(toks){
    build();
    if(!toks.length)return [];
    var out=[];
    for(var i=0;i<CATS.length;i++){
      var c=CATS[i],s=0,ok=true;
      for(var j=0;j<toks.length;j++){
        var a=[toks[j]].concat(SYN[toks[j]]||[]),b=0;
        for(var k=0;k<a.length;k++){var v=wordScore(c.w,a[k]);if(v>b)b=v}
        if(!b){ok=false;break}s+=b;
      }
      if(ok)out.push({c:c,s:s});
    }
    out.sort(function(a,b){return b.s-a.s||b.c.n-a.c.n});
    return out.slice(0,4).map(function(o){return o.c});
  }
  window.EveSearch={rank:rank,test:test,norm:norm,ready:function(){build();return true}};

  /* ---------- UI helpers ---------- */
  function hi(t,toks){
    var words=(toks||[]).filter(function(w){return w&&w.length>1}).map(reEsc);
    if(!words.length)return esc(t);
    try{
      var re=new RegExp('('+words.join('|')+')','ig');
      return String(t).split(re).map(function(seg,i){return i%2?'<mark>'+esc(seg)+'</mark>':esc(seg)}).join('');
    }catch(e){return esc(t)}
  }
  function thumb(p){
    var alt=p.asin?'https://ws-na.amazon-adsystem.com/widgets/q?_encoding=UTF8&MarketPlace=US&ASIN='+encodeURIComponent(p.asin)+'&ServiceVersion=20070822&ID=AsinImage&WS=1&Format=_SL500_':'';
    var src=p.image||alt;
    if(!src)return '<span class="th"><i>'+esc((p.category||'?').charAt(0))+'</i></span>';
    return '<span class="th" data-l="'+esc((p.category||'?').charAt(0))+'"><img src="'+esc(src)+'"'+(p.image&&alt?' data-alt="'+esc(alt)+'"':'')+' alt="" loading="lazy" referrerpolicy="no-referrer"></span>';
  }
  function row(p,toks){
    var t=p.title||(p.category+' pick');
    return '<a class="sr-row sd-item" role="option" href="'+esc(p.link)+'" target="_blank" rel="sponsored noopener" aria-label="View '+esc(t)+' on Amazon (opens in a new tab)">'+thumb(p)+
      '<span class="st"><b>'+hi(t,toks)+'</b><small>'+esc(p.category)+' · '+esc(p.dept)+'</small></span><span class="go">View ↗</span></a>';
  }
  function catChip(c){return '<a class="sc-chip sd-item" role="option" href="'+slug(c.dept)+'.html#'+slug(c.cat)+'"><b>'+esc(c.cat)+'</b><small>'+esc(c.dept)+' · '+c.n+'</small></a>'}
  /* a photo that fails (or comes back blank) falls back to a letter */
  function thFail(e){
    var t=e.target;
    if(!t||t.tagName!=='IMG')return;
    var par=t.parentNode;
    if(!par||!par.classList||!par.classList.contains('th'))return;
    if(e.type==='load'&&t.naturalWidth>10)return;
    var a=t.getAttribute('data-alt');
    if(a){t.removeAttribute('data-alt');t.src=a;return}
    par.innerHTML='<i>'+esc(par.getAttribute('data-l')||'?')+'</i>';
  }
  document.addEventListener('error',thFail,true);
  document.addEventListener('load',thFail,true);

  /* recent searches (storage can be blocked, so every access is guarded) */
  var RK='eve_recent';
  function getRecent(){try{var r=JSON.parse(localStorage.getItem(RK)||'[]');return Array.isArray(r)?r.slice(0,8):[]}catch(e){return []}}
  function saveRecent(q){
    q=String(q).replace(/\s+/g,' ').trim();if(!q)return;
    try{var r=getRecent().filter(function(x){return x.toLowerCase()!==q.toLowerCase()});r.unshift(q);localStorage.setItem(RK,JSON.stringify(r.slice(0,8)))}catch(e){}
  }
  function clearRecent(){try{localStorage.removeItem(RK)}catch(e){}}

  var body=document.body,isShop=body.getAttribute('data-page')==='shop',isHome=body.getAttribute('data-page')==='home';
  function go(q){
    q=String(q).replace(/\s+/g,' ').trim();
    if(!q)return;
    saveRecent(q);
    closeAll(true);
    var h='q='+encodeURIComponent(q);
    if(isShop){location.hash=h;return}
    location.href='shop.html#'+h;
  }

  var POP=['Shampoo','Face wash','Serum','Lipstick','Foundation','Nail polish','Hair dryer','Sunscreen','Mascara','Body lotion','Conditioner','Eyeliner'];
  var popCache=null;
  function popular(){
    if(popCache)return popCache;build();
    popCache=POP.filter(function(w){return rank(D,w).items.length>0}).slice(0,10);
    return popCache;
  }
  function depts(){
    var seen={},out=[];
    D.forEach(function(p){if(!seen[p.dept]){seen[p.dept]={name:p.dept,n:0};out.push(seen[p.dept])}seen[p.dept].n++});
    return out;
  }

  /* ---------- overlays (mobile search, categories) ---------- */
  var openName=null;
  function lock(on){body.classList.toggle('noscroll',on)}
  function show(name){
    if(openName)return;
    openName=name;
    var el=name==='search'?$('so'):$('csheet');
    if(!el)return;
    el.hidden=false;
    requestAnimationFrame(function(){el.classList.add('on')});
    lock(true);
    try{history.pushState({ov:name},'')}catch(e){}
    markTab(name==='search'?'search':'cat');
    if(name==='search'){
      var inp=$('soq');renderOverlay(inp.value);
      setTimeout(function(){try{inp.focus()}catch(e){}},60);
    }
  }
  function hide(){
    ['so','csheet'].forEach(function(id){var el=$(id);if(el){el.classList.remove('on');el.hidden=true}});
    lock(false);openName=null;markTab(baseTab);
  }
  function closeAll(silent){
    if(!openName)return;
    if(!silent&&history.state&&history.state.ov){try{history.back();return}catch(e){}}
    hide();
  }
  window.addEventListener('popstate',function(){if(openName)hide()});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeAll();closeDrop()}});

  /* ---------- bottom tabs ---------- */
  var baseTab='';
  (function(){
    var p=location.pathname;
    if(isHome||/\/(index\.html)?$/.test(p))baseTab='home';
    else if(isShop)baseTab='shop';
    else if(body.getAttribute('data-dept'))baseTab='cat';
    else if(/contact/.test(p))baseTab='pin';
  })();
  function markTab(k){
    var tabs=document.querySelectorAll('.tabbar .tb');
    for(var i=0;i<tabs.length;i++){
      var on=tabs[i].getAttribute('data-tab')===k;
      if(on)tabs[i].setAttribute('aria-current','page');else tabs[i].removeAttribute('aria-current');
    }
  }
  markTab(baseTab);

  /* ---------- search overlay content ---------- */
  var soAll=$('soall');
  function renderOverlay(q){
    var out=$('sob');if(!out)return;
    var clr=$('soc');if(clr)clr.hidden=!q;
    var qn=String(q).replace(/\s+/g,' ').trim();
    var h='',r;
    if(!qn){
      if(soAll)soAll.hidden=true;
      var rec=getRecent();
      if(rec.length)h+='<section class="so-sec"><div class="so-h"><b>Recent</b><button type="button" data-act="clr">Clear</button></div><div class="qs">'+rec.map(function(w){return '<button type="button" data-q="'+esc(w)+'"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'+esc(w)+'</button>'}).join('')+'</div></section>';
      var pop=popular();
      if(pop.length)h+='<section class="so-sec"><div class="so-h"><b>Popular searches</b></div><div class="qs">'+pop.map(function(w){return '<button type="button" data-q="'+esc(w)+'">'+esc(w)+'</button>'}).join('')+'</div></section>';
      h+='<section class="so-sec"><div class="so-h"><b>Shop by department</b></div><div class="dg">'+depts().map(function(d){return '<a href="'+slug(d.name)+'.html"><b>'+esc(d.name)+'</b><small>'+d.n+' products</small></a>'}).join('')+'</div></section>';
      out.innerHTML=h;return;
    }
    r=rank(D,qn);
    var cs=suggestCats(r.toks.length?r.toks:tokenize(norm(qn)));
    if(r.corrected)h+='<p class="so-note">Showing results for <b>'+esc(r.q2)+'</b></p>';
    else if(r.partial)h+='<p class="so-note">No exact match. Showing products that match some of your words.</p>';
    if(cs.length)h+='<div class="so-cats" role="listbox" aria-label="Matching categories">'+cs.map(catChip).join('')+'</div>';
    if(r.items.length){
      h+='<div class="so-count">'+r.items.length+' product'+(r.items.length===1?'':'s')+'</div><div role="listbox" aria-label="Products">'+r.items.slice(0,40).map(function(p){return row(p,r.toks)}).join('')+'</div>';
      if(r.items.length>40)h+='<p class="so-note">Showing the first 40. Use "See all results" for the rest.</p>';
      if(soAll){soAll.hidden=false;soAll.textContent='See all '+r.items.length+' results for “'+qn+'”';soAll.setAttribute('href','shop.html#q='+encodeURIComponent(qn))}
    }else{
      if(soAll)soAll.hidden=true;
      h+='<div class="so-empty"><b>No products found for “'+esc(qn)+'”</b><p>Check the spelling, or try a shorter word like “serum” or “brush”.</p></div>';
      var pop2=popular();
      if(pop2.length)h+='<section class="so-sec"><div class="so-h"><b>Try one of these</b></div><div class="qs">'+pop2.map(function(w){return '<button type="button" data-q="'+esc(w)+'">'+esc(w)+'</button>'}).join('')+'</div></section>';
      h+='<section class="so-sec"><div class="so-h"><b>Shop by department</b></div><div class="dg">'+depts().map(function(d){return '<a href="'+slug(d.name)+'.html"><b>'+esc(d.name)+'</b><small>'+d.n+' products</small></a>'}).join('')+'</div></section>';
    }
    out.innerHTML=h;
  }
  var soq=$('soq');
  if(soq){
    soq.addEventListener('input',function(){renderOverlay(soq.value)});
    $('soform').addEventListener('submit',function(e){e.preventDefault();var v=soq.value.trim();if(v)go(v)});
    $('soc').addEventListener('click',function(){soq.value='';renderOverlay('');soq.focus()});
    $('sob').addEventListener('click',function(e){
      var b=e.target.closest('button');
      if(b){
        if(b.getAttribute('data-act')==='clr'){clearRecent();renderOverlay(soq.value);return}
        var q=b.getAttribute('data-q');
        if(q!=null){soq.value=q;saveRecent(q);renderOverlay(q);var bd=$('sob');if(bd)bd.scrollTop=0}
        return;
      }
      var a=e.target.closest('a.sr-row');
      if(a){saveRecent(soq.value)}
    });
    if(soAll)soAll.addEventListener('click',function(e){e.preventDefault();go(soq.value)});
    $('sox').addEventListener('click',function(){closeAll()});
  }
  var mp=$('mpill'),ts=$('tsearch'),tc=$('tcat'),cs=$('csx');
  if(mp)mp.addEventListener('click',function(){show('search')});
  if(ts)ts.addEventListener('click',function(){openName==='search'?closeAll():show('search')});
  if(tc)tc.addEventListener('click',function(){openName==='cat'?closeAll():show('cat')});
  if(cs)cs.addEventListener('click',function(){closeAll()});
  var sh=$('csheet');
  if(sh)sh.addEventListener('click',function(e){if(e.target.closest('a'))lock(false)});

  /* ---------- desktop search box with live suggestions ---------- */
  var hq=$('hq'),drop=$('sdrop'),hform=document.querySelector('.hsearch'),act=-1,dtimer;
  function items(){return drop?drop.querySelectorAll('.sd-item'):[]}
  function setAct(i){
    var it=items();
    for(var k=0;k<it.length;k++)it[k].classList.toggle('act',k===i);
    act=i;
    if(it[i]&&it[i].scrollIntoView)it[i].scrollIntoView({block:'nearest'});
  }
  function closeDrop(){if(!drop)return;drop.hidden=true;act=-1;if(hq)hq.setAttribute('aria-expanded','false')}
  function renderDrop(){
    if(!drop||!hq)return;
    var q=hq.value.replace(/\s+/g,' ').trim();
    if(!q){closeDrop();return}
    var r=rank(D,q),cs2=suggestCats(r.toks.length?r.toks:tokenize(norm(q))),h='';
    if(cs2.length)h+='<div class="sd-h">Categories</div><div class="sd-cats">'+cs2.map(catChip).join('')+'</div>';
    if(r.items.length){
      if(r.corrected)h+='<div class="sd-note">Showing results for <b>'+esc(r.q2)+'</b></div>';
      h+='<div class="sd-h">Products</div>'+r.items.slice(0,6).map(function(p){return row(p,r.toks)}).join('')+
        '<a class="sd-all sd-item" role="option" href="shop.html#q='+esc(encodeURIComponent(q))+'" data-all="1">See all '+r.items.length+' results for “'+esc(q)+'”</a>';
    }else{
      h+='<div class="sd-empty">No products found for “'+esc(q)+'”. Try a shorter word.</div>';
    }
    drop.innerHTML=h;drop.hidden=false;act=-1;hq.setAttribute('aria-expanded','true');
  }
  if(hq&&drop){
    hq.addEventListener('input',function(){clearTimeout(dtimer);dtimer=setTimeout(renderDrop,80)});
    hq.addEventListener('focus',function(){if(hq.value.trim())renderDrop()});
    hq.addEventListener('keydown',function(e){
      var it=items();
      if(e.key==='ArrowDown'&&it.length){e.preventDefault();setAct(Math.min(act+1,it.length-1))}
      else if(e.key==='ArrowUp'&&it.length){e.preventDefault();setAct(Math.max(act-1,0))}
      else if(e.key==='Enter'&&act>=0&&it[act]){
        e.preventDefault();
        if(it[act].getAttribute('data-all')||it[act].classList.contains('sc-chip'))location.href=it[act].getAttribute('href');
        else window.open(it[act].getAttribute('href'),'_blank','noopener');
      }
    });
    document.addEventListener('click',function(e){if(!e.target.closest('.hsearch'))closeDrop()});
    drop.addEventListener('click',function(e){if(e.target.closest('a.sr-row'))saveRecent(hq.value)});
  }
  if(hform){
    hform.addEventListener('submit',function(e){
      e.preventDefault();
      var v=hq.value.trim();
      if(v)go(v);
    });
  }
  /* "/" focuses the search box on desktop */
  document.addEventListener('keydown',function(e){
    if(e.key!=='/'||e.ctrlKey||e.metaKey||e.altKey)return;
    var t=e.target&&e.target.tagName;
    if(t==='INPUT'||t==='TEXTAREA'||t==='SELECT')return;
    if(hq&&hq.offsetParent!==null){e.preventDefault();hq.focus()}
  });

  /* keep the header search box showing the current query on the results page */
  function hashQuery(){
    var m=/[#&?]q=([^&]*)/.exec(location.hash)||/[?&]q=([^&]*)/.exec(location.search);
    if(!m)return '';
    try{return decodeURIComponent(m[1].replace(/\+/g,' '))}catch(e){return m[1]}
  }
  if(isShop&&hq){hq.value=hashQuery()}
  window.EveSearch.hashQuery=hashQuery;
})();
