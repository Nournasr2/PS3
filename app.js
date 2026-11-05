let games=[];
const $=id=>document.getElementById(id);
const grid=$('gamesGrid'), search=$('searchInput'), genre=$('genreFilter'), source=$('sourceFilter'), sort=$('sortFilter');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const coverRequested=new Set();
function coverSearchUrl(title){
  return 'https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch='+encodeURIComponent(title+' video game')+
    '&gsrlimit=1&prop=pageimages&piprop=thumbnail&pithumbsize=440&format=json&origin=*';
}
async function tryCover(card, title){
  if(coverRequested.has(title))return;
  coverRequested.add(title);
  try{
    const response=await fetch(coverSearchUrl(title));
    if(!response.ok)return;
    const data=await response.json();
    const page=Object.values(data.query?.pages||{})[0];
    const imageUrl=page?.thumbnail?.source;
    if(!imageUrl||!card.isConnected)return;
    const img=new Image();img.alt='صورة توضيحية للعبة '+title;img.loading='lazy';
    img.onload=()=>{
      if(!card.isConnected)return;
      const cover=card.querySelector('.cover');
      cover.classList.remove('fallback');
      cover.replaceChildren(img,Object.assign(document.createElement('small'),{textContent:'RABI3 · PS3'}));
    };
    img.src=imageUrl;
  }catch(_){/* Keep the branded title cover when no image can be loaded. */}
}
function observeCovers(){
  const cards=[...grid.querySelectorAll('.game-card')];
  if(!('IntersectionObserver'in window)){cards.slice(0,10).forEach(c=>tryCover(c,c.dataset.title));return;}
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){observer.unobserve(entry.target);tryCover(entry.target,entry.target.dataset.title);}
    });
  },{rootMargin:'260px'});
  cards.forEach(card=>observer.observe(card));
}
function openGame(title){
  const game=games.find(g=>g.title===title);if(!game)return;
  $('modalTitle').textContent=game.title;
  $('modalGenre').textContent=game.genre;
  $('modalDescription').textContent=game.source==='requested_addition'
    ? game.note
    : 'عنوان ضمن مكتبة ألعاب PlayStation 3 التي تم حصرها من الفيديو.';
  $('modalArt').textContent=game.title;
  $('gameModal').classList.add('open');$('gameModal').setAttribute('aria-hidden','false');
  document.body.classList.add('modal-open');$('modalClose').focus();
}
function closeGame(){
  $('gameModal').classList.remove('open');$('gameModal').setAttribute('aria-hidden','true');
  document.body.classList.remove('modal-open');
}
document.querySelectorAll('[data-close]').forEach(el=>el.addEventListener('click',closeGame));
document.addEventListener('keydown',e=>{
  if(e.key==='Escape')closeGame();
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();search.focus();}
});
function render(){
  const q=search.value.trim().toLocaleLowerCase(), g=genre.value, s=source.value;
  let list=games.filter(game=>
    (!q||game.title.toLocaleLowerCase().includes(q)||game.genre.toLocaleLowerCase().includes(q))&&
    (!g||game.genre===g)&&(!s||game.source===s)
  );
  list.sort((a,b)=>a.title.localeCompare(b.title,'en'));
  if(sort.value==='za')list.reverse();
  $('totalCount').textContent=games.length;
  $('resultLabel').textContent=`عرض ${list.length} من ${games.length} لعبة`;
  $('emptyState').hidden=list.length!==0;
  grid.innerHTML=list.map(game=>`
    <article class="game-card" tabindex="0" role="button" aria-label="تفاصيل ${esc(game.title)}" data-title="${esc(game.title)}">
      <div class="cover fallback"><b>${esc(game.title)}</b><small>RABI3 · PS3</small></div>
      <div class="game-meta"><h3>${esc(game.title)}</h3><span class="genre-pill">${esc(game.genre)}</span>
      ${game.source==='requested_addition'?'<span class="patch-label">PATCH</span>':''}</div>
    </article>`).join('');
  grid.querySelectorAll('.game-card').forEach(card=>{
    const title=card.dataset.title;
    card.addEventListener('click',()=>openGame(title));
    card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openGame(title);}});
  });
  observeCovers();
}
[search,genre,source,sort].forEach(el=>el.addEventListener('input',render));
$('resetFilters').addEventListener('click',()=>{
  search.value='';genre.value='';source.value='';sort.value='az';render();search.focus();
});
fetch('games.json').then(r=>{if(!r.ok)throw Error('games.json missing');return r.json();}).then(data=>{
  const unique=new Map();
  data.forEach(g=>{const key=g.title.trim().toLocaleLowerCase();if(!unique.has(key))unique.set(key,g);});
  games=[...unique.values()];
  const videoGames=games.filter(g=>g.source==='video').length;
  $('videoCount').textContent=videoGames;
  $('patchCount').textContent=games.filter(g=>g.source==='requested_addition').length;
  const genres=[...new Set(games.map(g=>g.genre))].sort((a,b)=>a.localeCompare(b,'ar'));
  $('genreCount').textContent=genres.length;
  genres.forEach(value=>{const option=document.createElement('option');option.value=value;option.textContent=value;genre.append(option);});
  render();
}).catch(()=>{
  grid.innerHTML='<div class="loading">تعذر تحميل قائمة الألعاب. تأكد من رفع games.json بجوار index.html.</div>';
});
