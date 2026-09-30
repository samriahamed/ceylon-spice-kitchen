(() => {
  const D = window.CSK_DATA;

  // ---------------------------------------------------------------------
  // Backend integration helpers
  // ---------------------------------------------------------------------
  const API = window.CSK_API_BASE || "http://localhost:3000/api";
  const authToken = () => localStorage.getItem('restaurant_auth_token');

  // Thin fetch wrapper: adds the JSON content type + auth header, and turns
  // a non-2xx response into a thrown Error carrying the server's message.
  async function apiFetch(path, options = {}) {
    const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    const token = authToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    let res;
    try {
      res = await fetch(`${API}${path}`, Object.assign({}, options, { headers }));
    } catch (networkErr) {
      const err = new Error('Could not reach the server. Please check your connection and try again.');
      err.status = 0;
      throw err;
    }
    let data = null;
    try { data = await res.json(); } catch { /* empty/non-JSON body */ }
    if (!res.ok) {
      const err = new Error((data && data.message) || `Request failed (${res.status})`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  // Fetches the live menu from the backend and merges it into D.foods
  // (the same array data.js populated) by id. Called once on startup.
  // If the backend is unreachable, D.foods simply keeps the data.js
  // fallback values already on screen — see section 33 of the project brief.
function syncMenuFromBackend() {
  apiFetch('/menu')
    .then((res) => {
      D.foods = (res.data || []).map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        description: item.description,
        fullDescription: item.fullDescription || item.description,
        image: item.image,
        price: item.price,
        rating: item.rating,
        prepTime: item.prepTime,
        spiceLevel: item.spiceLevel,
        ingredients: item.ingredients || [],
        popular: item.popular,
        available: item.available,
        customizable: item.customizable
      }));

      render();
    })
    .catch((err) => {
      console.error("Failed to load menu from database:", err);

      D.foods = [];

      render();

      if (typeof toast === "function") {
        toast(
          "Menu unavailable",
          "Could not load the menu from the database.",
          "error"
        );
      }
    });
}

// Fetches live add-ons from the backend database.
// SQLite is the single source of truth for add-on names and prices.
function syncAddonsFromBackend() {
  apiFetch('/menu/addons')
    .then((res) => {
      D.addons = (res.data || []).map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price
      }));

      render();
    })
    .catch((err) => {
      console.error("Failed to load add-ons from database:", err);

      D.addons = [];

      render();

      if (typeof toast === "function") {
        toast(
          "Add-ons unavailable",
          "Could not load add-ons from the database.",
          "error"
        );
      }
    });
}

  // Pulls the logged-in user's real order history from the backend and
  // merges it into the local restaurant_orders cache (which the My Orders
  // and Order Success pages already read from), then re-renders if the
  // person is currently looking at My Orders.
  function syncMyOrdersFromBackend() {
    const u = currentUser();
    if (!u || !authToken()) return;
    apiFetch('/orders/my')
      .then((res) => {
        const mapped = (res.data || []).map((o) => ({
          id: o.orderNumber, backendId: o.id, createdAt: o.createdAt,
          customer: { name: u.name, email: u.email, phone: u.phone },
          orderType: o.orderType, address: o.address, city: o.city, note: o.note,
          paymentMethod: o.paymentMethod,
          items: o.items.map((i) => ({
            foodId: i.foodId, name: i.name, unitPrice: i.unitPrice,
            quantity: i.quantity, spice: i.spiceLevel, addons: i.addons
          })),
          subtotal: o.subtotal, deliveryFee: o.deliveryFee, discount: o.discount,
          total: o.total, status: o.status, etaMinutes: o.orderType === 'Delivery' ? 45 : 25
        }));
        const others = orders().filter((x) => x.customer?.email !== u.email);
        setJSON('restaurant_orders', [...others, ...mapped]);
        if (parseRoute().path === '/my-orders') render();
      })
      .catch(() => { /* offline: keep whatever's already cached locally */ });
  }
  const $ =(sel, root=document) => root.querySelector(sel);
  const $$ =(sel, root=document) =>[...root.querySelectorAll(sel)];
  const escapeHtml =(s='') => String(s).replace(/[&<>'"]/g, c =>( {
    '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;'
  }
  [c]));
  const money = n => `LKR ${Number(n||0).toLocaleString('en-LK')}`;
  const getJSON =(k, fallback) => {
    try {
      const v=localStorage.getItem(k);
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  };
  const setJSON =(k, v) => localStorage.setItem(k, JSON.stringify(v));
  const uid = p => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
  const currentUser =() => getJSON('restaurant_current_user', null);
  const cart =() => getJSON('restaurant_cart', []);
  const users =() => getJSON('restaurant_users', []);
  const orders =() => getJSON('restaurant_orders', []);
  const totals =(subtotal, delivery) => {
    const deliveryFee = !delivery || !subtotal || subtotal >= D.FREE_DELIVERY_THRESHOLD ? 0 : D.DELIVERY_FEE;
    const discount = subtotal >= D.DISCOUNT_THRESHOLD ? Math.round(subtotal * D.DISCOUNT_RATE) : 0;
    return {
      subtotal, deliveryFee, discount, total: Math.max(0, subtotal+deliveryFee-discount)
    };
  };
  const stars = n => `<span class="stars">${'★'.repeat(Math.round(n))}${'☆'.repeat(Math.max(0,5-Math.round(n)))}</span>`;
  const icon = name =>( {
    menu:'☰', search:'⌕', cart:'🛒', user:'◉', clock:'◷', pin:'●', phone:'☎', mail:'✉', leaf:'✦', truck:'➜', bag:'▣', home:'⌂', heart:'♥', spark:'✦', check:'✓', close:'×', arrow:'→'
  }
  [name] || '•');
  const formatDate = iso => new Date(iso).toLocaleDateString('en-LK', {
    day:'2-digit', month:'short', year:'numeric'
  });
  let state = {
    toastTimer:null, mobileOpen:false, userMenuOpen:false, searchQuery:'', menu: {
      search:'', category:'All', price:'All', sort:'Recommended'
    }
  };
  function navigate(path) {
    location.hash = path.startsWith('#') ? path : `#${path}`;
  }
  function parseRoute() {
    let raw = location.hash.replace(/^#/, '') || '/';
    if(!raw.startsWith('/')) raw='/'+raw;
    const[pathAndQuery, queryString=''] = raw.split('?');
    const parts = pathAndQuery.split('/').filter(Boolean);
    const query = new URLSearchParams(queryString);
    return {
      raw, path:pathAndQuery||'/', parts, query
    };
  }
  function toast(title, message='', type='success') {
    const root = document.getElementById('toast-root');
    if(!root) return;
    let stack = $('#toast-stack', root);
    if(!stack) {
      root.innerHTML='<div id="toast-stack" class="toast-stack"></div>';
      stack=$('#toast-stack', root);
    }
    const el=document.createElement('div');
    el.className=`toast ${type==='error'?'error':type==='info'?'info':''}`;
    el.innerHTML=`<div><strong>${escapeHtml(title)}</strong>${message?`<span>${escapeHtml(message)}</span>`:''}</div>`;
    stack.appendChild(el);
    setTimeout(()=>el.remove(), 3400);
  }
  function nav() {
    const route=parseRoute(), p=route.path;
    const u=currentUser(), count=cart().reduce((a, i)=>a+i.quantity, 0);
    return `<header class="site-header">
      <div class="container navbar">
        <a href="#/" class="brand" aria-label="Ceylon Spice Kitchen home"><img class="brand-logo" src="assets/ceylon-spice-kitchen-logo.png" alt="Ceylon Spice Kitchen logo"><span class="brand-copy"><span class="brand-name">Ceylon Spice Kitchen</span><span class="brand-tag">A Taste of Sri Lanka, Made with Love.</span></span></a>
        <nav class="nav-links" aria-label="Main navigation">
          ${[['/','Home'],['/menu','Menu'],['/about','About'],['/services','Services'],['/contact','Contact']].map(([href,label])=>`<a href="#${href}" class="${(p==='/'?href==='/':p.startsWith(href)&&href!=='/')?'active':''}">${label}</a>`).join('')}
        </nav>
        <div class="nav-actions">
          <a class="icon-btn search-desktop" href="#/menu" title="Search the menu">${icon('search')}</a>
          <a class="icon-btn cart-btn" href="#/cart" aria-label="Cart">${icon('cart')}${count?`<span class="badge">${count}</span>`:''}</a>
          ${u?`<div class="user-menu"><button class="user-trigger" id="user-trigger"><span class="avatar">${escapeHtml(u.name.charAt(0).toUpperCase())}</span><span>${escapeHtml(u.name.split(' ')[0])}</span>⌄</button><div class="dropdown ${state.userMenuOpen?'open':''}" id="user-dropdown"><div class="head"><strong>${escapeHtml(u.name)}</strong><span>${escapeHtml(u.email)}</span></div><a href="#/my-orders">My Orders</a><button data-action="logout">Logout</button></div></div>`:
          `<div class="auth-desktop" style="display:flex;gap:4px"><a class="btn btn-secondary small" href="#/login">Login</a><a class="btn btn-primary small" href="#/signup">Sign Up</a></div>`}
          <button class="mobile-toggle" id="mobile-toggle" aria-expanded="${state.mobileOpen}">${state.mobileOpen?icon('close'):icon('menu')}</button>
        </div>
      </div>
      <div class="container mobile-menu ${state.mobileOpen?'open':''}" id="mobile-menu">
        ${[['/','Home'],['/menu','Menu'],['/about','About'],['/services','Services'],['/contact','Contact']].map(([href,label])=>`<a href="#${href}">${label}</a>`).join('')}
        <a href="#/cart" class="mobile-cart">Cart (${count})</a>
        ${u?`<a href="#/my-orders">My Orders</a><button data-action="logout">Logout</button>`:`<a href="#/login">Login</a><a href="#/signup">Sign Up</a>`}
      </div>
    </header>`;
  }
  function footer() {
    return `<footer class="footer"><div class="container">
      <div class="footer-grid">
        <div><h3>Ceylon Spice Kitchen</h3><p>${escapeHtml(D.restaurant.shortDescription)}</p><div class="socials"><a href="#/contact" aria-label="Instagram">ig</a><a href="#/contact" aria-label="Facebook">f</a><a href="#/contact" aria-label="WhatsApp">wa</a></div></div>
        <div><h3>Explore</h3><ul><li><a href="#/menu">Menu</a></li><li><a href="#/about">Our Story</a></li><li><a href="#/services">Services</a></li><li><a href="#/contact">Contact</a></li></ul></div>
        <div><h3>Hours</h3><ul>${D.restaurant.hours.map(h=>`<li>${escapeHtml(h.days)}<br>${escapeHtml(h.time)}</li>`).join('')}</ul></div>
        <div><h3>Visit</h3><p>${escapeHtml(D.restaurant.address.line1)}<br>${escapeHtml(D.restaurant.address.line2)}<br>${escapeHtml(D.restaurant.address.country)}</p><p>${escapeHtml(D.restaurant.phone)}<br>${escapeHtml(D.restaurant.email)}</p></div>
      </div>
      <div class="footer-bottom"><span>© 2026 Ceylon Spice Kitchen. Frontend project.</span><span>Authentic flavours • Fair prices • Friendly service</span></div>
    </div></footer>`;
  }
  function shell(content) {
    document.getElementById('app').innerHTML = nav()+`<main>${content}</main>`+footer();
    bindCommon();
    window.scrollTo(0, 0);
  }
  function bindCommon() {
    $('#mobile-toggle')?.addEventListener('click', ()=> {
      state.mobileOpen=!state.mobileOpen;
      render();
    });
    $('#user-trigger')?.addEventListener('click', ()=> {
      state.userMenuOpen=!state.userMenuOpen;
      render();
    });
    $$('[data-action="logout"]').forEach(b=>b.addEventListener('click', ()=> {
      localStorage.removeItem('restaurant_current_user');
      localStorage.removeItem('restaurant_auth_token');
      state.userMenuOpen=false;
      state.mobileOpen=false;
      toast('Logged out', 'Your session has ended.', 'info');
      navigate('/');
    }));
  }
  function bindImageFallbacks() {
    $$('img').forEach(img=> {
      if(img.dataset.fallbackBound) return;
      img.dataset.fallbackBound='1';
      img.addEventListener('error', ()=> {
        if(img.dataset.fallbackApplied) return;
        img.dataset.fallbackApplied='1';
        img.src='data:image/svg+xml;charset=UTF-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600"><rect width="900" height="600" fill="#f7efe2"/><text x="450" y="300" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="28" fill="#1f5c42">Ceylon Spice Kitchen</text></svg>');
      });
    });
  }
  function bindHeroSlider() {
    const img=$('[data-hero-slider]');
    if(!img) return;
    const dots=$$('[data-hero-dot]');
    const slides=[D.brandImages.hero, D.brandImages.familyFeast, D.brandImages.interior, D.brandImages.delivery, D.brandImages.dineIn];
    let index=0;
    const setSlide=(next)=> {
      index=(next+slides.length)%slides.length;
      img.style.opacity='0.25';
      setTimeout(()=> {
        img.src=slides[index];
        img.style.opacity='1';
      }, 160);
      dots.forEach((d, i)=>d.classList.toggle('active', i===index));
    };
    dots.forEach((d, i)=>d.addEventListener('click', ()=>setSlide(i)));
    clearInterval(window.CSKHeroSliderTimer);
    window.CSKHeroSliderTimer=setInterval(()=>setSlide(index+1), 5000);
  }
  function home() {
    const popular=D.foods.filter(f=>f.popular).slice(0, 6);
    return `<section class="hero"><div class="container hero-grid"><div class="hero-copy reveal"><div class="eyebrow">Sri Lankan casual dining</div><h1>Bold island flavours.<br><span style="color:var(--terracotta)">Made for every day.</span></h1><p>${escapeHtml(D.restaurant.shortDescription)} Expect honest portions, fresh curries and modern favourites at friendly LKR prices.</p><div class="hero-actions"><a class="btn btn-primary" href="#/menu">Explore Menu ${icon('arrow')}</a><a class="btn btn-secondary" href="#/menu?category=Rice%20%26%20Curry">Order Now</a></div></div><div class="hero-image reveal"><img data-hero-slider src="${D.brandImages.hero}" alt="Sri Lankan food at Ceylon Spice Kitchen"><div class="hero-slider-controls" aria-label="Hero image slideshow"><button class="hero-slider-dot active" type="button" data-hero-dot aria-label="Show slide 1"></button><button class="hero-slider-dot" type="button" data-hero-dot aria-label="Show slide 2"></button><button class="hero-slider-dot" type="button" data-hero-dot aria-label="Show slide 3"></button><button class="hero-slider-dot" type="button" data-hero-dot aria-label="Show slide 4"></button><button class="hero-slider-dot" type="button" data-hero-dot aria-label="Show slide 5"></button></div><div class="hero-sticker"><strong>Family weekend favourite</strong><span>15% off selected family meals every Saturday & Sunday.</span></div></div></div></section>
    <section class="section-tight"><div class="container"><div class="section-head"><div class="copy"><div class="eyebrow">Popular this week</div><h2>Good food, no guessing.</h2><p>Our most-loved plates are built around familiar Sri Lankan flavours and easy-going comfort.</p></div><a class="btn btn-secondary small" href="#/menu">View all dishes ${icon('arrow')}</a></div><div class="grid grid-3">${popular.map(foodCard).join('')}</div></div></section>
    <section class="section-alt"><div class="container"><div class="section-head"><div class="copy"><div class="eyebrow">Browse by category</div><h2>What are you craving?</h2><p>From kottu to hoppers, seafood to desserts, choose a lane and build your order.</p></div></div><div class="grid grid-5">${D.categoryCards.map(c=>`<a class="category-card" href="#/menu?category=${encodeURIComponent(c.name)}"><img src="${c.image}" alt="${escapeHtml(c.name)}"><div class="overlay"><h3>${escapeHtml(c.name)}</h3><p>${escapeHtml(c.blurb)}</p></div></a>`).join('')}</div></div></section>
    <section class="offer"><div class="container offer-grid"><div class="offer-copy"><div class="eyebrow" style="color:#efd49e">Weekend offer</div><h2>Family feast, made easy.</h2><p>Enjoy selected family meals with 15% off every Saturday and Sunday. Order a large plate of rice and curry, a few kottus and a round of drinks without turning dinner into a planning exercise.</p><div class="page-actions"><a class="btn btn-secondary" href="#/menu?category=Rice%20%26%20Curry">Order the feast</a><a class="btn btn-ghost" href="#/services">See our services</a></div></div><div class="offer-media"><img src="${D.brandImages.familyFeast}" alt="Family feast at the restaurant"></div></div></section>
    <section><div class="container"><div class="section-head"><div class="copy"><div class="eyebrow">Why families choose us</div><h2>Simple, thoughtful, consistent.</h2></div></div><div class="grid grid-4">${[['✦','Fresh ingredients','Prepared in small batches with ingredients we would serve at home.'],['◒','Authentic flavours','Roasted spices, coconut, curry leaves and sambols that keep the island taste alive.'],['➜','Fast delivery','Short local delivery runs across Nugegoda and nearby suburbs.'],['LKR','Fair prices','Comforting portions without the five-star price tag.']].map(([i,t,p])=>`<div class="card feature-card"><div class="feature-icon">${i}</div><h3>${t}</h3><p>${p}</p></div>`).join('')}</div></div></section>
    <section class="section-alt"><div class="container story-grid"><img src="${D.brandImages.interior}" alt="Ceylon Spice Kitchen interior"><div class="story-copy"><div class="eyebrow">From a two-table kitchen to a neighbourhood favourite</div><h2>Our story</h2><p>What started as a tiny family-inspired kitchen grew because people kept coming back for the curry, the kottu and the feeling that somebody cared about the plate in front of them. Today we keep that same spirit while making ordering easier online.</p><p>We cook for weekday lunches, family dinners, quick takeaways and the occasional “let’s just get one more kottu.”</p><a class="btn btn-primary" href="#/about">Meet our chefs ${icon('arrow')}</a></div></div></section>
    <section><div class="container"><div class="section-head"><div class="copy"><div class="eyebrow">Four ways to eat with us</div><h2>Choose what works for you.</h2></div><a class="btn btn-secondary small" href="#/services">All services</a></div><div class="grid grid-4">${[['▣','Online ordering','Build an order from any device and keep your cart saved.'],['➜','Home delivery','Fast local delivery within 6 km, with free delivery above LKR 5,000.'],['◍','Takeaway','Order ahead and collect at the counter with less waiting.'],['⌂','Dine-in','Sit down for a relaxed meal in our neighbourhood space.']].map(([i,t,p])=>`<div class="card service-card"><div class="feature-icon">${i}</div><h3>${t}</h3><p>${p}</p><a href="#/services" style="font-size:12px;font-weight:800;color:var(--forest)">Learn more ${icon('arrow')}</a></div>`).join('')}</div></div></section>
    <section class="section-alt"><div class="container"><div class="section-head"><div class="copy"><div class="eyebrow">What our guests say</div><h2>Comfort food with regulars.</h2><p>Reviews from dine-in guests and delivery customers around Colombo.</p></div></div><div class="grid grid-4">${D.testimonials.map(t=>`<article class="card testimonial"><div class="quote">“</div><div>${stars(t.rating)}</div><p>${escapeHtml(t.review)}</p><div class="person"><div class="initials">${escapeHtml(t.initials)}</div><div><strong>${escapeHtml(t.name)}</strong><span>${escapeHtml(t.location)} • ${escapeHtml(t.dish)}</span></div></div></article>`).join('')}</div></div></section>
    <section><div class="container"><div class="newsletter"><div class="newsletter-copy"><div class="eyebrow">Stay in the loop</div><h2 style="font-size:30px">Fresh offers, not spam.</h2><p>Get occasional updates about new dishes, weekend specials and local delivery promos.</p></div><form class="newsletter-form" id="newsletter-form"><input class="input" type="email" name="email" placeholder="you@example.com" required><button class="btn btn-primary" type="submit">Subscribe</button></form></div></div></section>`;
  }
  function foodCard(f) {
    return `<article class="card food-card" data-food-card="${escapeHtml(f.id)}"><div class="img-wrap"><img class="food-img" src="${f.image}" alt="${escapeHtml(f.name)}">${f.popular?'<span class="popular-tag">Popular</span>':''}</div><div class="food-body"><div class="food-top"><a class="food-name" href="#/menu/${f.id}">${escapeHtml(f.name)}</a><span class="food-price">${money(f.price)}</span></div><div class="meta-row"><span>${stars(f.rating)}</span><span>${f.rating.toFixed(1)}</span><span>•</span><span>${f.prepTime} min</span></div><p class="food-desc">${escapeHtml(f.description)}</p><div class="food-actions"><a class="btn btn-secondary small" href="#/menu/${f.id}">View Details</a><button class="btn btn-primary small" data-add="${f.id}">Add to Cart</button></div></div></article>`;
  }
  function menu() {
    const route=parseRoute();
    if(route.query.has('search')) state.menu.search=route.query.get('search')||'';
    if(route.query.has('category')) state.menu.category=route.query.get('category')||'All';
    const renderGrid =() => {
      let list=D.foods.filter(f=>f.available);
      const s=state.menu.search.trim().toLowerCase();
      if(s) list=list.filter(f=>`${f.name} ${f.category} ${f.description}`.toLowerCase().includes(s));
      if(state.menu.category!=='All') list=list.filter(f=>f.category===state.menu.category);
      if(state.menu.price==='Under LKR 750') list=list.filter(f=>f.price<750);
      if(state.menu.price==='LKR 750–1,250') list=list.filter(f=>f.price>=750&&f.price<=1250);
      if(state.menu.price==='LKR 1,250–1,750') list=list.filter(f=>f.price>1250&&f.price<=1750);
      if(state.menu.price==='Above LKR 1,750') list=list.filter(f=>f.price>1750);
      if(state.menu.sort==='Price: Low to High') list.sort((a, b)=>a.price-b.price);
      if(state.menu.sort==='Price: High to Low') list.sort((a, b)=>b.price-a.price);
      if(state.menu.sort==='Rating: High to Low') list.sort((a, b)=>b.rating-a.rating);
      if(state.menu.sort==='Name: A–Z') list.sort((a, b)=>a.name.localeCompare(b.name));
      return {
        list, total:D.foods.filter(f=>f.available).length
      };
    };
    const {
      list, total
    }
    =renderGrid();
    return `<section class="page-hero"><div class="container"><div class="crumbs"><a href="#/">Home</a> / Menu</div><div class="eyebrow" style="color:#e5c994">Everyday favourites</div><h1>Our Menu</h1><p>Traditional Sri Lankan plates, wok-fried comfort food and easy modern favourites. Every price is in LKR and every card leads somewhere useful.</p></div></section>
      <div class="menu-toolbar"><div class="container"><div class="toolbar-row"><div class="searchbox"><span class="search-icon">${icon('search')}</span><input class="input" id="menu-search" value="${escapeHtml(state.menu.search)}" placeholder="Search dishes, categories or ingredients…" aria-label="Search menu"></div><select class="select" id="menu-price"><option>All Prices</option><option ${state.menu.price==='Under LKR 750'?'selected':''}>Under LKR 750</option><option ${state.menu.price==='LKR 750–1,250'?'selected':''}>LKR 750–1,250</option><option ${state.menu.price==='LKR 1,250–1,750'?'selected':''}>LKR 1,250–1,750</option><option ${state.menu.price==='Above LKR 1,750'?'selected':''}>Above LKR 1,750</option></select><select class="select" id="menu-sort"><option ${state.menu.sort==='Recommended'?'selected':''}>Recommended</option><option>Price: Low to High</option><option>Price: High to Low</option><option>Rating: High to Low</option><option>Name: A–Z</option></select><button class="btn btn-secondary small" id="clear-filters">Clear Filters</button></div><div class="filters-mobile"><div class="category-strip">${['All',...D.categories].map(c=>`<button class="chip ${state.menu.category===c?'active':''}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('')}</div></div></div></div>
      <section class="section-tight"><div class="container"><div class="section-head"><div class="copy"><div class="eyebrow">${state.menu.category==='All'?'All categories':escapeHtml(state.menu.category)}</div><h2>Find your plate.</h2><p id="results-copy">Showing ${list.length} of ${total} dishes.</p></div></div><div id="menu-grid" class="grid grid-3">${list.length?list.map(foodCard).join(''):`<div class="empty-state card" style="grid-column:1/-1"><div class="empty-icon">⌕</div><h3>No dishes found</h3><p>Try another search or clear the filters to see the full menu again.</p><button class="btn btn-primary" id="clear-filters-empty">Clear Filters</button></div>`}</div></div></section>`;
  }
  function details(id) {
    const f=D.foods.find(x=>x.id===id);
    if(!f) return notFound();
    const related=D.foods.filter(x=>x.category===f.category&&x.id!==f.id).slice(0, 4);
    const additions = f.customizable ? (D.addons || []) : [];
    return `<section class="section"><div class="container"><div class="crumbs" style="color:var(--muted)"><a href="#/">Home</a> / <a href="#/menu">Menu</a> / ${escapeHtml(f.name)}</div><div class="details-grid" style="margin-top:20px"><div><img class="details-image" src="${f.image}" alt="${escapeHtml(f.name)}"></div><div class="details-panel"><div class="eyebrow">${escapeHtml(f.category)}</div><h1>${escapeHtml(f.name)}</h1><div class="details-price">${money(f.price)}</div><div class="detail-meta"><span class="chip">${stars(f.rating)} ${f.rating.toFixed(1)}</span><span class="chip">${f.prepTime} min prep</span><span class="chip">${escapeHtml(f.spiceLevel)} spice</span><span class="chip">${f.available?'Available':'Unavailable'}</span></div><p class="lead">${escapeHtml(f.fullDescription)}</p><div class="detail-block"><strong>Ingredients</strong><div class="ingredients">${f.ingredients.map(x=>`<span class="chip">${escapeHtml(x)}</span>`).join('')}</div></div>${f.customizable?`<div class="detail-block custom-box"><strong>Customize your plate</strong><div style="margin-top:12px"><div style="font-size:12px;font-weight:800">Spice level</div><div class="radio-row">${['Mild','Medium','Spicy'].map((v,i)=>`<label><input type="radio" name="spice" value="${v}" ${v===f.spiceLevel?'checked':''}> ${v}</label>`).join('')}</div><div style="font-size:12px;font-weight:800;margin-top:14px">Add-ons</div>${additions.map(a=>`<div class="check-row"><label><input type="checkbox" data-addon="${a.id}" data-price="${a.price}" data-name="${escapeHtml(a.name)}"> ${escapeHtml(a.name)} <span style="color:var(--terracotta-dark);font-weight:800">+${money(a.price)}</span></label></div>`).join('')}</div></div>`:''}<div class="detail-block"><div style="display:flex;justify-content:space-between;align-items:center;gap:15px"><div><div style="font-size:12px;font-weight:800">Quantity</div><div class="qty" style="margin-top:8px"><button type="button" id="qty-minus">−</button><input id="detail-qty" value="1" inputmode="numeric" aria-label="Quantity"><button type="button" id="qty-plus">+</button></div></div><div style="text-align:right"><div style="font-size:11px;color:var(--muted)">Your price</div><div id="detail-total" style="font-family:'Playfair Display',serif;font-weight:800;color:var(--forest);font-size:28px">${money(f.price)}</div></div></div></div><div class="detail-actions"><button class="btn btn-secondary" id="add-detail">Add to Cart</button><button class="btn btn-primary" id="order-detail">Order Now ${icon('arrow')}</button></div></div></div></div></section><section class="section-alt section-tight"><div class="container"><div class="section-head"><div class="copy"><div class="eyebrow">Customers also like</div><h2>More from ${escapeHtml(f.category)}.</h2></div></div><div class="grid grid-4">${related.map(foodCard).join('')}</div></div></section>`;
  }
  function cartPage() {
    const items=cart();
    if(!items.length) return `<section class="section"><div class="container"><div class="empty-state"><div class="empty-icon">🛒</div><h1 style="font-size:42px">Your cart is empty.</h1><p>Start with a classic chicken kottu, a plate of rice and curry or something sweet. We’ll keep your cart safe while you browse.</p><a class="btn btn-primary" href="#/menu">Browse Menu ${icon('arrow')}</a><a class="btn btn-secondary" style="margin-left:8px" href="#/menu?category=Desserts">See Desserts</a></div></div></section>`;
    const rows=items.map(i=> {
      const f=D.foods.find(x=>x.id===i.foodId);
      const unit=i.unitPrice;
      return `<div class="cart-item"><img src="${f?.image||''}" alt="${escapeHtml(i.name)}"><div><h3>${escapeHtml(i.name)}</h3><div class="muted">${money(unit)} each${i.spice?` • ${escapeHtml(i.spice)}`:''}</div><button class="btn btn-danger small" style="margin-top:10px" data-remove-cart="${i.key}">Remove</button></div><div class="cart-controls"><div class="qty"><button data-cart-minus="${i.key}">−</button><input value="${i.quantity}" readonly aria-label="Quantity"><button data-cart-plus="${i.key}">+</button></div><div class="line-total">${money(unit*i.quantity)}</div></div></div>`
    }).join('');
    const subtotal=items.reduce((s, i)=>s+i.unitPrice*i.quantity, 0), t=totals(subtotal, true);
    return `<section class="page-hero"><div class="container"><div class="eyebrow" style="color:#e5c994">Ready when you are</div><h1>Your cart</h1><p>${items.reduce((a,i)=>a+i.quantity,0)} item${items.reduce((a,i)=>a+i.quantity,0)===1?'':'s'} selected. Delivery is ${money(D.DELIVERY_FEE)} within 6 km and free above ${money(D.FREE_DELIVERY_THRESHOLD)}.</p></div></section><section class="section-tight"><div class="container"><div class="cart-layout"><div><div class="cart-list">${rows}</div><div style="margin-top:15px"><button class="btn btn-secondary small" id="clear-cart">Clear Cart</button> <a class="btn btn-secondary small" href="#/menu">Continue Shopping</a></div></div><aside class="panel"><h2 style="font-size:27px">Order summary</h2><div class="summary-row"><span>Subtotal</span><strong>${money(t.subtotal)}</strong></div><div class="summary-row"><span>Delivery fee</span><strong>${t.deliveryFee?money(t.deliveryFee):'Free'}</strong></div><div class="summary-row"><span>Discount</span><strong>${t.discount?`−${money(t.discount)}`:'—'}</strong></div><div class="summary-row total"><span>Total</span><strong>${money(t.total)}</strong></div><div class="notice" style="margin-top:12px">${subtotal<D.MINIMUM_DELIVERY_ORDER?`Delivery orders start at ${money(D.MINIMUM_DELIVERY_ORDER)}. Choose pickup at checkout or add a little more.`:`Orders above ${money(D.DISCOUNT_THRESHOLD)} receive 10% off automatically.`}</div><a class="btn btn-primary btn-block" style="margin-top:14px" href="#/checkout">Proceed to Checkout ${icon('arrow')}</a></aside></div></div></section>`;
  }
  function checkout() {
    const items=cart();
    if(!items.length) return `<section class="section"><div class="container"><div class="empty-state"><div class="empty-icon">▣</div><h1 style="font-size:42px">Nothing to check out yet.</h1><p>Your cart is empty. Add a few favourites and come back here.</p><a class="btn btn-primary" href="#/menu">Browse Menu</a></div></div></section>`;
    const u=currentUser()|| {
    };
    return `<section class="page-hero"><div class="container"><div class="eyebrow" style="color:#e5c994">Almost there</div><h1>Checkout</h1><p>Confirm your details, choose delivery or pickup, and place a frontend demo order. No real card payment is processed.</p></div></section><section class="section-tight"><div class="container"><div class="checkout-layout"><form id="checkout-form" class="panel"><h2 style="font-size:27px">Customer details</h2><div class="form-grid" style="margin-top:18px"><div class="field"><label class="label">Full name</label><input class="input" name="name" value="${escapeHtml(u.name||'')}" placeholder="Kavindu Perera"><div class="error" data-error="name"></div></div><div class="field"><label class="label">Email</label><input class="input" name="email" type="email" value="${escapeHtml(u.email||'')}" placeholder="you@example.com"><div class="error" data-error="email"></div></div><div class="field"><label class="label">Phone number</label><input class="input" name="phone" placeholder="0771234567"><div class="error" data-error="phone"></div></div><div class="field"><label class="label">Order type</label><div class="radio-card selected"><input type="radio" name="orderType" value="Delivery" checked><div><strong>Home delivery</strong><small>Within 6 km. Delivery fee ${money(D.DELIVERY_FEE)}; free above ${money(D.FREE_DELIVERY_THRESHOLD)}.</small></div></div><div class="radio-card"><input type="radio" name="orderType" value="Pickup"><div><strong>Pickup</strong><small>Collect from the restaurant. We’ll have it ready in around 25 minutes.</small></div></div></div><div class="field full" id="address-fields"><label class="label">Delivery address</label><input class="input" name="address" placeholder="No. 45/2, Station Road, Apartment 3B"><div class="error" data-error="address"></div></div><div class="field" id="city-field"><label class="label">City</label><input class="input" name="city" placeholder="Nugegoda"><div class="error" data-error="city"></div></div><div class="field"><label class="label">Order note</label><input class="input" name="note" placeholder="Less chilli in the kottu, please."></div><div class="field full"><label class="label">Payment method</label><div class="radio-card selected"><input type="radio" name="payment" value="Cash on Delivery" checked><div><strong>Cash on Delivery</strong><small>Pay when your order arrives / is collected.</small></div></div><div class="radio-card"><input type="radio" name="payment" value="Card Demo"><div><strong>Card Payment — Demo</strong><small>Frontend demonstration only. No real transaction will be processed.</small></div></div></div></div><div class="notice warning" style="margin:4px 0 16px">Delivery orders must be at least ${money(D.MINIMUM_DELIVERY_ORDER)}. Pickup has no minimum.</div><button class="btn btn-primary btn-block" type="submit">Place Order ${icon('arrow')}</button></form><aside class="panel"><h2 style="font-size:27px">Order summary</h2><div style="margin-top:15px">${items.map(i=>`<div style="display:flex;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid var(--cream-2)"><img src="${D.foods.find(f=>f.id===i.foodId)?.image||''}" style="width:52px;height:45px;object-fit:cover;border-radius:10px"><div style="flex:1;min-width:0"><strong style="font-size:12px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(i.name)}</strong><span style="font-size:11px;color:var(--muted)">Qty ${i.quantity}</span></div><span style="font-weight:900;font-size:12px">${money(i.unitPrice*i.quantity)}</span></div>`).join('')}</div><div style="margin-top:10px"><div class="summary-row"><span>Subtotal</span><strong id="checkout-subtotal">${money(items.reduce((s,i)=>s+i.unitPrice*i.quantity,0))}</strong></div><div class="summary-row"><span>Delivery fee</span><strong id="checkout-delivery">${money(D.DELIVERY_FEE)}</strong></div><div class="summary-row"><span>Discount</span><strong id="checkout-discount">—</strong></div><div class="summary-row total"><span>Total</span><strong id="checkout-total">${money(totals(items.reduce((s,i)=>s+i.unitPrice*i.quantity,0),true).total)}</strong></div></div><div class="notice" style="margin-top:12px">Free delivery above ${money(D.FREE_DELIVERY_THRESHOLD)} • 10% off above ${money(D.DISCOUNT_THRESHOLD)}.</div></aside></div></div></section>`;
  }
  function login() {
    return `<section class="section"><div class="container" style="max-width:520px"><div class="panel"><div class="eyebrow">Customer account</div><h1 style="font-size:42px">Welcome back</h1><p class="lead">Login to see previous orders, keep your details handy and reorder your favourites faster.</p><form id="login-form" style="margin-top:22px"><div class="field"><label class="label">Email</label><input class="input" name="email" type="email" placeholder="you@example.com"><div class="error" data-error="email"></div></div><div class="field"><label class="label">Password</label><div style="display:flex;gap:8px"><input class="input" style="flex:1" name="password" type="password" placeholder="Your password"><button type="button" class="btn btn-secondary small" id="toggle-login-password">Show</button></div><div class="error" data-error="password"></div></div><label style="font-size:12px;display:flex;gap:8px;align-items:center"><input type="checkbox" name="remember"> Remember me</label><button class="btn btn-primary btn-block" style="margin-top:18px" type="submit">Login</button></form><div style="margin-top:16px;text-align:center;font-size:12px;color:var(--muted)">Don’t have an account? <a href="#/signup" style="color:var(--forest);font-weight:800">Create one</a></div>
</div></div></section>`;
  }
  function signup() {
    return `<section class="section"><div class="container" style="max-width:650px"><div class="panel"><div class="eyebrow">Customer account</div><h1 style="font-size:42px">Create your account</h1><p class="lead">Save your details and make repeat orders easier.</p><form id="signup-form" style="margin-top:22px"><div class="form-grid"><div class="field"><label class="label">Full name</label><input class="input" name="name" placeholder="Kavindu Perera"><div class="error" data-error="name"></div></div><div class="field"><label class="label">Email</label><input class="input" name="email" type="email" placeholder="you@example.com"><div class="error" data-error="email"></div></div><div class="field"><label class="label">Phone number</label><input class="input" name="phone" placeholder="0771234567"><div class="error" data-error="phone"></div></div><div class="field"><label class="label">Password</label><input class="input" name="password" type="password" placeholder="At least 6 characters"><div class="error" data-error="password"></div></div><div class="field full"><label class="label">Confirm password</label><input class="input" name="confirm" type="password" placeholder="Repeat your password"><div class="error" data-error="confirm"></div></div></div><label style="font-size:12px;display:flex;gap:8px;align-items:flex-start"><input type="checkbox" name="terms" style="margin-top:2px"> I agree to the terms and understand this is a frontend demo account.</label><div class="error" data-error="terms"></div><button class="btn btn-primary btn-block" style="margin-top:18px" type="submit">Create Account</button></form><div style="margin-top:16px;text-align:center;font-size:12px;color:var(--muted)">Already have an account? <a href="#/login" style="color:var(--forest);font-weight:800">Login</a></div></div></div></section>`;
  }
  function about() {
    const timeline=[['2018', 'Restaurant founded', 'A small family-inspired kitchen opened in Nugegoda with a tiny menu of rice and curry, kottu and hoppers.'], ['2020', 'Online ordering introduced', 'We added a simple digital ordering experience so local customers could order without calling.'], ['2023', 'Menu expanded', 'Burgers, pizzas, submarines and new dessert options joined the menu without losing our Sri Lankan core.'], ['2026', 'A neighbourhood favourite', 'A fuller online ordering system now connects dine-in, takeaway and delivery in one place.']];
    return `<section class="page-hero"><div class="container"><div class="eyebrow" style="color:#e5c994">Our story</div><h1>About Ceylon Spice Kitchen</h1><p>${escapeHtml(D.restaurant.tagline)} We blend familiar Sri Lankan cooking with a relaxed modern restaurant experience.</p></div></section><section class="section-tight"><div class="container"><div class="stat-grid">${D.restaurant.stats.map(s=>`<div class="stat"><strong>${escapeHtml(s.value)}</strong><span>${escapeHtml(s.label)}</span></div>`).join('')}</div></div></section><section><div class="container story-grid"><img src="${D.brandImages.interior}" alt="Restaurant interior"><div class="story-copy"><div class="eyebrow">How we began</div><h2>A little kitchen with a big appetite.</h2><p>Our restaurant is built around the idea that great food should feel generous, familiar and easy to share. The kitchen takes cues from home-style Sri Lankan cooking while leaving space for modern favourites that keep families and younger guests happy.</p><p>We still roast spice blends in-house, make sambols fresh and keep our menu priced for real everyday meals.</p></div></div></section><section class="section-alt"><div class="container"><div class="section-head"><div class="copy"><div class="eyebrow">How we grew</div><h2>A short history</h2></div></div><div class="timeline">${timeline.map(e=>`<div class="timeline-item"><div class="timeline-dot"></div><strong>${e[0]}</strong><h3>${e[1]}</h3><p>${e[2]}</p></div>`).join('')}</div></div></section><section><div class="container"><div class="section-head"><div class="copy"><div class="eyebrow">Meet the kitchen team</div><h2>Our chefs</h2><p>The people behind the curry pots, kottu blades and dessert counter.</p></div></div><div class="grid grid-3">${D.chefs.map(c=>`<article class="card chef-card"><img src="${c.image}" alt="${escapeHtml(c.name)}"><div class="chef-body"><div class="eyebrow">${escapeHtml(c.position)}</div><h3>${escapeHtml(c.name)}</h3><div class="chef-meta"><span>${escapeHtml(c.experience)}</span><span>•</span><span>${escapeHtml(c.specialty)}</span></div><p>${escapeHtml(c.bio)}</p><a class="btn btn-secondary small" href="#/menu/${c.signatureDishId}">Signature: ${escapeHtml(c.signatureDishName)}</a></div></article>`).join('')}</div></div></section><section class="section-alt"><div class="container"><div class="grid grid-3"><div class="card feature-card"><div class="feature-icon">✦</div><h3>Mission</h3><p>Serve delicious, authentic, affordable food while making every customer feel welcome.</p></div><div class="card feature-card"><div class="feature-icon">◎</div><h3>Vision</h3><p>Be a trusted modern destination for Sri Lankan flavours in the neighbourhood and online.</p></div><div class="card feature-card"><div class="feature-icon">♥</div><h3>Values</h3><p>Quality, authenticity, freshness, hospitality and fair pricing guide the kitchen every day.</p></div></div><div class="page-actions" style="margin-top:26px"><a class="btn btn-primary" href="#/menu">Explore the menu</a><a class="btn btn-secondary" href="#/services">Our services</a></div></div></section>`;
  }
  function services() {
    return `<section class="page-hero"><div class="container"><div class="eyebrow" style="color:#e5c994">How you can eat with us</div><h1>Our Services</h1><p>Choose dine-in, takeaway, delivery or online ordering. The same kitchen, the same food, different levels of convenience.</p><div class="page-actions"><a class="btn btn-secondary" href="#/menu">Start an order</a><a class="btn btn-ghost" href="#/contact">Ask a question</a></div></div></section><section><div class="container"><div class="grid grid-4">${[['▣','Online Ordering','Order in under two minutes from any device, with your cart saved even if you close the tab.',['Search, filter and sort the full menu','Customize spice level and add-ons','Order history saved for reordering']],['➜','Home Delivery','Our local delivery service keeps food close to the kitchen and gets orders to nearby suburbs fast.',['LKR 350 within 6 km','Free above LKR 5,000','Nugegoda and nearby suburbs']],['▤','Takeaway','Order ahead and collect at the counter — ideal for lunch runs and evening pickups.',['Ready in around 15–25 minutes','No delivery fee','Easy pickup window']],['◍','Dine-In','A relaxed neighbourhood setting for family dinners, casual lunches and quick plates.',['Indoor seating','Family-friendly','Fresh-to-order plates']],].map(([i,t,p,points])=>`<div class="card service-card"><div class="feature-icon">${i}</div><h3>${t}</h3><p>${p}</p><ul class="service-points">${points.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul><a class="btn btn-secondary small" href="#/${t==='Online Ordering'?'menu':t==='Home Delivery'?'contact':t==='Takeaway'?'menu':'contact'}">${t==='Online Ordering'?'Build an order':t==='Takeaway'?'Order for pickup':'View details'} ${icon('arrow')}</a></div>`).join('')}</div></div></section><section class="section-alt"><div class="container"><div class="section-head"><div class="copy"><div class="eyebrow">Online ordering, step by step</div><h2>From craving to confirmation.</h2></div></div><div class="grid grid-5">${[['01','Browse','Search the full menu and filter by category, price or rating.'],['02','Choose','Open a food page, adjust spice and add-ons, then set quantity.'],['03','Cart','Review items, quantities, discounts and delivery fees.'],['04','Checkout','Add your details and choose delivery or pickup.'],['05','Confirm','Place the order and keep the order number for later.']].map(x=>`<div class="card feature-card"><div class="eyebrow">${x[0]}</div><h3>${x[1]}</h3><p>${x[2]}</p></div>`).join('')}</div></div></section><section><div class="container story-grid"><div class="story-copy"><div class="eyebrow">Home delivery</div><h2>Short local routes, straightforward fees.</h2><p>Delivery is available across Nugegoda, Dehiwala, Mount Lavinia, Rajagiriya, Battaramulla and Colombo 04–07. It costs ${money(D.DELIVERY_FEE)} within 6 km and becomes free above ${money(D.FREE_DELIVERY_THRESHOLD)}.</p><div class="notice" style="margin-top:16px">Minimum delivery order: ${money(D.MINIMUM_DELIVERY_ORDER)}. Pickup has no minimum.</div><a class="btn btn-primary" style="margin-top:18px" href="#/menu">Order for delivery</a></div><img src="${D.brandImages.delivery}" alt="Restaurant delivery"></div></section><section class="section-alt"><div class="container"><div class="offer-grid"><div class="offer-copy"><div class="eyebrow" style="color:#e5c994">Catering</div><h2>For the table, not just one plate.</h2><p>Small celebrations, office lunches and family events can be built around rice and curry, snacks, desserts and drinks. Menus start from LKR 1,200 per head; two days’ notice is preferred.</p><div class="grid grid-3" style="margin-top:20px">${[['Family events','Full rice and curry service with five curries and sambols.'],['Office events','Easy shared menus for lunch meetings and team get-togethers.'],['Small celebrations','Flexible trays, snacks and desserts for birthdays and casual gatherings.']].map(x=>`<div class="card feature-card" style="background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.12)"><h3 style="color:#fff;font-size:18px">${x[0]}</h3><p style="color:rgba(255,255,255,.75)">${x[1]}</p></div>`).join('')}</div><div class="page-actions"><a class="btn btn-secondary" href="#/contact">Ask about catering</a><a class="btn btn-ghost" href="#/menu">See the menu</a></div></div><img src="${D.brandImages.dineIn}" alt="Dine-in experience" style="height:400px;object-fit:cover;border-radius:24px"></div></div></section>`;
  }
  function contact() {
    return `<section class="page-hero"><div class="container"><div class="eyebrow" style="color:#e5c994">We’re here to help</div><h1>Contact Us</h1><p>Questions about an order, catering, delivery or the menu? Send a message and we’ll keep the conversation simple.</p></div></section><section><div class="container"><div class="checkout-layout"><div><div class="panel"><h2 style="font-size:27px">Contact details</h2><div class="grid grid-2" style="margin-top:18px"><div class="feature-card" style="padding:0"><div class="eyebrow">Visit</div><p style="margin:7px 0 0;color:var(--muted);font-size:13px;line-height:1.7">${escapeHtml(D.restaurant.address.line1)}<br>${escapeHtml(D.restaurant.address.line2)}<br>${escapeHtml(D.restaurant.address.country)}</p></div><div class="feature-card" style="padding:0"><div class="eyebrow">Call</div><p style="margin:7px 0 0;color:var(--muted);font-size:13px;line-height:1.7">${escapeHtml(D.restaurant.phone)}<br>${escapeHtml(D.restaurant.hotline)}</p></div><div class="feature-card" style="padding:0"><div class="eyebrow">Email</div><p style="margin:7px 0 0;color:var(--muted);font-size:13px;line-height:1.7">${escapeHtml(D.restaurant.email)}</p></div><div class="feature-card" style="padding:0"><div class="eyebrow">Opening hours</div><p style="margin:7px 0 0;color:var(--muted);font-size:13px;line-height:1.7">${D.restaurant.hours.map(h=>`${escapeHtml(h.days)}<br>${escapeHtml(h.time)}`).join('<br>')}</p></div></div></div><div class="panel" style="margin-top:14px"><div class="notice">Our hotline takes delivery orders until 9:30 PM on weekdays and 10:30 PM on weekends. Prefer to order online? <a href="#/menu" style="font-weight:900;color:var(--forest)">Start an order</a>.</div></div><div class="panel" style="margin-top:14px"><div class="eyebrow">Our location</div><h2 style="font-size:27px">Find us in Nugegoda</h2><div class="map-card" style="margin-top:14px"><div style="display:flex;justify-content:space-between;align-items:flex-start"><div><strong style="color:var(--forest-2)">${escapeHtml(D.restaurant.address.line1)}</strong><div style="font-size:11px;color:var(--muted);margin-top:3px">${escapeHtml(D.restaurant.address.line2)}</div></div><div class="map-pin">●</div></div><div class="map-road"></div><div style="font-size:12px;color:var(--muted)">Highlevel Road • Nugegoda • Colombo</div></div></div></div><form class="panel" id="contact-form"><h2 style="font-size:27px">Send us a message</h2><p class="lead" style="font-size:13px">Tell us how we can help — dates, guest numbers or your order ID all help us reply faster.</p><div class="form-grid" style="margin-top:16px"><div class="field"><label class="label">Full name</label><input class="input" name="name" placeholder="Kavindu Perera"><div class="error" data-error="name"></div></div><div class="field"><label class="label">Email</label><input class="input" name="email" type="email" placeholder="you@example.com"><div class="error" data-error="email"></div></div><div class="field"><label class="label">Phone</label><input class="input" name="phone" placeholder="0771234567"><div class="error" data-error="phone"></div></div><div class="field"><label class="label">Subject</label><select class="select" name="subject" style="width:100%"><option>General question</option><option>Catering request</option><option>Delivery question</option><option>Order support</option></select></div><div class="field full"><label class="label">Message</label><textarea class="input" name="message" placeholder="Tell us what you need..."></textarea><div class="error" data-error="message"></div></div></div><button class="btn btn-primary" type="submit">Send Message ${icon('arrow')}</button></form></div></div></section>`;
  }
  function myOrders() {
    const u=currentUser();
    if(!u) return `<section class="section"><div class="container"><div class="empty-state"><div class="empty-icon">◉</div><h1 style="font-size:42px">Login to view your orders.</h1><p>Your order history is linked to the demo account you create in this browser.</p><a class="btn btn-primary" href="#/login">Login</a> <a class="btn btn-secondary" href="#/signup">Sign Up</a></div></div></section>`;
    const rows=orders().filter(o=>o.customer?.email===u.email).sort((a, b)=>new Date(b.createdAt)-new Date(a.createdAt));
    return `<section class="page-hero"><div class="container"><div class="eyebrow" style="color:#e5c994">Your account</div><h1>My Orders</h1><p>Previous demo orders saved in this browser. Use the order details to remember what you enjoyed.</p></div></section><section class="section-tight"><div class="container"><div class="grid" style="gap:12px">${rows.length?rows.map(o=>`<article class="panel"><div style="display:flex;justify-content:space-between;gap:18px;align-items:flex-start"><div><div class="eyebrow">${escapeHtml(o.id)}</div><h3 style="margin-top:3px">${formatDate(o.createdAt)} • ${escapeHtml(o.orderType)}</h3></div><span class="chip active">${escapeHtml(o.status||'Confirmed')}</span></div><div style="margin-top:12px;color:var(--muted);font-size:12px;line-height:1.7">${o.items.map(i=>`${escapeHtml(i.name)} × ${i.quantity}`).join(' • ')}</div><div style="display:flex;justify-content:space-between;margin-top:15px;padding-top:12px;border-top:1px solid var(--cream-3);font-size:13px"><span>${escapeHtml(o.paymentMethod)}</span><strong>${money(o.total)}</strong></div></article>`).join(''):`<div class="empty-state"><div class="empty-icon">▣</div><h2 style="font-size:32px">No orders yet.</h2><p>Build your first order from the menu and it will appear here after checkout.</p><a class="btn btn-primary" href="#/menu">Explore Menu</a></div>`}</div></div></section>`;
  }
  function success() {
    const id=sessionStorage.getItem('last_order_id');
    const o=id?orders().find(x=>x.id===id):null;
    if(!o) return `<section class="section"><div class="container"><div class="empty-state"><div class="empty-icon">✓</div><h1 style="font-size:42px">No recent order found.</h1><p>Place an order from the menu and you’ll see the confirmation here.</p><a class="btn btn-primary" href="#/menu">Browse Menu</a></div></div></section>`;
    return `<section class="section"><div class="container" style="max-width:860px"><div class="panel center" style="padding:42px"><div class="empty-icon" style="background:#e9f3ec;color:var(--forest);font-size:30px">✓</div><div class="eyebrow">Order confirmed</div><h1 style="font-size:48px">Order placed successfully!</h1><p class="lead">Thanks, ${escapeHtml(o.customer.name.split(' ')[0])}. Your order <strong>${escapeHtml(o.id)}</strong> has been saved to this browser.</p><div class="grid grid-3" style="text-align:left;margin-top:24px"><div class="stat"><strong style="font-size:24px">${escapeHtml(o.orderType)}</strong><span>Order type</span></div><div class="stat"><strong style="font-size:24px">${o.etaMinutes} min</strong><span>Estimated time</span></div><div class="stat"><strong style="font-size:24px">${money(o.total)}</strong><span>Total</span></div></div><div class="panel" style="margin-top:20px;text-align:left"><div style="display:flex;justify-content:space-between;gap:15px"><strong>Order summary</strong><span style="font-size:11px;color:var(--muted)">${formatDate(o.createdAt)}</span></div><div style="margin-top:10px;color:var(--muted);font-size:12px;line-height:1.8">${o.items.map(i=>`${escapeHtml(i.name)} × ${i.quantity} — ${money(i.unitPrice*i.quantity)}`).join('<br>')}</div><div style="border-top:1px solid var(--cream-3);margin-top:12px;padding-top:12px;display:flex;justify-content:space-between;font-weight:900"><span>Total</span><span>${money(o.total)}</span></div></div><div class="page-actions" style="justify-content:center"><a class="btn btn-primary" href="#/">Back to Home</a><a class="btn btn-secondary" href="#/my-orders">My Orders</a><a class="btn btn-secondary" href="#/menu">Browse Menu</a></div></div></div></section>`;
  }
  function notFound() {
    const suggestions=D.foods.filter(f=>f.popular).slice(0, 3);
    return `<section class="section"><div class="container" style="max-width:900px;text-align:center"><div class="eyebrow">Page not found</div><div style="font-family:'Playfair Display',serif;font-size:92px;color:var(--terracotta);font-weight:700;line-height:1">404</div><h1 style="font-size:42px">That page took a wrong turn.</h1><p class="lead">Try going home or browse a few of the dishes people are ordering this week.</p><div class="page-actions" style="justify-content:center"><a class="btn btn-primary" href="#/">Back Home</a><a class="btn btn-secondary" href="#/menu">Browse Menu</a></div><div class="grid grid-3" style="text-align:left;margin-top:32px">${suggestions.map(foodCard).join('')}</div></div></section>`;
  }
  function render() {
    const r=parseRoute();
    state.mobileOpen=false;
    state.userMenuOpen=false;
    let content='';
    if(r.path==='/') content=home();
    else if(r.path==='/menu') content=menu();
    else if(r.parts[0]==='menu'&&r.parts[1]) content=details(r.parts[1]);
    else if(r.path==='/about') content=about();
    else if(r.path==='/services') content=services();
    else if(r.path==='/contact') content=contact();
    else if(r.path==='/cart') content=cartPage();
    else if(r.path==='/checkout') content=checkout();
    else if(r.path==='/order-success') content=success();
    else if(r.path==='/my-orders') content=myOrders();
    else if(r.path==='/login') content=login();
    else if(r.path==='/signup') content=signup();
    else content=notFound();
    shell(content);
    bindPage(r);
  }
  function bindPage(r) {
    // Global click actions
    $$('[data-add]').forEach(btn=>btn.addEventListener('click', ()=>addToCart(btn.dataset.add, 1, null, false)));
    $$('[data-remove-cart]').forEach(btn=>btn.addEventListener('click', ()=> {
      let c=cart().filter(i=>i.key!==btn.dataset.removeCart);
      setJSON('restaurant_cart', c);
      toast('Removed from cart');
      render();
    }));
    $$('[data-cart-plus]').forEach(btn=>btn.addEventListener('click', ()=>changeCartQty(btn.dataset.cartPlus, 1)));
    $$('[data-cart-minus]').forEach(btn=>btn.addEventListener('click', ()=>changeCartQty(btn.dataset.cartMinus, -1)));
    $('#clear-cart')?.addEventListener('click', ()=> {
      setJSON('restaurant_cart', []);
      toast('Cart cleared', 'Your cart is empty now.', 'info');
      render();
    });
    $('#newsletter-form')?.addEventListener('submit', e=> {
      e.preventDefault();
      const form=e.target, email=new FormData(form).get('email').trim();
      if(!/^\S+@\S+\.\S+$/.test(email)) {
        toast('Enter a valid email', 'Please check the email address.', 'error');
        return;
      }
      apiFetch('/newsletter', { method:'POST', body: JSON.stringify({ email }) })
        .then(res=> {
          form.reset();
          toast('You’re subscribed', res.message||'We’ll keep updates occasional and useful.');
        })
        .catch(err=> toast('Subscription failed', err.message||'Please try again.', 'error'));
    });
    if(r.path==='/menu') bindMenu();
    if(r.parts[0]==='menu'&&r.parts[1]) bindDetails(r.parts[1]);
    if(r.path==='/login') bindLogin();
    if(r.path==='/signup') bindSignup();
    if(r.path==='/checkout') bindCheckout();
    if(r.path==='/contact') bindContact();
    if(r.path==='/my-orders') syncMyOrdersFromBackend();
    bindImageFallbacks();
    if(r.path==='/') bindHeroSlider();
  }
  function addToCart(foodId, quantity=1, customization=null, go=false) {
    const f=D.foods.find(x=>x.id===foodId);
    if(!f) return;
    const addons=customization?.addons||[];
    const addonTotal=addons.reduce((s, a)=>s+a.price, 0);
    const unitPrice=f.price+addonTotal;
    const spice=customization?.spice||f.spiceLevel;
    const key=`${foodId}|${spice}|${addons.map(a=>a.id).sort().join(',')}`;
    const c=cart();
    const existing=c.find(x=>x.key===key);
    if(existing) existing.quantity+=quantity;
    else c.push( {
      key, foodId, name:f.name, unitPrice, quantity, spice, addons
    });
    setJSON('restaurant_cart', c);
    toast(`${f.name} added to cart`, quantity>1?`${quantity} items added.`:'');
    if(go) navigate('/checkout');
    else render();
  }
  function changeCartQty(key, delta) {
    const c=cart();
    const it=c.find(i=>i.key===key);
    if(!it) return;
    it.quantity=Math.max(1, it.quantity+delta);
    setJSON('restaurant_cart', c);
    render();
  }
  function bindMenu() {
    $('#menu-search')?.addEventListener('input', e=> {
      state.menu.search=e.target.value;
      updateMenuOnly();
    });
    $('#menu-price')?.addEventListener('change', e=> {
      state.menu.price=e.target.value;
      updateMenuOnly();
    });
    $('#menu-sort')?.addEventListener('change', e=> {
      state.menu.sort=e.target.value;
      updateMenuOnly();
    });
    $('#clear-filters')?.addEventListener('click', ()=> {
      state.menu= {
        search:'', category:'All', price:'All', sort:'Recommended'
      };
      render();
    });
    $('#clear-filters-empty')?.addEventListener('click', ()=> {
      state.menu= {
        search:'', category:'All', price:'All', sort:'Recommended'
      };
      render();
    });
    $$('[data-cat]').forEach(b=>b.addEventListener('click', ()=> {
      state.menu.category=b.dataset.cat;
      updateMenuOnly();
    }));
  }
  function updateMenuOnly() {
    const grid=$('#menu-grid');
    if(!grid) return;
    const list=D.foods.filter(f=>f.available).filter(f=> {
      const s=state.menu.search.trim().toLowerCase();
      const ms=!s||`${f.name} ${f.category} ${f.description}`.toLowerCase().includes(s);
      const mc=state.menu.category==='All'||f.category===state.menu.category;
      let mp=true;
      if(state.menu.price==='Under LKR 750') mp=f.price<750;
      else if(state.menu.price==='LKR 750–1,250') mp=f.price>=750&&f.price<=1250;
      else if(state.menu.price==='LKR 1,250–1,750') mp=f.price>1250&&f.price<=1750;
      else if(state.menu.price==='Above LKR 1,750') mp=f.price>1750;
      return ms&&mc&&mp;
    });
    if(state.menu.sort==='Price: Low to High') list.sort((a, b)=>a.price-b.price);
    if(state.menu.sort==='Price: High to Low') list.sort((a, b)=>b.price-a.price);
    if(state.menu.sort==='Rating: High to Low') list.sort((a, b)=>b.rating-a.rating);
    if(state.menu.sort==='Name: A–Z') list.sort((a, b)=>a.name.localeCompare(b.name));
    grid.innerHTML=list.length?list.map(foodCard).join(''):`<div class="empty-state card" style="grid-column:1/-1"><div class="empty-icon">⌕</div><h3>No dishes found</h3><p>Try another search or clear the filters to see the full menu again.</p><button class="btn btn-primary" id="clear-filters-empty">Clear Filters</button></div>`;
    $('#results-copy').textContent=`Showing ${list.length} of ${D.foods.filter(f=>f.available).length} dishes.`;
    $('#clear-filters-empty')?.addEventListener('click', ()=> {
      state.menu= {
        search:'', category:'All', price:'All', sort:'Recommended'
      };
      render();
    });
    $$('[data-add]').forEach(btn=>btn.addEventListener('click', ()=>addToCart(btn.dataset.add, 1, null, false)));
  }
  function bindDetails(id) {
    const f=D.foods.find(x=>x.id===id);
    if(!f) return;
    const q=$('#detail-qty'), total=$('#detail-total');
    const getCustomization=()=> {
      const spice=$('input[name="spice"]:checked')?.value||f.spiceLevel;
      const addons=$$('[data-addon]:checked').map(x=>( {
        id:x.dataset.addon, name:x.dataset.name, price:Number(x.dataset.price)
      }));
      return {
        spice, addons
      };
    };
    const updateTotal=()=> {
      const c=getCustomization();
      const unit=f.price+c.addons.reduce((s, a)=>s+a.price, 0);
      total.textContent=money(unit*Math.max(1, parseInt(q.value||'1', 10)||1));
    };
    $('#qty-minus')?.addEventListener('click', ()=> {
      q.value=Math.max(1, (parseInt(q.value)||1)-1);
      updateTotal();
    });
    $('#qty-plus')?.addEventListener('click', ()=> {
      q.value=Math.min(20, (parseInt(q.value)||1)+1);
      updateTotal();
    });
    q?.addEventListener('input', ()=> {
      q.value=Math.min(20, Math.max(1, parseInt(q.value)||1));
      updateTotal();
    });
    $$('[name="spice"],[data-addon]').forEach(x=>x.addEventListener('change', updateTotal));
    $('#add-detail')?.addEventListener('click', ()=>addToCart(id, Math.max(1, parseInt(q.value)||1), getCustomization(), false));
    $('#order-detail')?.addEventListener('click', ()=>addToCart(id, Math.max(1, parseInt(q.value)||1), getCustomization(), true));
  }
  function bindLogin() {
    $('#toggle-login-password')?.addEventListener('click', ()=> {
      const i=$('#login-form input[name="password"]');
      i.type=i.type==='password'?'text':'password';
    });
    $('#login-form')?.addEventListener('submit', e=> {
      e.preventDefault();
      const fd=new FormData(e.target), email=String(fd.get('email')).trim().toLowerCase(), pass=String(fd.get('password'));
      const es=$('[data-error="email"]', e.target), ps=$('[data-error="password"]', e.target);
      es.textContent=ps.textContent='';
      let ok=true;
      if(!/^\S+@\S+\.\S+$/.test(email)) {
        es.textContent='Please enter a valid email address.';
        ok=false;
      }
      if(!pass) {
        ps.textContent='Please enter your password.';
        ok=false;
      }
      if(!ok) return;
      apiFetch('/auth/login', { method:'POST', body: JSON.stringify({ email, password:pass }) })
        .then(res=> {
          localStorage.setItem('restaurant_auth_token', res.token);
          setJSON('restaurant_current_user', { id:res.user.id, name:res.user.fullName, email:res.user.email, phone:res.user.phone });
          toast('Welcome back', `Good to see you, ${res.user.fullName.split(' ')[0]}.`);
          navigate('/');
        })
        .catch(err=> {
          toast('Login failed', err.message||'Email or password is incorrect.', 'error');
        });
    });
  }
  function bindSignup() {
    $('#signup-form')?.addEventListener('submit', e=> {
      e.preventDefault();
      const fd=new FormData(e.target), v= {
        name:String(fd.get('name')).trim(), email:String(fd.get('email')).trim().toLowerCase(), phone:String(fd.get('phone')).trim(), password:String(fd.get('password')), confirm:String(fd.get('confirm')), terms:fd.get('terms')
      };
      const fields=['name', 'email', 'phone', 'password', 'confirm', 'terms'];
      fields.forEach(k=> {
        const x=$(`[data-error="${k}"]`, e.target);
        if(x) x.textContent='';
      });
      let ok=true;
      const set=(k, m)=> {
        const x=$(`[data-error="${k}"]`, e.target);
        if(x) x.textContent=m;
        ok=false;
      };
      if(v.name.length<2) set('name', 'Please enter your full name.');
      if(!/^\S+@\S+\.\S+$/.test(v.email)) set('email', 'Please enter a valid email address.');
      if(!/^0\d{9}$/.test(v.phone.replace(/\s+/g, ''))) set('phone', 'Use a 10-digit Sri Lankan mobile number.');
      if(v.password.length<6) set('password', 'Password must be at least 6 characters.');
      if(v.confirm!==v.password) set('confirm', 'Passwords do not match.');
      if(!v.terms) set('terms', 'Please accept the terms to continue.');
      if(!ok) return;
      apiFetch('/auth/register', { method:'POST', body: JSON.stringify({ fullName:v.name, email:v.email, phone:v.phone, password:v.password }) })
        .then(res=> {
          localStorage.setItem('restaurant_auth_token', res.token);
          setJSON('restaurant_current_user', { id:res.user.id, name:res.user.fullName, email:res.user.email, phone:res.user.phone });
          toast('Account created', `Welcome, ${res.user.fullName.split(' ')[0]}.`);
          navigate('/');
        })
        .catch(err=> {
          if(err.status===409) set('email', err.message);
          else toast('Signup failed', err.message||'Please try again.', 'error');
        });
    });
  }
  function bindCheckout() {
    const form=$('#checkout-form');
    if(!form) return;
    const updateType=()=> {
      const d=form.querySelector('input[name="orderType"]:checked')?.value==='Delivery';
      $('#address-fields', form)?.classList.toggle('hidden', !d);
      updateCheckoutTotals(d);
      $$('.radio-card', form).forEach(card=> {
        const input=card.querySelector('input[type=radio]');
        if(input) card.classList.toggle('selected', input.checked);
      });
    };
    const updateCheckoutTotals=(delivery)=> {
      const sub=cart().reduce((s, i)=>s+i.unitPrice*i.quantity, 0), t=totals(sub, delivery);
      $('#checkout-subtotal').textContent=money(t.subtotal);
      $('#checkout-delivery').textContent=t.deliveryFee?money(t.deliveryFee):'Free';
      $('#checkout-discount').textContent=t.discount?`−${money(t.discount)}`:'—';
      $('#checkout-total').textContent=money(t.total);
    };
    $$('input[name="orderType"]', form).forEach(r=>r.addEventListener('change', updateType));
    $$('input[name="payment"]', form).forEach(r=>r.addEventListener('change', ()=>$$('.radio-card', form).forEach(card=> {
      const input=card.querySelector('input[type=radio]');
      if(input) card.classList.toggle('selected', input.checked);
    })));
    updateType();
    form.addEventListener('submit', e=> {
      e.preventDefault();
      const fd=new FormData(form), delivery=fd.get('orderType')==='Delivery', vals= {
        name:String(fd.get('name')).trim(), email:String(fd.get('email')).trim().toLowerCase(), phone:String(fd.get('phone')).trim(), address:String(fd.get('address')).trim(), city:String(fd.get('city')).trim(), note:String(fd.get('note')).trim(), orderType:String(fd.get('orderType')), paymentMethod:String(fd.get('payment'))
      };
      $$('[data-error]', form).forEach(x=>x.textContent='');
      let ok=true;
      const er=(k, m)=> {
        const x=$(`[data-error="${k}"]`, form);
        if(x) x.textContent=m;
        ok=false;
      };
      if(vals.name.length<2) er('name', 'Please enter your full name.');
      if(!/^\S+@\S+\.\S+$/.test(vals.email)) er('email', 'Please enter a valid email address.');
      if(!/^0\d{9}$/.test(vals.phone.replace(/\s+/g, ''))) er('phone', 'Use a 10-digit Sri Lankan mobile number.');
      if(delivery&&vals.address.length<5) er('address', 'Delivery address is required.');
      if(!vals.city) er('city', 'City is required.');
      const sub=cart().reduce((s, i)=>s+i.unitPrice*i.quantity, 0);
      if(delivery&&sub<D.MINIMUM_DELIVERY_ORDER) {
        toast('Delivery minimum not met', `Add at least ${money(D.MINIMUM_DELIVERY_ORDER-sub)} or choose pickup.`, 'error');
        return;
      }
      if(!ok) return;
      if(!currentUser()||!authToken()) {
        toast('Please login', 'Login to your account to place an order.', 'error');
        navigate('/login');
        return;
      }
      const submitBtn=$('button[type="submit"]', form);
      if(submitBtn) submitBtn.disabled=true;
      // The backend recalculates every price from the database — it never
      // trusts unit prices from the browser. See section 10 of the project
      // brief and backend/controllers/orderController.js.
      const payload= {
        orderType:vals.orderType, phone:vals.phone,
        address:delivery?vals.address:undefined, city:vals.city||undefined, note:vals.note||undefined,
        paymentMethod:vals.paymentMethod, customerName:vals.name, customerEmail:vals.email,
        items:cart().map(i=> ({
          foodId:i.foodId, quantity:i.quantity, spiceLevel:i.spice, addons:(i.addons||[]).map(a=>( { id:a.id }))
        }))
      };
      apiFetch('/orders', { method:'POST', body: JSON.stringify(payload) })
        .then(res=> {
          const data=res.data;
          const order= {
            id:data.orderNumber, backendId:data.id, createdAt:data.createdAt, customer: {
              name:vals.name, email:vals.email, phone:vals.phone
            }, orderType:data.orderType, address:data.address, city:data.city, note:data.note, paymentMethod:data.paymentMethod, items:cart(), subtotal:data.subtotal, deliveryFee:data.deliveryFee, discount:data.discount, total:data.total, status:data.status, etaMinutes:delivery?45:25
          };
          const all=orders();
          all.push(order);
          setJSON('restaurant_orders', all);
          sessionStorage.setItem('last_order_id', order.id);
          setJSON('restaurant_cart', []);
          toast('Order placed', 'Your confirmation is ready.');
          navigate('/order-success');
        })
        .catch(err=> {
          if(submitBtn) submitBtn.disabled=false;
          toast('Order failed', err.message||'Something went wrong placing your order.', 'error');
        });
    });
  }
  function bindContact() {
    $('#contact-form')?.addEventListener('submit', e=> {
      e.preventDefault();
      const fd=new FormData(e.target), name=String(fd.get('name')).trim(), email=String(fd.get('email')).trim(), phone=String(fd.get('phone')).trim(), message=String(fd.get('message')).trim();
      $$('[data-error]', e.target).forEach(x=>x.textContent='');
      let ok=true;
      const er=(k, m)=> {
        const x=$(`[data-error="${k}"]`, e.target);
        if(x) x.textContent=m;
        ok=false;
      };
      if(name.length<2) er('name', 'Please enter your full name.');
      if(!/^\S+@\S+\.\S+$/.test(email)) er('email', 'Please enter a valid email address.');
      if(!/^0\d{9}$/.test(phone.replace(/\s+/g, ''))) er('phone', 'Use a 10-digit Sri Lankan mobile number.');
      if(message.length<10) er('message', 'Please give us a little more detail.');
      if(!ok) return;
      const form=e.target, subject=String(fd.get('subject'));
      const submitBtn=$('button[type="submit"]', form);
      if(submitBtn) submitBtn.disabled=true;
      apiFetch('/contact', { method:'POST', body: JSON.stringify({ name, email, phone, subject, message }) })
        .then(()=> {
          form.reset();
          toast('Message sent', 'Thanks — your message was saved successfully.');
        })
        .catch(err=> toast('Message not sent', err.message||'Please try again.', 'error'))
        .finally(()=> { if(submitBtn) submitBtn.disabled=false; });
    });
  }
  window.addEventListener('hashchange', render);
  window.addEventListener('DOMContentLoaded', ()=> {
    render();
    syncMenuFromBackend();
    syncAddonsFromBackend();
  });
})();
