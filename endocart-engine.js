/* ═══════════════════════════════════════════════════════════════════════
   EndoCart® Quote Engine — Total Scope, Inc.
   Local-first data layer + business logic for endocart quoting workflow.
   Persists to localStorage; swappable to a real backend later.
   ═══════════════════════════════════════════════════════════════════════ */
const EC = (() => {
'use strict';

/* ─── STORAGE KEYS ─── */
const KEYS = {
  products:      'ec_products',
  accounts:      'ec_accounts',
  contacts:      'ec_contacts',
  quoteRequests: 'ec_quote_requests',
  quotes:        'ec_quotes',
  lineItems:     'ec_line_items',
  seqQuote:      'ec_seq_quote',
  seqRequest:    'ec_seq_request',
};

/* ─── PERSISTENCE HELPERS ─── */
function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function save(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

/* ─── ID GENERATORS ─── */
function nextId(arr) { return arr.reduce((mx, r) => Math.max(mx, r._id || 0), 0) + 1; }
function nextQuoteNumber() {
  let seq = load(KEYS.seqQuote, 0) + 1;
  save(KEYS.seqQuote, seq);
  const year = new Date().getFullYear();
  return 'QT-' + year + '-' + String(seq).padStart(5, '0');
}
function nextRequestId() {
  let seq = load(KEYS.seqRequest, 0) + 1;
  save(KEYS.seqRequest, seq);
  return seq;
}

/* ═══════════════════════════════════════════════════════════════════════
   PRODUCT CATALOG (35 SKUs — seeded on first load)
   ═══════════════════════════════════════════════════════════════════════ */
const SEED_PRODUCTS = [
  // CARTS
  { sku:'EDM-100', name:'Motorized Deluxe EndoCart®',                    category:'cart',             base_price:0, specs:{} },
  { sku:'ES-100',  name:'Standard EndoCart®',                            category:'cart',             base_price:0, specs:{} },
  { sku:'ED-100',  name:'Deluxe EndoCart®',                              category:'cart',             base_price:0, specs:{} },
  // MONITOR STANDS
  { sku:'EMS-100', name:'Monitor Stand',                                 category:'monitor_stand',    base_price:0, specs:{} },
  { sku:'ERS-100', name:'Extended Roll Stand',                           category:'monitor_stand',    base_price:0, specs:{} },
  // MONITOR MOUNTS
  { sku:'EB-308',  name:'Gas Spring Arm Mount',                          category:'monitor_mount',    base_price:0, specs:{} },
  { sku:'EB-311',  name:'Heavy Duty Gas Spring Mount',                   category:'monitor_mount',    base_price:0, specs:{} },
  { sku:'EB-309',  name:'Dual Gas Spring Arm Mount',                     category:'monitor_mount',    base_price:0, specs:{} },
  { sku:'EB-304',  name:'Standard Flat Panel Mount',                     category:'monitor_mount',    base_price:0, specs:{} },
  { sku:'EB-306',  name:'25" Flat Panel',                                category:'monitor_mount',    base_price:0, specs:{} },
  { sku:'EB-307',  name:'25" Dual Articulating Mount',                   category:'monitor_mount',    base_price:0, specs:{} },
  // ACCESSORIES
  { sku:'EDSB-202',     name:'Single Drawer Box',                        category:'accessory',        base_price:0, specs:{} },
  { sku:'EDSB-205',     name:'Two Drawer Box',                           category:'accessory',        base_price:0, specs:{} },
  { sku:'EDSB-203',     name:'Three Drawer Box',                         category:'accessory',        base_price:0, specs:{} },
  { sku:'EDSB-201',     name:'Dual Scope Hanger',                        category:'accessory',        base_price:0, specs:{} },
  { sku:'EDS-205',      name:'Vertical Storage Slots',                   category:'accessory',        base_price:0, specs:{} },
  { sku:'EDSB-204',     name:'Side Shelf',                               category:'accessory',        base_price:0, specs:{} },
  { sku:'E_CPUBRAC',    name:'Computer Side Mount Bracket',              category:'accessory',        base_price:0, specs:{} },
  { sku:'EDSB-212',     name:'Cord Wrap',                                category:'accessory',        base_price:0, specs:{} },
  { sku:'EWM-0001-01D', name:'Cart/Wall Mount Utility Basket 3.5"',      category:'accessory',        base_price:0, specs:{} },
  { sku:'EWM-0001-18',  name:'Cart/Wall Mount Utility Basket 6"',        category:'accessory',        base_price:0, specs:{} },
  { sku:'EDS-200',      name:'Additional Shelves (frame included)',       category:'accessory',        base_price:0, specs:{} },
  { sku:'EDSB-209',     name:'Tank Strap Holder',                        category:'accessory',        base_price:0, specs:{} },
  { sku:'EDSB-214',     name:'Dual Tank Strap Holder',                   category:'accessory',        base_price:0, specs:{} },
  { sku:'EDSB-210',     name:'Oxygen Tank Holder (single)',              category:'accessory',        base_price:0, specs:{} },
  { sku:'EDS-207',      name:'Front Sliding Keyboard Tray',              category:'accessory',        base_price:0, specs:{} },
  { sku:'EDSB-208',     name:'Keyboard Tray (folding)',                  category:'accessory',        base_price:0, specs:{} },
  { sku:'EDSB-213',     name:'Power Strip (hospital grade, 6 outlet, 15\' cord)', category:'accessory', base_price:0, specs:{} },
  { sku:'EDSB-401',     name:'Water Bottle Holder',                      category:'accessory',        base_price:0, specs:{} },
  { sku:'EM_Battery',   name:'Battery (requires two for motorized)',      category:'accessory',        base_price:0, specs:{} },
  { sku:'E_TotalLock',  name:'Total Lock Caster',                        category:'accessory',        base_price:0, specs:{} },
  { sku:'E_Directional',name:'Dual-Lock Directional Caster',             category:'accessory',        base_price:0, specs:{} },
  // REPLACEMENT PARTS
  { sku:'E_DLXB',          name:'Deluxe Plastic Bottom',                 category:'replacement_part', base_price:0, specs:{} },
  { sku:'E_DLXT',          name:'Deluxe Plastic Top',                    category:'replacement_part', base_price:0, specs:{} },
  { sku:'E_STT',           name:'Standard Plastic Top',                  category:'replacement_part', base_price:0, specs:{} },
  { sku:'E_SBOT',          name:'Standard Plastic Bottom',               category:'replacement_part', base_price:0, specs:{} },
  { sku:'E_Shelf_Plastic', name:'Plastic Shelf (no frame)',              category:'replacement_part', base_price:0, specs:{} },
];

function seedProducts() {
  let products = load(KEYS.products, null);
  if (products && products.length) return products;
  const now = new Date().toISOString();
  products = SEED_PRODUCTS.map((p, i) => ({
    _id: i + 1,
    sku: p.sku,
    name: p.name,
    category: p.category,
    base_price: p.base_price,
    specs: p.specs || {},
    is_active: true,
    image_url: '',
    created_at: now,
    updated_at: now,
  }));
  save(KEYS.products, products);
  return products;
}

/* ═══════════════════════════════════════════════════════════════════════
   DATA STORES — loaded from localStorage on init
   ═══════════════════════════════════════════════════════════════════════ */
let _products, _accounts, _contacts, _requests, _quotes, _lineItems;

function initStores() {
  _products  = seedProducts();
  _accounts  = load(KEYS.accounts, []);
  _contacts  = load(KEYS.contacts, []);
  _requests  = load(KEYS.quoteRequests, []);
  _quotes    = load(KEYS.quotes, []);
  _lineItems = load(KEYS.lineItems, []);
}
initStores();

/* ─── STORE PERSIST ─── */
function saveProducts()  { save(KEYS.products, _products); }
function saveAccounts()  { save(KEYS.accounts, _accounts); }
function saveContacts()  { save(KEYS.contacts, _contacts); }
function saveRequests()  { save(KEYS.quoteRequests, _requests); }
function saveQuotes()    { save(KEYS.quotes, _quotes); }
function saveLineItems() { save(KEYS.lineItems, _lineItems); }

/* ═══════════════════════════════════════════════════════════════════════
   PRODUCT CATALOG API
   ═══════════════════════════════════════════════════════════════════════ */
function getProducts(opts) {
  let list = _products.filter(p => p.is_active);
  if (opts && opts.category) list = list.filter(p => p.category === opts.category);
  return list;
}

function getProductBySku(sku) {
  return _products.find(p => p.sku === sku) || null;
}

function updateProduct(productId, updates) {
  const p = _products.find(x => x._id === productId);
  if (!p) return null;
  if (updates.name !== undefined) p.name = updates.name;
  if (updates.base_price !== undefined) p.base_price = updates.base_price;
  if (updates.specs !== undefined) p.specs = updates.specs;
  if (updates.is_active !== undefined) p.is_active = updates.is_active;
  p.updated_at = new Date().toISOString();
  saveProducts();
  return p;
}

/* ═══════════════════════════════════════════════════════════════════════
   ACCOUNT & CONTACT RESOLUTION
   ═══════════════════════════════════════════════════════════════════════ */
const LEAD_SOURCES = ['web_search','social_media','referral','marketing_email','current_customer','mailer','tradeshow','other'];

function normalizeLeadSource(raw) {
  if (!raw) return 'other';
  const s = raw.toLowerCase().replace(/[\s_-]+/g, '_');
  if (s.includes('current') && s.includes('customer')) return 'current_customer';
  if (s.includes('web') || s.includes('search') || s.includes('google')) return 'web_search';
  if (s.includes('social')) return 'social_media';
  if (s.includes('referral')) return 'referral';
  if (s.includes('email') || s.includes('marketing')) return 'marketing_email';
  if (s.includes('mailer')) return 'mailer';
  if (s.includes('trade') || s.includes('show') || s.includes('conference')) return 'tradeshow';
  return 'other';
}

function resolveAccount(customer) {
  const name = (customer.account_name || '').trim();
  const email = (customer.email || '').trim().toLowerCase();
  // Try to match on name + email
  let acct = _accounts.find(a =>
    a.account_name.toLowerCase() === name.toLowerCase() &&
    a.email.toLowerCase() === email
  );
  if (!acct) {
    // Try name-only match
    acct = _accounts.find(a => a.account_name.toLowerCase() === name.toLowerCase());
  }
  if (acct) {
    acct.updated_at = new Date().toISOString();
    saveAccounts();
    return acct;
  }
  // Create new
  const now = new Date().toISOString();
  const addr = customer.address || {};
  acct = {
    _id: nextId(_accounts),
    account_name: name,
    department: customer.department || '',
    phone: customer.phone || '',
    fax: customer.fax || null,
    email: email,
    address_street: addr.street || '',
    address_city: addr.city || '',
    address_state: addr.state || '',
    address_zip: addr.zip || '',
    address_country: addr.country || 'United States',
    is_existing_customer: normalizeLeadSource(customer.lead_source) === 'current_customer',
    lead_source: normalizeLeadSource(customer.lead_source),
    lead_source_detail: null,
    newsletter_opt_in: false,
    created_at: now,
    updated_at: now,
  };
  _accounts.push(acct);
  saveAccounts();
  return acct;
}

const NA_VALUES = ['n/a', 'na', 'none', '', 'n/a n/a'];

function isNA(val) {
  if (!val) return true;
  return NA_VALUES.includes(val.trim().toLowerCase());
}

function resolveContacts(account, customer) {
  const created = [];
  // Endoscopy contact
  const endo = customer.endoscopy_contact;
  if (endo && !isNA(endo.first) && !isNA(endo.last)) {
    let existing = _contacts.find(c =>
      c.account_id === account._id &&
      c.first_name.toLowerCase() === (endo.first||'').toLowerCase() &&
      c.last_name.toLowerCase() === (endo.last||'').toLowerCase()
    );
    if (!existing) {
      existing = {
        _id: nextId(_contacts),
        account_id: account._id,
        first_name: endo.first || '',
        last_name: endo.last || '',
        role: 'endoscopy_contact',
        email: customer.email || null,
        phone: customer.phone || null,
        created_at: new Date().toISOString(),
      };
      _contacts.push(existing);
    }
    created.push(existing);
  }
  // Purchasing contact
  const purch = customer.purchasing_contact;
  if (purch && !isNA(purch.first) && !isNA(purch.last)) {
    let existing = _contacts.find(c =>
      c.account_id === account._id &&
      c.first_name.toLowerCase() === (purch.first||'').toLowerCase() &&
      c.last_name.toLowerCase() === (purch.last||'').toLowerCase()
    );
    if (!existing) {
      existing = {
        _id: nextId(_contacts),
        account_id: account._id,
        first_name: purch.first || '',
        last_name: purch.last || '',
        role: 'purchasing_contact',
        email: null,
        phone: null,
        created_at: new Date().toISOString(),
      };
      _contacts.push(existing);
    }
    created.push(existing);
  }
  if (created.length) saveContacts();
  return created;
}

/* ═══════════════════════════════════════════════════════════════════════
   VALIDATION RULES
   ═══════════════════════════════════════════════════════════════════════ */
function validate(payload) {
  const flags = [];
  const config = payload.configuration || {};
  const cart = config.cart;
  const stand = config.monitor_stand;
  const mount = config.monitor_mount;
  const accessories = config.accessories || [];
  const customer = payload.customer || {};

  // 1. No cart
  if (!cart || !cart.sku) {
    flags.push({ severity:'error', message:'Missing base cart selection' });
  }

  // 2. Mount without stand
  if (mount && mount.sku && (!stand || !stand.sku)) {
    flags.push({ severity:'warning', message:'Monitor mount selected without a stand — verify customer has existing stand' });
  }

  // 3. Motorized cart without batteries
  if (cart && cart.sku === 'EDM-100') {
    const hasBattery = accessories.some(a => a.sku === 'EM_Battery');
    if (!hasBattery) {
      flags.push({ severity:'warning', message:'Motorized cart selected — batteries not included, suggest adding 2x EM_Battery' });
    }
  }

  // 4. Multiple carts but single stand
  if (cart && cart.qty > 1 && stand && stand.qty === 1) {
    flags.push({ severity:'warning', message:'Multiple carts ordered but only 1 stand — confirm intent' });
  }

  // 5. No purchasing contact
  const purch = customer.purchasing_contact;
  if (!purch || isNA(purch.first) || isNA(purch.last) ||
      isNA((purch.first||'') + ' ' + (purch.last||''))) {
    flags.push({ severity:'info', message:'No purchasing contact provided — follow up needed' });
  }

  // 6. No discount
  if (!payload.discount_requested || payload.discount_requested === 'none') {
    flags.push({ severity:'info', message:'No discount selected' });
  }

  // 7. Existing customer
  if (customer.lead_source && normalizeLeadSource(customer.lead_source) === 'current_customer') {
    flags.push({ severity:'info', message:'Existing customer — check for prior pricing' });
  }

  return flags;
}

/* ═══════════════════════════════════════════════════════════════════════
   QUOTE REQUEST INGEST
   ═══════════════════════════════════════════════════════════════════════ */
function ingestQuoteRequest(payload) {
  const config = payload.configuration || {};
  const cart = config.cart || {};
  const stand = config.monitor_stand;
  const mount = config.monitor_mount;
  const accessories = config.accessories || [];
  const customer = payload.customer || {};
  const flags = validate(payload);
  const now = new Date().toISOString();

  // Build contact display name
  const endo = customer.endoscopy_contact;
  let contactName = '';
  if (endo) contactName = ((endo.first||'') + ' ' + (endo.last||'')).trim();
  if (!contactName || isNA(contactName)) contactName = customer.account_name || '';

  const request = {
    _id: nextRequestId(),
    source: payload.source || 'web_form',
    status: 'new',
    assigned_to: null,
    raw_payload: payload,
    cart_sku: cart.sku || null,
    cart_qty: cart.qty || 0,
    stand_sku: stand && stand.sku ? stand.sku : null,
    stand_qty: stand && stand.qty ? stand.qty : null,
    mount_sku: mount && mount.sku ? mount.sku : null,
    mount_qty: mount && mount.qty ? mount.qty : null,
    accessories: accessories.map(a => ({ sku: a.sku, qty: a.qty || 1 })),
    discount_requested: payload.discount_requested || 'none',
    account_name: customer.account_name || '',
    contact_name: contactName,
    contact_email: customer.email || '',
    contact_phone: customer.phone || '',
    department: customer.department || null,
    address: customer.address || {},
    is_existing_customer: normalizeLeadSource(customer.lead_source) === 'current_customer',
    lead_source: normalizeLeadSource(customer.lead_source),
    validation_flags: flags,
    internal_notes: null,
    converted_to_quote_id: null,
    created_at: now,
    updated_at: now,
  };

  _requests.push(request);
  saveRequests();
  return request;
}

/* ═══════════════════════════════════════════════════════════════════════
   QUOTE REQUEST CRUD
   ═══════════════════════════════════════════════════════════════════════ */
function getQuoteRequests(opts) {
  let list = [..._requests];
  if (opts) {
    if (opts.status) list = list.filter(r => r.status === opts.status);
    if (opts.assigned_to) list = list.filter(r => r.assigned_to === opts.assigned_to);
    if (opts.search) {
      const s = opts.search.toLowerCase();
      list = list.filter(r =>
        (r.account_name||'').toLowerCase().includes(s) ||
        (r.contact_name||'').toLowerCase().includes(s) ||
        (r.contact_email||'').toLowerCase().includes(s) ||
        String(r._id).includes(s)
      );
    }
  }
  return list.sort((a, b) => b._id - a._id);
}

function getQuoteRequest(id) {
  return _requests.find(r => r._id === id) || null;
}

function updateQuoteRequest(id, updates) {
  const r = _requests.find(x => x._id === id);
  if (!r) return null;
  if (updates.status !== undefined) r.status = updates.status;
  if (updates.assigned_to !== undefined) r.assigned_to = updates.assigned_to;
  if (updates.internal_notes !== undefined) r.internal_notes = updates.internal_notes;
  r.updated_at = new Date().toISOString();
  saveRequests();
  return r;
}

/* ═══════════════════════════════════════════════════════════════════════
   CONVERSION: Quote Request → Draft Quote
   ═══════════════════════════════════════════════════════════════════════ */
function convertRequestToQuote(requestId, createdBy) {
  const req = _requests.find(r => r._id === requestId);
  if (!req) throw new Error('Quote request not found: ' + requestId);
  if (req.status === 'converted') throw new Error('Request already converted');

  const customer = req.raw_payload.customer || {};

  // 1. Resolve account
  const account = resolveAccount(customer);

  // 2. Resolve contacts
  resolveContacts(account, customer);

  // 3. Create quote
  const now = new Date().toISOString();
  const quoteNumber = nextQuoteNumber();
  const validUntil = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const quote = {
    _id: nextId(_quotes),
    quote_number: quoteNumber,
    request_id: req._id,
    account_id: account._id,
    account_name: account.account_name,
    department: req.department || '',
    contact_name: req.contact_name,
    contact_email: req.contact_email,
    contact_phone: req.contact_phone,
    address: req.address,
    created_by: createdBy || 'system',
    status: 'draft',
    subtotal: 0,
    discount_type: req.discount_requested || 'none',
    discount_amount: 0,
    total: 0,
    valid_until: validUntil,
    payment_terms: null,
    notes_to_customer: null,
    internal_notes: req.internal_notes || null,
    created_at: now,
    updated_at: now,
  };
  _quotes.push(quote);

  // 4. Create line items from request config
  let sortOrder = 0;
  const items = [];

  function addItem(sku, qty) {
    if (!sku || !qty) return;
    const product = getProductBySku(sku);
    sortOrder++;
    const li = {
      _id: nextId(_lineItems.concat(items)),
      quote_id: quote._id,
      product_id: product ? product._id : null,
      sku: sku,
      description: product ? product.name : sku,
      quantity: qty,
      unit_price: product ? product.base_price : 0,
      line_total: qty * (product ? product.base_price : 0),
      is_free: false,
      sort_order: sortOrder,
    };
    items.push(li);
  }

  // Cart
  addItem(req.cart_sku, req.cart_qty || 1);
  // Stand
  addItem(req.stand_sku, req.stand_qty || 1);
  // Mount
  addItem(req.mount_sku, req.mount_qty || 1);
  // Accessories
  (req.accessories || []).forEach(a => addItem(a.sku, a.qty || 1));

  _lineItems.push(...items);

  // 5. Calculate subtotal
  let subtotal = items.reduce((sum, li) => sum + li.line_total, 0);

  // 6. Apply discount
  let discountAmount = 0;
  if (req.discount_requested === 'percent_10') {
    // 10% off cart line items only
    const cartTotal = items
      .filter(li => { const p = getProductBySku(li.sku); return p && p.category === 'cart'; })
      .reduce((s, li) => s + li.line_total, 0);
    discountAmount = Math.round(cartTotal * 0.1 * 100) / 100;
  } else if (req.discount_requested === 'free_2_accessories') {
    // Mark 2 lowest-priced accessory items as free
    const accItems = items
      .filter(li => { const p = getProductBySku(li.sku); return p && p.category === 'accessory'; })
      .sort((a, b) => a.unit_price - b.unit_price);
    const toFree = accItems.slice(0, 2);
    toFree.forEach(li => {
      li.is_free = true;
      discountAmount += li.line_total;
      li.line_total = 0;
    });
    subtotal = items.reduce((sum, li) => sum + li.line_total, 0);
  }

  quote.subtotal = subtotal;
  quote.discount_amount = discountAmount;
  quote.total = subtotal - discountAmount;
  // For free_2_accessories, discount is already baked into line totals
  if (req.discount_requested === 'free_2_accessories') {
    quote.total = subtotal; // line_totals already zeroed
  }

  // 7. Update request
  req.status = 'converted';
  req.converted_to_quote_id = quote._id;
  req.updated_at = now;

  // Persist
  saveQuotes();
  saveLineItems();
  saveRequests();

  return { quote, lineItems: items, account };
}

/* ═══════════════════════════════════════════════════════════════════════
   QUOTE CRUD
   ═══════════════════════════════════════════════════════════════════════ */
function getQuotes(opts) {
  let list = [..._quotes];
  if (opts) {
    if (opts.status) list = list.filter(q => q.status === opts.status);
    if (opts.account_id) list = list.filter(q => q.account_id === opts.account_id);
    if (opts.created_by) list = list.filter(q => q.created_by === opts.created_by);
    if (opts.search) {
      const s = opts.search.toLowerCase();
      list = list.filter(q =>
        (q.quote_number||'').toLowerCase().includes(s) ||
        (q.account_name||'').toLowerCase().includes(s) ||
        (q.contact_name||'').toLowerCase().includes(s)
      );
    }
  }
  return list.sort((a, b) => b._id - a._id);
}

function getQuote(id) {
  const q = _quotes.find(x => x._id === id);
  if (!q) return null;
  const items = getQuoteLineItems(id);
  return { ...q, line_items: items };
}

function updateQuote(id, updates) {
  const q = _quotes.find(x => x._id === id);
  if (!q) return null;
  const allowed = ['status','subtotal','discount_type','discount_amount','total',
    'valid_until','payment_terms','notes_to_customer','internal_notes',
    'contact_name','contact_email','contact_phone','department','address'];
  allowed.forEach(k => { if (updates[k] !== undefined) q[k] = updates[k]; });
  q.updated_at = new Date().toISOString();
  saveQuotes();
  return q;
}

function updateQuoteStatus(id, newStatus) {
  const TRANSITIONS = {
    draft: ['approved','expired'],
    approved: ['sent','expired'],
    sent: ['accepted','declined','expired','revised'],
    revised: ['approved','expired'],
  };
  const q = _quotes.find(x => x._id === id);
  if (!q) return null;
  const valid = TRANSITIONS[q.status];
  if (valid && !valid.includes(newStatus)) {
    throw new Error(`Cannot transition from ${q.status} to ${newStatus}`);
  }
  q.status = newStatus;
  q.updated_at = new Date().toISOString();
  saveQuotes();
  return q;
}

/* ═══════════════════════════════════════════════════════════════════════
   QUOTE LINE ITEMS
   ═══════════════════════════════════════════════════════════════════════ */
function getQuoteLineItems(quoteId) {
  return _lineItems
    .filter(li => li.quote_id === quoteId)
    .sort((a, b) => a.sort_order - b.sort_order);
}

function addQuoteLineItem(quoteId, item) {
  const q = _quotes.find(x => x._id === quoteId);
  if (!q) throw new Error('Quote not found');
  const existing = getQuoteLineItems(quoteId);
  const maxSort = existing.reduce((mx, li) => Math.max(mx, li.sort_order || 0), 0);
  const product = item.sku ? getProductBySku(item.sku) : null;

  const li = {
    _id: nextId(_lineItems),
    quote_id: quoteId,
    product_id: product ? product._id : null,
    sku: item.sku || '',
    description: item.description || (product ? product.name : ''),
    quantity: item.quantity || 1,
    unit_price: item.unit_price !== undefined ? item.unit_price : (product ? product.base_price : 0),
    line_total: 0,
    is_free: item.is_free || false,
    sort_order: item.sort_order || (maxSort + 1),
  };
  li.line_total = li.is_free ? 0 : li.quantity * li.unit_price;
  _lineItems.push(li);
  recalcQuoteTotals(quoteId);
  saveLineItems();
  return li;
}

function updateQuoteLineItem(lineItemId, updates) {
  const li = _lineItems.find(x => x._id === lineItemId);
  if (!li) return null;
  if (updates.description !== undefined) li.description = updates.description;
  if (updates.quantity !== undefined) li.quantity = updates.quantity;
  if (updates.unit_price !== undefined) li.unit_price = updates.unit_price;
  if (updates.is_free !== undefined) li.is_free = updates.is_free;
  if (updates.sort_order !== undefined) li.sort_order = updates.sort_order;
  li.line_total = li.is_free ? 0 : li.quantity * li.unit_price;
  recalcQuoteTotals(li.quote_id);
  saveLineItems();
  return li;
}

function removeQuoteLineItem(lineItemId) {
  const idx = _lineItems.findIndex(x => x._id === lineItemId);
  if (idx === -1) return false;
  const quoteId = _lineItems[idx].quote_id;
  _lineItems.splice(idx, 1);
  recalcQuoteTotals(quoteId);
  saveLineItems();
  return true;
}

function recalcQuoteTotals(quoteId) {
  const q = _quotes.find(x => x._id === quoteId);
  if (!q) return;
  const items = getQuoteLineItems(quoteId);
  q.subtotal = items.reduce((s, li) => s + li.line_total, 0);

  // Recalculate discount
  if (q.discount_type === 'percent_10') {
    const cartTotal = items
      .filter(li => { const p = getProductBySku(li.sku); return p && p.category === 'cart'; })
      .reduce((s, li) => s + li.line_total, 0);
    q.discount_amount = Math.round(cartTotal * 0.1 * 100) / 100;
  } else if (q.discount_type === 'custom') {
    // Keep manual discount_amount
  } else if (q.discount_type === 'free_2_accessories') {
    q.discount_amount = items.filter(li => li.is_free).reduce((s, li) => s + li.quantity * li.unit_price, 0);
  } else {
    q.discount_amount = 0;
  }

  q.total = q.subtotal - q.discount_amount;
  if (q.discount_type === 'free_2_accessories') {
    q.total = q.subtotal; // already zeroed in line totals
  }
  q.updated_at = new Date().toISOString();
  saveQuotes();
}

/* ═══════════════════════════════════════════════════════════════════════
   DASHBOARD STATS
   ═══════════════════════════════════════════════════════════════════════ */
function getDashboardStats() {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10);
  return {
    new_requests: _requests.filter(r => r.status === 'new').length,
    in_progress_requests: _requests.filter(r => r.status === 'in_progress').length,
    draft_quotes: _quotes.filter(q => q.status === 'draft').length,
    sent_quotes: _quotes.filter(q => q.status === 'sent').length,
    expiring_soon: _quotes.filter(q =>
      (q.status === 'sent' || q.status === 'approved') &&
      q.valid_until && q.valid_until <= in7Days
    ).length,
    total_pipeline: _quotes
      .filter(q => q.status === 'draft' || q.status === 'sent' || q.status === 'approved')
      .reduce((s, q) => s + (q.total || 0), 0),
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   ACCOUNT CRUD (basic)
   ═══════════════════════════════════════════════════════════════════════ */
function getAccounts() { return [..._accounts]; }
function getAccount(id) { return _accounts.find(a => a._id === id) || null; }
function getAccountContacts(accountId) { return _contacts.filter(c => c.account_id === accountId); }

/* ═══════════════════════════════════════════════════════════════════════
   RESET (dev helper)
   ═══════════════════════════════════════════════════════════════════════ */
function resetAll() {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  initStores();
}

/* ═══════════════════════════════════════════════════════════════════════
   PUBLIC API
   ═══════════════════════════════════════════════════════════════════════ */
return {
  // Products
  getProducts,
  getProductBySku,
  updateProduct,

  // Quote Requests
  ingestQuoteRequest,
  getQuoteRequests,
  getQuoteRequest,
  updateQuoteRequest,
  convertRequestToQuote,
  validate,

  // Quotes
  getQuotes,
  getQuote,
  updateQuote,
  updateQuoteStatus,

  // Line Items
  getQuoteLineItems,
  addQuoteLineItem,
  updateQuoteLineItem,
  removeQuoteLineItem,
  recalcQuoteTotals,

  // Accounts
  getAccounts,
  getAccount,
  getAccountContacts,
  resolveAccount,

  // Dashboard
  getDashboardStats,

  // Utils
  resetAll,
  CATEGORIES: ['cart','monitor_stand','monitor_mount','accessory','replacement_part'],
  CATEGORY_LABELS: {
    cart: 'Cart', monitor_stand: 'Monitor Stand', monitor_mount: 'Monitor Mount',
    accessory: 'Accessory', replacement_part: 'Replacement Part'
  },
};
})();
