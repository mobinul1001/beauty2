(function(){
  var PAGE=48;
  function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function slug(s){return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
  function $(id){return document.getElementById(id)}

  function card(p){
    var title=p.title||(p.category+' pick');
    var alt=p.asin?'https://ws-na.amazon-adsystem.com/widgets/q?_encoding=UTF8&MarketPlace=US&ASIN='+encodeURIComponent(p.asin)+'&ServiceVersion=20070822&ID=AsinImage&WS=1&Format=_SL500_':'';
    var src=p.image||alt;
    var media=src?'<img src="'+esc(src)+'"'+(p.image&&alt?' data-alt="'+esc(alt)+'"':'')+' alt="'+esc(title)+'" loading="lazy" referrerpolicy="no-referrer">':'<span class="mono" aria-hidden="true">'+esc(p.category.charAt(0))+'</span>';
    return '<article class="card"><div class="ph">'+media+'<span class="tag">'+esc(p.category)+'</span></div>'+
      '<div class="body"><div class="cat"><a href="'+slug(p.dept)+'.html#'+slug(p.category)+'">'+esc(p.category)+'</a></div><h3>'+esc(title)+'</h3>'+(p.description?'<p>'+esc(p.description)+'</p>':'')+
      '<div class="buy"><a href="'+esc(p.link)+'" target="_blank" rel="sponsored noopener" aria-label="View '+esc(title)+' on Amazon (opens in a new tab)"><span>View on Amazon</span><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg></a></div></div></article>';
  }

  /* contact form: set ENDPOINT to a Formspree URL to send messages */
  var ENDPOINT='';
  var cf=$('cform');
  if(cf){
    cf.addEventListener('submit',function(e){
      e.preventDefault();
      var note=$('cnote');
      if(!cf.name.value.trim()||!/\S+@\S+\.\S+/.test(cf.email.value)||!cf.message.value.trim()){note.textContent='Please fill in your name, a valid email and a message.';return}
      if(!ENDPOINT){note.textContent='The message form is not connected yet. Please call +1 718-353-9993.';return}
      fetch(ENDPOINT,{method:'POST',headers:{'Accept':'application/json','Content-Type':'application/json'},body:JSON.stringify({name:cf.name.value,email:cf.email.value,message:cf.message.value})})
      .then(function(r){if(!r.ok)throw 0;note.textContent='Thanks. Your message was sent.';cf.reset()})
      .catch(function(){note.textContent='The message could not be sent. Please call +1 718-353-9993.'});
    });
  }

  /* if a photo fails to load, fall back to the letter placeholder */
  function swap(e){
    var t=e.target;
    if(e.type==='load'&&!(t.naturalWidth<=10))return; /* Amazon returns a 1px blank image for some products */
    if(t&&t.tagName==='IMG'&&t.getAttribute('data-alt')){var nx=t.getAttribute('data-alt');t.removeAttribute('data-alt');t.src=nx;return} /* try the second image source once */
    if(t&&t.tagName==='IMG'&&t.parentNode&&t.parentNode.classList.contains('cp')){t.parentNode.removeChild(t);return}
    if(t&&t.tagName==='IMG'&&t.parentNode&&t.parentNode.classList.contains('cimg')){t.parentNode.style.display='none';return}
    if(t&&t.tagName==='IMG'&&t.parentNode&&t.parentNode.classList.contains('ph')){
      var m=document.createElement('span');m.className='mono';m.setAttribute('aria-hidden','true');
      m.textContent=(t.parentNode.querySelector('.tag')||{textContent:'?'}).textContent.charAt(0);
      t.parentNode.replaceChild(m,t);
    }
  }
  document.addEventListener('error',swap,true);
  document.addEventListener('load',swap,true);

  var body=document.body, dept=body.getAttribute('data-dept'), isShop=body.getAttribute('data-page')==='shop', isHome=body.getAttribute('data-page')==='home';

  /* header search: go to the shop page with the query */
  var hs=document.querySelector('.hsearch');
  if(hs){
    var qv=/[?&]q=([^&]*)/.exec(location.search);
    if(qv&&hs.q) hs.q.value=decodeURIComponent(qv[1].replace(/\+/g,' '));
    hs.addEventListener('submit',function(e){
      if(isShop){e.preventDefault();var el=$('q');if(el){el.value=hs.q.value;el.dispatchEvent(new Event('input'))}}
    });
  }
  if(!dept && !isShop && !isHome) return;

  fetch('products.json').then(function(r){if(!r.ok)throw 0;return r.json()}).catch(function(){if(window.PRODUCTS)return window.PRODUCTS;throw 0}).then(function(ALL){
    if(dept) return deptPage(ALL);
    if(isHome) return homePage(ALL);
    shopPage(ALL);
  }).catch(function(){
    var t=$('sections')||$('grid');
    if(t) t.innerHTML='<div class="empty">The product list could not be loaded. Reload the page to try again.</div>';
  });

  var BRANDS=['OLAPLEX','CeraVe','KERASTASE','KÉRASTASE','Pureology','Living Proof','COSRX','Beauty Joseon','Dermalogica','Good Molecules','Maybelline','Milani','ColourPop','Revlon','Aveda','Dove','Wavytalk','L\'Oreal','LOreal','NYX','e.l.f','Neutrogena','CeraVe','La Roche','Cetaphil','Garnier','OPI','Sally Hansen','essie','Redken','Moroccanoil','Shea Moisture','SheaMoisture','Aveeno','Olay','Native','Method','Vaseline','Eucerin','Kiss','Conair','Revlon','BaBylissPRO','Remington','Hot Tools','Real Techniques','Morphe','Fenty','Tarte','Too Faced','Urban Decay','Covergirl','COVERGIRL','Physicians Formula','Burt\'s Bees','Cantu','Mielle','Pantene','Head & Shoulders','TRESemme','Tresemmé','Bio-Oil','Paula\'s Choice','The Ordinary','Anua','ANUA','Round Lab','Mixsoon','Medicube','Skin1004','Laneige','Innisfree','Biore','Bioré','Differin','Hero','Honest','Nizoral','Kerastase'];
  var BRE=BRANDS.map(function(b){return [b,new RegExp('(^|[^a-z0-9])'+b.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'($|[^a-z0-9])')]});
  function brandOf(t){var l=t.toLowerCase();for(var i=0;i<BRE.length;i++){if(BRE[i][1].test(l))return BRE[i][0]}return ''}
  var ALIAS={'KERASTASE':'Kérastase','KÉRASTASE':'Kérastase','Kerastase':'Kérastase','LOreal':"L'Oreal",'COVERGIRL':'Covergirl','ANUA':'Anua','SheaMoisture':'Shea Moisture','Bioré':'Biore','TRESemme':'Tresemmé','OLAPLEX':'Olaplex','COSRX':'COSRX'};
  function norm(b){return ALIAS[b]||b}

  function deptPage(ALL){
    var list=ALL.filter(function(p){return p.dept===dept});
    list.forEach(function(p,i){p._i=i;p._b=norm(brandOf(p.title||''))});
    var cats={},brands={};
    list.forEach(function(p){cats[p.category]=(cats[p.category]||0)+1;if(p._b)brands[p._b]=(brands[p._b]||0)+1});
    var catNames=Object.keys(cats).sort(function(a,b){return cats[b]-cats[a]||a.localeCompare(b)});
    var brandNames=Object.keys(brands).filter(function(b){return brands[b]>=3}).sort(function(a,b){return brands[b]-brands[a]||a.localeCompare(b)});
    var st={cat:{},brand:{},q:'',sort:'',shown:PAGE};
    var h=(location.hash||'').replace('#','');
    catNames.forEach(function(c){if(slug(c)===h)st.cat[c]=1});

    var sideb=$('sideb');
    function group(id,title,names,counts,key,searchable){
      var rows=names.map(function(n,i){
        return '<label class="opt'+(i>=7?' xtra':'')+'" data-n="'+esc(n)+'"><input type="checkbox" data-k="'+key+'" value="'+esc(n)+'"><span class="bx"></span><span class="ot">'+esc(n)+'</span><span class="oc" data-c="'+esc(n)+'">'+counts[n]+'</span></label>';
      }).join('');
      return '<div class="fg" id="'+id+'"><h4>'+title+'</h4>'+rows+(names.length>7?'<button type="button" class="lnk tog" data-t="'+id+'">Show all '+names.length+'</button>':'')+'</div>';
    }
    sideb.innerHTML='<div class="fg"><h4>Search in '+esc(dept)+'</h4><div class="sbox"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="dq" type="search" placeholder="Product name or brand" autocomplete="off"></div></div>'+
      group('gcat','Category',catNames,cats,'cat')+(brandNames.length?group('gbrand','Brand',brandNames,brands,'brand'):'');

    function match(p,skip){
      if(skip!=='cat'){var k=Object.keys(st.cat);if(k.length&&!st.cat[p.category])return false}
      if(skip!=='brand'){var b=Object.keys(st.brand);if(b.length&&!st.brand[p._b])return false}
      if(st.q){var t=((p.title||'')+' '+p.category+' '+(p._b||'')).toLowerCase();if(t.indexOf(st.q)<0)return false}
      return true;
    }
    function result(){
      var r=list.filter(function(p){return match(p)});
      if(st.sort==='az')r.sort(function(a,b){return (a.title||'').localeCompare(b.title||'')});
      else if(st.sort==='za')r.sort(function(a,b){return (b.title||'').localeCompare(a.title||'')});
      return r;
    }
    function facet(key,skip,names){
      var c={};names.forEach(function(n){c[n]=0});
      list.forEach(function(p){if(!match(p,skip))return;var v=key==='cat'?p.category:p._b;if(v&&c[v]!==undefined)c[v]++});
      return c;
    }
    function nActive(){return Object.keys(st.cat).length+Object.keys(st.brand).length+(st.q?1:0)}
    var grid=$('grid');
    function render(keepShown){
      if(!keepShown)st.shown=PAGE;
      var r=result();
      grid.innerHTML=r.slice(0,st.shown).map(card).join('');
      $('rc').innerHTML='<b>'+r.length+'</b> of '+list.length+' products';
      $('empty').hidden=r.length>0;
      var m=$('more');m.hidden=r.length<=st.shown;m.textContent='Show more ('+Math.min(PAGE,r.length-st.shown)+' of '+(r.length-st.shown)+' left)';
      $('sapply').textContent='Show '+r.length+' product'+(r.length===1?'':'s');
      var n=nActive(),fn=$('fn');fn.hidden=!n;fn.textContent=n;
      // facet counts
      var cc=facet('cat','cat',catNames),bc=facet('brand','brand',brandNames);
      sideb.querySelectorAll('.oc').forEach(function(el){
        var lab=el.parentNode,inp=lab.querySelector('input'),v=lab.getAttribute('data-n'),c=(inp.getAttribute('data-k')==='cat'?cc:bc)[v];
        el.textContent=c;lab.classList.toggle('zero',c===0&&!inp.checked);inp.checked=!!(inp.getAttribute('data-k')==='cat'?st.cat[v]:st.brand[v]);
      });
      // active chips
      var a='';
      Object.keys(st.cat).forEach(function(c){a+='<button type="button" class="ac" data-k="cat" data-v="'+esc(c)+'">'+esc(c)+' <i>&times;</i></button>'});
      Object.keys(st.brand).forEach(function(c){a+='<button type="button" class="ac" data-k="brand" data-v="'+esc(c)+'">'+esc(c)+' <i>&times;</i></button>'});
      if(st.q)a+='<button type="button" class="ac" data-k="q">&ldquo;'+esc(st.q)+'&rdquo; <i>&times;</i></button>';
      if(a)a+='<button type="button" class="lnk" id="aclear">Clear all</button>';
      $('active').innerHTML=a;
      // quick chips
      var none=!Object.keys(st.cat).length;
      $('qchips').innerHTML='<button type="button" class="qc" data-v="" aria-pressed="'+none+'">All</button>'+catNames.map(function(c){return '<button type="button" class="qc" data-v="'+esc(c)+'" aria-pressed="'+(!!st.cat[c])+'">'+esc(c)+' <small>'+cats[c]+'</small></button>'}).join('');
    }
    function clearAll(){st.cat={};st.brand={};st.q='';$('dq').value='';render()}

    sideb.addEventListener('change',function(e){
      var t=e.target;if(t.type!=='checkbox')return;
      var m=t.getAttribute('data-k')==='cat'?st.cat:st.brand;
      if(t.checked)m[t.value]=1;else delete m[t.value];
      render();
    });
    sideb.addEventListener('click',function(e){
      var t=e.target.closest('.tog');if(!t)return;
      var g=$(t.getAttribute('data-t'));g.classList.toggle('open');
      t.textContent=g.classList.contains('open')?'Show less':'Show all '+g.querySelectorAll('.opt').length;
    });
    var dq=$('dq'),tm;
    dq.addEventListener('input',function(){clearTimeout(tm);tm=setTimeout(function(){st.q=dq.value.trim().toLowerCase();render()},120)});
    $('sort').addEventListener('change',function(){st.sort=this.value;render()});
    $('more').addEventListener('click',function(){st.shown+=PAGE;render(true)});
    $('sclear').addEventListener('click',clearAll);
    $('eclear').addEventListener('click',clearAll);
    $('active').addEventListener('click',function(e){
      if(e.target.id==='aclear'){clearAll();return}
      var b=e.target.closest('.ac');if(!b)return;var k=b.getAttribute('data-k');
      if(k==='q'){st.q='';dq.value=''}else delete st[k][b.getAttribute('data-v')];
      render();
    });
    $('qchips').addEventListener('click',function(e){
      var b=e.target.closest('.qc');if(!b)return;var v=b.getAttribute('data-v');
      if(!v)st.cat={};else if(st.cat[v])delete st.cat[v];else st.cat[v]=1;
      render();
    });
    // mobile drawer
    var side=$('side'),ov=$('ov'),fbtn=$('fbtn');
    function open(){document.body.classList.add('fopen');side.classList.add('on');ov.classList.add('on');fbtn.setAttribute('aria-expanded','true');$('sclose').focus()}
    function close(){document.body.classList.remove('fopen');side.classList.remove('on');ov.classList.remove('on');fbtn.setAttribute('aria-expanded','false')}
    fbtn.addEventListener('click',open);$('sclose').addEventListener('click',close);ov.addEventListener('click',close);$('sapply').addEventListener('click',function(){close();var t=document.querySelector('.toolbar');if(t)window.scrollTo({top:t.getBoundingClientRect().top+window.pageYOffset-80,behavior:'smooth'})});
    document.addEventListener('keydown',function(e){if(e.key==='Escape')close()});
    render();
    if(Object.keys(st.cat).length){var t=document.querySelector('.toolbar');if(t)setTimeout(function(){window.scrollTo({top:t.getBoundingClientRect().top+window.pageYOffset-90})},50)}
  }

  function shopPage(ALL){
    var state={dept:'',cat:'',q:'',shown:PAGE};
    var grid=$('grid'),chips=$('chips'),dchips=$('deptchips'),count=$('count'),more=$('more');
    var depts=[];ALL.forEach(function(p){if(depts.indexOf(p.dept)<0)depts.push(p.dept)});
    function buildChips(){
      dchips.innerHTML='<button class="chip" type="button" data-d="" aria-pressed="'+(state.dept===''?'true':'false')+'">All departments</button>'+
        depts.map(function(d){return '<button class="chip" type="button" data-d="'+esc(d)+'" aria-pressed="'+(state.dept===d?'true':'false')+'">'+esc(d)+'</button>'}).join('');
      var cats=[],seen={};
      ALL.forEach(function(p){if(state.dept&&p.dept!==state.dept)return;if(!seen[p.category]){seen[p.category]=1;cats.push(p.category)}});
      chips.innerHTML=state.dept?('<button class="chip" type="button" data-c="" aria-pressed="'+(state.cat===''?'true':'false')+'">All categories</button>'+
        cats.map(function(c){return '<button class="chip" type="button" data-c="'+esc(c)+'" aria-pressed="'+(state.cat===c?'true':'false')+'">'+esc(c)+'</button>'}).join('')):'';
    }
    function filtered(){
      var q=state.q.trim().toLowerCase();
      return ALL.filter(function(p){
        if(state.dept&&p.dept!==state.dept)return false;
        if(state.cat&&p.category!==state.cat)return false;
        if(q&&(p.title+' '+p.category+' '+p.dept+' '+p.description).toLowerCase().indexOf(q)<0)return false;
        return true;
      });
    }
    function render(){
      var l=filtered(),s=l.slice(0,state.shown);
      grid.innerHTML=s.length?s.map(card).join(''):'<div class="empty">No products match. Try another word or show everything.</div>';
      count.textContent=l.length+' product'+(l.length===1?'':'s')+(state.dept?' in '+state.dept:'')+(state.cat?' / '+state.cat:'');
      more.hidden=l.length<=state.shown;
    }
    function upd(){state.shown=PAGE;buildChips();render()}
    dchips.addEventListener('click',function(e){var b=e.target.closest('.chip');if(!b)return;state.dept=b.getAttribute('data-d');state.cat='';upd()});
    chips.addEventListener('click',function(e){var b=e.target.closest('.chip');if(!b)return;state.cat=b.getAttribute('data-c');upd()});
    $('q').addEventListener('input',function(e){state.q=e.target.value;state.shown=PAGE;render()});
    $('reset').addEventListener('click',function(){state={dept:'',cat:'',q:'',shown:PAGE};$('q').value='';upd()});
    more.addEventListener('click',function(){state.shown+=PAGE;render()});
    var m=/[?&]q=([^&]*)/.exec(location.search);
    if(m){state.q=decodeURIComponent(m[1].replace(/\+/g,' '));$('q').value=state.q}
    upd();
  }

  function hasPhoto(p){return p.image&&p.image.indexOf('images/')!==0}

  function homePage(ALL){
    var order=[],by={};
    ALL.forEach(function(p){if(!by[p.dept]){by[p.dept]=[];order.push(p.dept)}by[p.dept].push(p)});

    /* product rows, one per department */
    var rows='';
    order.forEach(function(d){
      var seen={},pick=[];
      by[d].forEach(function(p){if(hasPhoto(p)&&!seen[p.asin]&&pick.length<12){seen[p.asin]=1;pick.push(p)}});
      if(!pick.length) return;
      rows+='<section class="rowsec"><div class="wrap"><div class="sechead"><h2>'+esc(d)+'</h2><a href="'+slug(d)+'.html">View all '+by[d].length+' ›</a></div>'+
        '<div class="rowwrap"><button class="rnav l" type="button" aria-label="Scroll left">‹</button><div class="hrow" tabindex="0">'+pick.map(card).join('')+'</div><button class="rnav r" type="button" aria-label="Scroll right">›</button></div></div></section>';
    });
    $('rows').innerHTML=rows;
    Array.prototype.forEach.call(document.querySelectorAll('.rowwrap'),function(w){
      var r=w.querySelector('.hrow');
      w.querySelector('.l').addEventListener('click',function(){r.scrollBy({left:-r.clientWidth*.8,behavior:'smooth'})});
      w.querySelector('.r').addEventListener('click',function(){r.scrollBy({left:r.clientWidth*.8,behavior:'smooth'})});
      r.addEventListener('keydown',function(e){if(e.key==='ArrowRight')r.scrollBy({left:220,behavior:'smooth'});if(e.key==='ArrowLeft')r.scrollBy({left:-220,behavior:'smooth'})});
    });

    /* popular category tiles: biggest categories that have a photo */
    var groups={};
    ALL.forEach(function(p){var k=p.dept+'|'+p.category;(groups[k]=groups[k]||{dept:p.dept,cat:p.category,n:0,img:''}).n++;if(!groups[k].img&&hasPhoto(p))groups[k].img=p.image});
    var list=Object.keys(groups).map(function(k){return groups[k]}).filter(function(g){return g.img}).sort(function(a,b){return b.n-a.n}).slice(0,16);
    $('cgrid').innerHTML=list.map(function(g){
      return '<a class="ctile" href="'+slug(g.dept)+'.html#'+slug(g.cat)+'"><div class="cp"><img src="'+esc(g.img)+'" alt="" loading="lazy" referrerpolicy="no-referrer"></div><div class="ct"><b>'+esc(g.cat)+'</b><small>'+esc(g.dept)+' · '+g.n+' products</small></div></a>';
    }).join('');

    /* banner collage + carousel */
    var slides=document.querySelectorAll('#slides .slide');
    Array.prototype.forEach.call(slides,function(s,i){
      var d=s.getAttribute('data-dept'),seen={},imgs=[];
      var src=(i===0)?ALL:(by[d]||[]);
      src.forEach(function(p){if(hasPhoto(p)&&!seen[p.asin]&&imgs.length<3&&(i!==0||Math.random()>-1)){seen[p.asin]=1;imgs.push(p.image)}});
      if(i===0){imgs=[];['Skincare','Makeup','Hair Care'].forEach(function(dd){var f=(by[dd]||[]).filter(hasPhoto)[3];if(f)imgs.push(f.image)})}
      s.querySelector('.collage').innerHTML=imgs.map(function(u){return '<div class="cimg"><img src="'+esc(u)+'" alt="" referrerpolicy="no-referrer"></div>'}).join('');
    });
    var sl=$('slides'),dots=$('dots'),idx=0,n=slides.length,timer;
    dots.innerHTML=Array.prototype.map.call(slides,function(s,i){return '<button type="button" aria-label="Go to slide '+(i+1)+'"></button>'}).join('');
    function go(i){idx=(i+n)%n;sl.scrollTo({left:idx*sl.clientWidth,behavior:'smooth'});mark()}
    function mark(){Array.prototype.forEach.call(dots.children,function(b,i){b.setAttribute('aria-current',i===idx?'true':'false')})}
    sl.addEventListener('scroll',function(){var i=Math.round(sl.scrollLeft/sl.clientWidth);if(i!==idx){idx=i;mark()}});
    dots.addEventListener('click',function(e){var i=Array.prototype.indexOf.call(dots.children,e.target);if(i>=0)go(i)});
    $('bprev').addEventListener('click',function(){go(idx-1)});
    $('bnext').addEventListener('click',function(){go(idx+1)});
    $('banner').addEventListener('keydown',function(e){if(e.key==='ArrowRight')go(idx+1);if(e.key==='ArrowLeft')go(idx-1)});
    mark();
    if(!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)){
      timer=setInterval(function(){go(idx+1)},6000);
      $('banner').addEventListener('mouseenter',function(){clearInterval(timer)});
    }
  }
})();
