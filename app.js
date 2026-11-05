let games=[];
const selected=new Set();
const $=id=>document.getElementById(id);
const grid=$('gamesGrid'), search=$('searchInput'), genre=$('genreFilter'), source=$('sourceFilter'), sort=$('sortFilter');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const coverRequested=new Set();
let visibleGames=[];
function coverSearchUrl(title){
  return 'https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch='+encodeURIComponent('"'+title+'" video game')+'&srlimit=5&format=json&origin=*';
}
async function tryCover(card,title){
  if(coverRequested.has(title))return; coverRequested.add(title);
  try{
    const r=await fetch(coverSearchUrl(title)); if(!r.ok)return;
    const data=await r.json(); const pages=data.query?.search||[];
    let imageUrl='';
    for(const page of pages){
      const q=await fetch('https://en.wikipedia.org/w/api.php?action=query&pageids='+page.pageid+'&prop=pageimages&piprop=thumbnail&pithumbsize=600&format=json&origin=*');
      if(!q.ok)continue; const j=await q.json();
      imageUrl=Object.values(j.query?.pages||{})[0]?.thumbnail?.source||'';
      if(imageUrl)break;
    }
    if(!imageUrl||!card.isConnected)return;
    const img=new Image();img.alt='غلاف '+title;img.loading='lazy';
    img.onload=()=>{if(!card.isConnected)return;const cover=card.querySelector('.cover');cover.classList.remove('fallback');cover.replaceChildren(img,Object.assign(document.createElement('small'),{textContent:'RABI3 · PS3'}));};
    img.onerror=()=>{};img.src=imageUrl;
  }catch(_){/* Keep the readable branded fallback if a source is unavailable. */}
}
function observeCovers(){
  const cards=[...grid.querySelectorAll('.game-card')];
  if(!('IntersectionObserver'in window)){cards.forEach(c=>tryCover(c,c.dataset.title));return;}
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){observer.unobserve(entry.target);tryCover(entry.target,entry.target.dataset.title);}}),{rootMargin:'350px'});
  cards.forEach(card=>observer.observe(card));
}
function copyText(text){
  if(!text){return;}
  if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(text).then(()=>toast('تم نسخ أسماء الألعاب')).catch(()=>fallbackCopy(text));}
  else fallbackCopy(text);
}
function fallbackCopy(text){const t=document.createElement('textarea');t.value=text;t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();try{document.execCommand('copy');toast('تم نسخ أسماء الألعاب');}catch(_){toast('تعذر النسخ تلقائيًا');}t.remove();}
let toastTimer;function toast(msg){let el=$('copyToast');if(!el){el=document.createElement('div');el.id='copyToast';el.className='copy-toast';document.body.appendChild(el);}el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1800);}
function updateSelectionUI(){
  const n=selected.size;$('selectedCount').textContent=n?`تم تحديد ${n} لعبة`:'لم يتم تحديد ألعاب';
  $('copySelected').disabled=n===0;$('clearSelection').disabled=n===0;
  const all=visibleGames.length>0&&visibleGames.every(g=>selected.has(g.title));
  $('selectAllVisible').checked=all;$('selectAllVisible').indeterminate=!all&&visibleGames.some(g=>selected.has(g.title));
  $('gamesGrid').querySelectorAll('.game-select').forEach(cb=>cb.checked=selected.has(cb.value));
}
function openGame(title){
  const game=games.find(g=>g.title===title);if(!game)return;
  $('modalTitle').textContent=game.title;$('modalGenre').textContent=game.genre;
  $('modalDescription').textContent=game.source==='requested_addition'?game.note:'عنوان ضمن مكتبة ألعاب PlayStation 3 التي تم حصرها من الفيديو.';
  $('modalArt').textContent=game.title;$('gameModal').classList.add('open');$('gameModal').setAttribute('aria-hidden','false');document.body.classList.add('modal-open');$('modalClose').focus();
}
function closeGame(){$('gameModal').classList.remove('open');$('gameModal').setAttribute('aria-hidden','true');document.body.classList.remove('modal-open');}
document.querySelectorAll('[data-close]').forEach(el=>el.addEventListener('click',closeGame));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeGame();if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();search.focus();}});
function render(){
  const q=search.value.trim().toLocaleLowerCase(),g=genre.value,s=source.value;
  let list=games.filter(game=>(!q||game.title.toLocaleLowerCase().includes(q)||game.genre.toLocaleLowerCase().includes(q))&&(!g||game.genre===g)&&(!s||game.source===s));
  list.sort((a,b)=>a.title.localeCompare(b.title,'en'));if(sort.value==='za')list.reverse();visibleGames=list;
  $('totalCount').textContent=games.length;$('resultLabel').textContent=`عرض ${list.length} من ${games.length} لعبة`;$('emptyState').hidden=list.length!==0;
  grid.innerHTML=list.map(game=>`<article class="game-card" data-title="${esc(game.title)}">
    <div class="cover fallback"><b>${esc(game.title)}</b><small>RABI3 · PS3</small></div>
    <div class="game-meta"><div class="game-title-row"><h3>${esc(game.title)}</h3><label class="game-check" title="تحديد اللعبة"><input class="game-select" type="checkbox" value="${esc(game.title)}" aria-label="تحديد ${esc(game.title)}"></label></div><span class="genre-pill">${esc(game.genre)}</span>${game.source==='requested_addition'?'<span class="patch-label">PATCH</span>':''}</div>
  </article>`).join('');
  grid.querySelectorAll('.game-card').forEach(card=>{
    const title=card.dataset.title;card.addEventListener('click',()=>openGame(title));
    const cb=card.querySelector('.game-select');cb.addEventListener('click',e=>e.stopPropagation());
    cb.addEventListener('change',e=>{if(e.target.checked)selected.add(title);else selected.delete(title);updateSelectionUI();});
  });
  observeCovers();updateSelectionUI();
}
[search,genre,source,sort].forEach(el=>el.addEventListener('input',render));
$('resetFilters').addEventListener('click',()=>{search.value='';genre.value='';source.value='';sort.value='az';render();search.focus();});
$('selectAllVisible').addEventListener('change',e=>{visibleGames.forEach(g=>e.target.checked?selected.add(g.title):selected.delete(g.title));updateSelectionUI();});
$('copySelected').addEventListener('click',()=>copyText(games.filter(g=>selected.has(g.title)).map(g=>g.title).join('\n')));
$('copyVisible').addEventListener('click',()=>copyText(visibleGames.map(g=>g.title).join('\n')));
$('clearSelection').addEventListener('click',()=>{selected.clear();updateSelectionUI();});
fetch('games.json').then(r=>{if(!r.ok)throw Error('games.json missing');return r.json();}).then(data=>{
  const unique=new Map();data.forEach(g=>{const key=g.title.trim().toLocaleLowerCase();if(!unique.has(key))unique.set(key,g);});games=[...unique.values()];
  $('videoCount').textContent=games.filter(g=>g.source==='video').length;$('patchCount').textContent=games.filter(g=>g.source==='requested_addition').length;
  const genres=[...new Set(games.map(g=>g.genre))].sort((a,b)=>a.localeCompare(b,'ar'));$('genreCount').textContent=genres.length;
  genres.forEach(value=>{const option=document.createElement('option');option.value=value;option.textContent=value;genre.append(option);});render();
}).catch(()=>{grid.innerHTML='<div class="loading">تعذر تحميل قائمة الألعاب. تأكد من رفع games.json بجوار index.html.</div>';});
