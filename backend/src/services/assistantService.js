const { query } = require('../config/db');

// ---------------------------
// Language detection (English / Kinyarwanda)
// ---------------------------
const RW_KEYWORDS = [
  'mubika', 'ububiko', 'ubutabazi', 'imiti', 'umutwe', 'ikinyarwanda',
  'maze', 'nga', 'byafashe', 'urugo', 'bitaro', 'ibitaro', 'bwinshi',
  'wameny', 'banga', 'mbwira', 'ubwiza', 'ingana', 'kuki', 'ninde',
  'ryari', 'hehe', 'ni', 'ari', 'zii', 'ziri', 'bari', 'uyu', 'ubu',
  'iki', 'ikihe', 'biciye', 'byiza', 'mubijyanye', 'cyiza', 'gusuzuma',
  'igisubizo', 'kintu', 'umubare', 'ingana', 'shatse', 'shaka', 'shaza',
  'fora', 'guhabwa', 'kubona', 'kumenya', 'amakuru', 'byahise', 'nk',
  'yo', 'kugira', 'uyu', 'uri', 'muri', 'kuri', 'cya', 'kandi', 'ariko',
  'urakoze', 'murakoze', 'yego', 'oya', 'mubishobora', 'bishoboka', 'igikorwa',
];

function detectLanguage(text) {
  const lower = (text || '').toLowerCase();
  let rwScore = 0;
  for (const kw of RW_KEYWORDS) {
    if (lower.includes(kw)) rwScore++;
  }
  // Heuristic: if many Kinyarwanda stopwords present, treat as RW
  const rwStop = ['ni', 'na', 'ya', 'mu', 'ku', 'kuri', 'muri', 'uko', 'uko', 'icyo', 'iki', 'iki', 'ubwo', 'kugira', 'kandi', 'cyangwa', 'ariko', 'gusa', 'rimwe', 'byinshi', 'bose', 'nibo', 'uyu', 'ubu', 'kuri'];
  let stopScore = 0;
  const words = lower.split(/\s+/);
  for (const w of words) {
    if (rwStop.includes(w)) stopScore++;
    if (RW_KEYWORDS.includes(w)) rwScore++;
  }
  return (rwScore >= 1 || stopScore >= 2) ? 'rw' : 'en';
}

// ---------------------------
// Intent detection
// ---------------------------
function detectIntent(text) {
  const t = (text || '').toLowerCase();

  // Greetings
  if (/(hello|hi |hey|good morning|good afternoon|good evening|muraho|murabeho|bite|amakuru|yego|hello sist|bonjour|sali|salutations)/.test(t)) {
    return 'greeting';
  }
  // Thanks
  if (/(thank|thanks|grace|stashe|murakoze|urakoze|asante)/.test(t)) {
    return 'thanks';
  }
  // Help
  if (/(help|how (do|can) i|what can you|guide|usage|mbariza|ubufasha|kubafasha|kubafasha|kubona ubufasha|igisubizo umbwira)/.test(t)) {
    return 'help';
  }
  // Low stock / stock out
  if (/(low stock|out of stock|stock out|running low|shortage|short|almost finished|finished|run out|stock_end|urugero|nta|nta umutwe|birakabije|birangiye|birenze|mubitotsi|birakabije|stock ikeje|kabije|kabije|ikabije|ntibihari|biraze)/.test(t)) {
    return 'low_stock';
  }
  // Expiring
  if (/(expir|expiry|expire|ikiruhuko|ikiruhuko cy|cyaguye|izimira|izimye|byarambaraye|expire)/.test(t)) {
    return 'expiring';
  }
  // Stock quantity / inventory level
  if (/(stock|inventory|quantity|how many|available|quantity_left|level|have any|umubare|ububiko|imiti |umutwe wa|bwinshi|bws|bwinshi|bangana|banga)/.test(t)) {
    return 'stock';
  }
  // Forecast
  if (/(forecast|predict|prediction|future|next month|next (2|3|6) months|demand|kubufatabuguzi|kubwiza|kuboneka|kuboneka|kwandika|ihuza|ityazwe|byahise|kuboneka mu gihe|kugeza|kubaho|ibyatanzwe)/.test(t)) {
    return 'forecast';
  }
  // Recommendations
  if (/(recommend|suggest|should i order|what to buy|buy|purchase recommend|order that|ibyo guhana|kugura|kugura|buy|iba yagirans|icyo kugura)/.test(t)) {
    return 'recommendation';
  }
  // Requests
  if (/(request|order status|pending request|medicine request|sabwaho|musabwa|guhabwa|icyifuzo|icyifuzo cy|urwanzuzo|icyifuzo|sabwa)/.test(t)) {
    return 'request';
  }
  // Deliveries
  if (/(deliver|delivery|track|shipping|transport|guhabwa|koherezwa|icyifuzo|itumanaho|gukorana|itumanaho|gushyikirwa|gushyikirwa|where is my)|how long|eta|gukorana|umurimo/.test(t)) {
    return 'delivery';
  }
  // Purchase orders
  if (/(purchase order|po number|order|supplier|procure|guhana|icyifuzo cyo guhana|kugura|gukorana n|ikoreshwa)/.test(t)) {
    return 'purchase_order';
  }
  // Facilities
  if (/(facility|hospital|health center|clinic|warehouse|ibitange|ubitaro|ibitaro|urwego|ikigo)/.test(t)) {
    return 'facility';
  }
  // Medicines list
  if (/(what medicines|list of medicines|medicine list|available medicines|imiti ibaho|urongozi rw'imiti|imiye|imiti iriho)/.test(t)) {
    return 'medicines';
  }
  // Dashboard stats
  if (/(statistics|stats|summary|overview|total|count|dashboard|imibare|ibarura|amakuru|ikigereranyo|umubare wose)/.test(t)) {
    return 'stats';
  }
  // General / default
  return 'general';
}

// ---------------------------
// Response builders
// ---------------------------
function greeting(lang) {
  return lang === 'rw'
    ? 'Muraho! Ndi MedSupply AI Assistant. Mubaza ikibazo cyose kijyanye n\'imiti, ububiko, ibicuruzwa, koherezwa, forecasting na recommendations. Mbwira icyo ushaka!'
    : 'Hello! I am the MedSupply AI Assistant. Ask me anything about medicines, stock, orders, deliveries, forecasts, and recommendations. What would you like to know?';
}

function thanks(lang) {
  return lang === 'rw'
    ? 'Murakoze! Niba hari ikindi kibazo, ndi hano kugirango nkubafashe.'
    : 'You\'re welcome! If you have any more questions, I\'m here to help.';
}

const HELP = {
  en: `I can help you with questions about the medical supply chain. Here are some things you can ask me:
• "What medicines are low in stock?"
• "How much stock of Paracetamol do we have?"
• "What medicines are expiring soon?"
• "Show me forecast for next month"
• "What should I order?"
• "Status of my medicine requests"
• "Track my delivery"
• "Give me a dashboard summary"

Ask in English or Kinyarwanda!`,
  rw: `Ndashobora kugufasha kubibazo byose kuri system ya medical supply chain. Hano ni byo ushobora kumbaza:
• "Ni iyihe miti iri ku rutonde rw\'inkende?" (low stock)
• "Umutwe wa Paracetamol uri mu mubare ungana?"
• "Ni iyihe miti izimira vuba?"
• "Nyeza forecast y\'ukwezi gutaha"
• "Niki nsabwa kugura?"
• "Ibibazo by\'imiti byanjye biri he?"
• "Aho delivery yanjye iri?"
• "Mpa imibare y\'amakuru yose"

Baza mu cyongereza cyangwa Ikinyarwanda!`,
};

function help(lang) { return HELP[lang]; }

// Generic fallback that doesn't know the answer
function general(lang) {
  return lang === 'rw'
    ? 'Nabisomye neza. Nta makuru n\'afite y\'ibyo ubaza. Ushobora kumbaza ibijyanye n\'imiti, ububiko, koherezwa, forecasts, recommendations, cyangwa ubufasha (help).'
    : 'I understood your message, but I couldn\'t find relevant data for that. You can ask me about medicines, stock levels, deliveries, forecasts, recommendations, or type "help" to see what I can do.';
}

// ---------------------------
// Data-aware handlers
// ---------------------------
async function collectFacilities() {
  const r = await query('SELECT id, name, type FROM facilities WHERE is_active = true ORDER BY name');
  return r.rows;
}

async function collectMedicines() {
  const r = await query('SELECT id, name, generic_name, unit FROM medicines WHERE is_active = true ORDER BY name');
  return r.rows;
}

async function getLowStock(lang, facilityId) {
  let sql = `
    SELECT m.name, m.unit, COALESCE(i.quantity, 0) as quantity, m.safety_stock, m.reorder_level,
           f.name as facility_name
    FROM medicines m
    LEFT JOIN inventory i ON i.medicine_id = m.id
    LEFT JOIN facilities f ON i.facility_id = f.id
    WHERE (COALESCE(i.quantity,0) <= m.safety_stock) AND m.is_active = true
  `;
  const params = [];
  if (facilityId) {
    params.push(facilityId);
    sql += ` AND i.facility_id = $${params.length}`;
  }
  sql += ' ORDER BY quantity ASC LIMIT 10';
  const r = await query(sql, params);
  const rows = r.rows;
  if (rows.length === 0) {
    return lang === 'rw'
      ? 'Nta miti iri ku rutonde rw\'inkende (low stock). Byose birahagije.'
      : 'No medicines are low in stock. Everything is well stocked.';
  }
  const lines = rows.map(x => `${x.name}: ${x.quantity} ${x.unit} (safety stock ${x.safety_stock})${x.facility_name ? ' @ ' + x.facility_name : ''}`);
  return (lang === 'rw' ? 'Iyi miti iri ku rutonde rw\'inkende (low stock):\n' : 'These medicines are low in stock:\n') + lines.join('\n');
}

async function getExpiring(lang) {
  const r = await query(`
    SELECT m.name, sb.expiry_date, sb.remaining_quantity, f.name as facility_name
    FROM stock_batches sb
    JOIN medicines m ON sb.medicine_id = m.id
    LEFT JOIN facilities f ON sb.facility_id = f.id
    WHERE sb.status = 'ACTIVE' AND sb.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'
    ORDER BY sb.expiry_date ASC LIMIT 10
  `);
  const rows = r.rows;
  if (rows.length === 0) {
    return lang === 'rw'
      ? 'Nta miti izimira mu mezi atatu azaza.'
      : 'No medicines are expiring in the next 90 days.';
  }
  const lines = rows.map(x => `${x.name}: expires ${new Date(x.expiry_date).toLocaleDateString()} (${x.remaining_quantity} left)${x.facility_name ? ' @ ' + x.facility_name : ''}`);
  return (lang === 'rw' ? 'Iyi miti izimira vuba:\n' : 'These medicines are expiring soon:\n') + lines.join('\n');
}

async function getStockForMedicine(lang, medicineName) {
  const r = await query(`
    SELECT m.name, m.unit, COALESCE(i.quantity,0) as quantity, m.safety_stock, f.name as facility_name
    FROM medicines m
    LEFT JOIN inventory i ON i.medicine_id = m.id
    LEFT JOIN facilities f ON i.facility_id = f.id
    WHERE LOWER(m.name) LIKE LOWER($1) AND m.is_active = true
    ORDER BY f.name
  `, [`%${medicineName}%`]);
  const rows = r.rows;
  if (rows.length === 0) {
    return lang === 'rw'
      ? `Nta makuru mbona kuri "${medicineName}". Ese byanditse neza?`
      : `I couldn't find any stock information for "${medicineName}". Is the spelling correct?`;
  }
  const lines = rows.map(x => `${x.facility_name || 'Facility'}: ${x.quantity} ${x.unit} (safety stock ${x.safety_stock})`);
  return (lang === 'rw' ? `Ububiko bwa ${rows[0].name}:\n` : `Stock for ${rows[0].name}:\n`) + lines.join('\n');
}

async function getForecast(lang, facilityId) {
  let sql = `
    SELECT m.name, af.predicted_quantity, af.forecast_month, af.forecast_year, m.unit
    FROM ai_forecasts af
    JOIN medicines m ON af.medicine_id = m.id
    WHERE (af.forecast_year * 12 + af.forecast_month) > (EXTRACT(YEAR FROM CURRENT_DATE) * 12 + EXTRACT(MONTH FROM CURRENT_DATE))
  `;
  const params = [];
  if (facilityId) {
    params.push(facilityId);
    sql += ` AND af.facility_id = $${params.length}`;
  }
  sql += ' ORDER BY af.forecast_year ASC, af.forecast_month ASC LIMIT 10';
  const r = await query(sql, params);
  const rows = r.rows;
  if (rows.length === 0) {
    return lang === 'rw'
      ? 'Nta forecast iboneka muri iki gihe. Koresha itegeko "Populate forecasts" cyangwa menya forecast nyuma yo gufata data.'
      : 'No forecasts are available right now. Please generate forecasts first from the Forecast page.';
  }
  const lines = rows.map(x => `${x.name}: ${x.predicted_quantity} ${x.unit} (${x.forecast_month}/${x.forecast_year})`);
  return (lang === 'rw' ? 'Ibintu biteganijwe (forecasts) biri muri iki gihe:\n' : 'Current forecasts:\n') + lines.join('\n');
}

async function getRecommendations(lang, facilityId) {
  const now = new Date();
  const curIndex = now.getFullYear() * 12 + (now.getMonth() + 1);
  const maxIndex = curIndex + 3;
  let sql = `
    SELECT m.name, m.unit, SUM(af.predicted_quantity) as predicted_total,
           COALESCE(i.quantity,0) as current_quantity, m.safety_stock
    FROM ai_forecasts af
    JOIN medicines m ON af.medicine_id = m.id
    LEFT JOIN inventory i ON af.medicine_id = i.medicine_id AND (i.facility_id = af.facility_id OR i.facility_id IS NULL)
    WHERE (af.forecast_year * 12 + af.forecast_month) > $1
      AND (af.forecast_year * 12 + af.forecast_month) <= $2
  `;
  const params = [curIndex, maxIndex];
  if (facilityId) {
    params.push(facilityId);
    sql += ` AND af.facility_id = $${params.length}`;
  }
  sql += ' GROUP BY m.name, m.unit, i.quantity, m.safety_stock ORDER BY predicted_total DESC LIMIT 10';
  const r = await query(sql, params);
  const rows = r.rows;
  if (rows.length === 0) {
    return lang === 'rw'
      ? 'Nta recommendations ziboneka. Tanga forecasts mbere.'
      : 'No recommendations available. Please generate forecasts first.';
  }
  const lines = rows.map(x => {
    const recommended = Math.max(0, Math.round(x.predicted_total - Math.max(0, x.current_quantity - x.safety_stock)));
    return `${x.name}: order ${recommended} ${x.unit} (predicted ${Math.round(x.predicted_total)}, current ${x.current_quantity})`;
  });
  return (lang === 'rw' ? 'Ibyo usabwa kugura (recommendations):\n' : 'Recommended purchases:\n') + lines.join('\n');
}

async function getRequests(lang, facilityId) {
  let sql = `
    SELECT r.request_number, r.status, r.priority, f.name as facility_name
    FROM medicine_requests r
    LEFT JOIN facilities f ON r.requesting_facility_id = f.id
    WHERE 1=1
  `;
  const params = [];
  if (facilityId) {
    params.push(facilityId);
    sql += ` AND r.requesting_facility_id = $${params.length}`;
  }
  sql += ' ORDER BY r.created_at DESC LIMIT 10';
  const r = await query(sql, params);
  const rows = r.rows;
  if (rows.length === 0) {
    return lang === 'rw' ? 'Nta bibazo by\'imiti bibonetse.' : 'No medicine requests found.';
  }
  const lines = rows.map(x => `${x.request_number}: ${x.status} (${x.priority})${x.facility_name ? ' @ ' + x.facility_name : ''}`);
  return (lang === 'rw' ? 'Ibibazo by\'imiti:\n' : 'Medicine requests:\n') + lines.join('\n');
}

async function getDeliveries(lang, facilityId) {
  let sql = `
    SELECT d.delivery_number, d.status, d.estimated_arrival, o.name as origin_name, dest.name as dest_name
    FROM deliveries d
    LEFT JOIN facilities o ON d.origin_facility_id = o.id
    LEFT JOIN facilities dest ON d.destination_facility_id = dest.id
    WHERE 1=1
  `;
  const params = [];
  if (facilityId) {
    params.push(facilityId);
    sql += ` AND (d.origin_facility_id = $${params.length} OR d.destination_facility_id = $${params.length})`;
  }
  sql += ' ORDER BY d.created_at DESC LIMIT 10';
  const r = await query(sql, params);
  const rows = r.rows;
  if (rows.length === 0) {
    return lang === 'rw' ? 'Nta deliveries zibonetse.' : 'No deliveries found.';
  }
  const lines = rows.map(x => `${x.delivery_number}: ${x.status} (${x.origin_name || '?'} → ${x.dest_name || '?'})${x.estimated_arrival ? ' ETA ' + new Date(x.estimated_arrival).toLocaleDateString() : ''}`);
  return (lang === 'rw' ? 'Koherezwa (deliveries):\n' : 'Deliveries:\n') + lines.join('\n');
}

async function getPurchaseOrders(lang) {
  const r = await query(`
    SELECT po.po_number, po.status, po.total_amount, f.name as supplier_name
    FROM purchase_orders po
    LEFT JOIN facilities f ON po.supplier_id = f.id
    ORDER BY po.created_at DESC LIMIT 10
  `);
  const rows = r.rows;
  if (rows.length === 0) {
    return lang === 'rw' ? 'Nta purchase orders zibonetse.' : 'No purchase orders found.';
  }
  const lines = rows.map(x => `${x.po_number}: ${x.status} (${x.supplier_name || '?'}) — ${Number(x.total_amount || 0).toLocaleString()} RWF`);
  return (lang === 'rw' ? 'Purchase orders:\n' : 'Purchase orders:\n') + lines.join('\n');
}

async function getFacilities(lang) {
  const r = await query('SELECT name, type, district_id FROM facilities WHERE is_active = true ORDER BY name LIMIT 15');
  const rows = r.rows;
  if (rows.length === 0) {
    return lang === 'rw' ? 'Nta facilities zibonetse.' : 'No facilities found.';
  }
  const lines = rows.map(x => `${x.name} (${x.type})`);
  return (lang === 'rw' ? 'Ibitaro / ibigo:\n' : 'Facilities:\n') + lines.join('\n');
}

async function getMedicines(lang) {
  const r = await query('SELECT name, unit FROM medicines WHERE is_active = true ORDER BY name LIMIT 20');
  const rows = r.rows;
  if (rows.length === 0) {
    return lang === 'rw' ? 'Nta miti ibonetse.' : 'No medicines found.';
  }
  const lines = rows.map(x => `${x.name} (${x.unit})`);
  return (lang === 'rw' ? 'Urutonde rw\'imiti:\n' : 'List of medicines:\n') + lines.join('\n');
}

async function getStats(lang) {
  const [m, inv, req, del, po, low] = await Promise.all([
    query('SELECT COUNT(*)::int as c FROM medicines WHERE is_active = true'),
    query('SELECT COUNT(*)::int as c FROM inventory'),
    query('SELECT COUNT(*)::int as c FROM medicine_requests'),
    query('SELECT COUNT(*)::int as c FROM deliveries'),
    query('SELECT COUNT(*)::int as c FROM purchase_orders'),
    query('SELECT COUNT(*)::int as c FROM medicines m LEFT JOIN inventory i ON i.medicine_id = m.id WHERE COALESCE(i.quantity,0) <= m.safety_stock'),
  ]);
  return lang === 'rw'
    ? `Imibare y'ahantu hose:\n• Imiti: ${m.rows[0].c}\n• Inventory: ${inv.rows[0].c}\n• Ibibazo by'imiti: ${req.rows[0].c}\n• Koherezwa: ${del.rows[0].c}\n• Purchase orders: ${po.rows[0].c}\n• Low stock: ${low.rows[0].c}`
    : `Overall summary:\n• Medicines: ${m.rows[0].c}\n• Inventory records: ${inv.rows[0].c}\n• Medicine requests: ${req.rows[0].c}\n• Deliveries: ${del.rows[0].c}\n• Purchase orders: ${po.rows[0].c}\n• Low stock items: ${low.rows[0].c}`;
}

// ---------------------------
// Main entry
// ---------------------------
async function processQuestion(text, user = {}) {
  const lang = detectLanguage(text);
  const intent = detectIntent(text);
  const facilityId = user.facilityId || null;
  const lower = (text || '').toLowerCase();

  // Extract a medicine name from the question (for stock lookups)
  let medicineName = null;
  if (intent === 'stock') {
    const meds = await collectMedicines();
    const match = meds.find(m => lower.includes(m.name.toLowerCase()) || (m.generic_name && lower.includes(m.generic_name.toLowerCase())));
    if (match) medicineName = match.name;
  }

  try {
    switch (intent) {
      case 'greeting': return { answer: greeting(lang), intent, lang };
      case 'thanks':   return { answer: thanks(lang), intent, lang };
      case 'help':     return { answer: help(lang), intent, lang };
      case 'low_stock': return { answer: await getLowStock(lang, facilityId), intent, lang };
      case 'expiring':  return { answer: await getExpiring(lang), intent, lang };
      case 'stock':
        if (medicineName) return { answer: await getStockForMedicine(lang, medicineName), intent, lang };
        return { answer: await getLowStock(lang, facilityId), intent, lang };
      case 'forecast':   return { answer: await getForecast(lang, facilityId), intent, lang };
      case 'recommendation': return { answer: await getRecommendations(lang, facilityId), intent, lang };
      case 'request':    return { answer: await getRequests(lang, facilityId), intent, lang };
      case 'delivery':   return { answer: await getDeliveries(lang, facilityId), intent, lang };
      case 'purchase_order': return { answer: await getPurchaseOrders(lang), intent, lang };
      case 'facility':   return { answer: await getFacilities(lang), intent, lang };
      case 'medicines':  return { answer: await getMedicines(lang), intent, lang };
      case 'stats':      return { answer: await getStats(lang), intent, lang };
      default:
        // Try to detect a medicine mention even in general queries
        if (!medicineName) {
          const meds = await collectMedicines();
          const match = meds.find(m => lower.includes(m.name.toLowerCase()));
          if (match) medicineName = match.name;
        }
        if (medicineName) return { answer: await getStockForMedicine(lang, medicineName), intent: 'stock', lang };
        return { answer: general(lang), intent, lang };
    }
  } catch (e) {
    return {
      answer: lang === 'rw'
        ? `Hari ikibazo mu kubona data (${e.message}). Gerageza nyuma.`
        : `There was an error retrieving data (${e.message}). Please try again.`,
      intent, lang, error: true,
    };
  }
}

module.exports = { processQuestion, detectIntent, detectLanguage };
