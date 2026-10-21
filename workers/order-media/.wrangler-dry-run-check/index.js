var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../../src/shared/utils/manualOrderRules.js
var partsInDhaka = /* @__PURE__ */ __name((date = /* @__PURE__ */ new Date()) => Object.fromEntries(
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date).map(({ type, value }) => [type, value])
), "partsInDhaka");
var dhakaToday = /* @__PURE__ */ __name((date = /* @__PURE__ */ new Date()) => {
  const parts = partsInDhaka(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}, "dhakaToday");
var dhakaHour = /* @__PURE__ */ __name((date = /* @__PURE__ */ new Date()) => Number(partsInDhaka(date).hour), "dhakaHour");
var dateOffsetFromDhaka = /* @__PURE__ */ __name((isoDate, now = /* @__PURE__ */ new Date()) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate || "")) return NaN;
  const [year, month, day] = isoDate.split("-").map(Number);
  const chosen = new Date(Date.UTC(year, month - 1, day));
  if (chosen.getUTCFullYear() !== year || chosen.getUTCMonth() !== month - 1 || chosen.getUTCDate() !== day) return NaN;
  const [todayYear, todayMonth, todayDay] = dhakaToday(now).split("-").map(Number);
  return Math.round((chosen.getTime() - Date.UTC(todayYear, todayMonth - 1, todayDay)) / 864e5);
}, "dateOffsetFromDhaka");
var minimumDeliveryOffset = /* @__PURE__ */ __name(({ area, now = /* @__PURE__ */ new Date() }) => {
  if (area !== "inside" && area !== "outside") return NaN;
  const afterCutoff = dhakaHour(now) >= 18;
  if (area === "outside") return afterCutoff ? 3 : 2;
  return afterCutoff ? 2 : 1;
}, "minimumDeliveryOffset");
var expeditedSurcharge = /* @__PURE__ */ __name(({ date, area, hasRushProducts, now = /* @__PURE__ */ new Date() }) => {
  if (!hasRushProducts) return 0;
  const days = dateOffsetFromDhaka(date, now);
  const minimum = minimumDeliveryOffset({ area, now });
  if (!Number.isFinite(minimum) || days < minimum) return null;
  const eligibleDays = days - minimum;
  return eligibleDays === 0 ? 100 : eligibleDays === 1 ? 50 : 0;
}, "expeditedSurcharge");

// ../../src/pages/manual-order/catalog.js
var MANUAL_ORDER_CATALOG_DEFAULTS = {
  polaroids: {
    id: "polaroids",
    title: "Polaroids",
    description: "Your favourite photos as classic instant prints.",
    enabled: true,
    order: 1,
    imageUpdatedAt: 0,
    unitPrice: 8,
    minQuantity: 9,
    maxItems: 1
  },
  frames: {
    id: "frames",
    title: "Frames",
    description: "A favourite memory, ready to display.",
    enabled: true,
    order: 2,
    imageUpdatedAt: 0,
    maxQuantity: 20,
    maxItems: 20
  },
  miniMagazines: {
    id: "miniMagazines",
    title: "Mini Pocket Magazine",
    description: "A little story you can carry anywhere.",
    enabled: true,
    order: 3,
    imageUpdatedAt: 0,
    unitPrice: 150,
    maxItems: 20
  },
  magazines: {
    id: "magazines",
    title: "Magazine",
    description: "A custom magazine made around your story.",
    enabled: true,
    order: 4,
    imageUpdatedAt: 0,
    maxItems: 20
  },
  songBooks: {
    id: "songBooks",
    title: "Song Book",
    description: "A song, your lyrics, and your memories in print.",
    enabled: true,
    order: 5,
    imageUpdatedAt: 0,
    unitPrice: 849,
    maxItems: 20
  }
};
var MANUAL_ORDER_TYPE_TO_CARD = {
  polaroids: "polaroids",
  frame: "frames",
  "mini-magazine": "miniMagazines",
  magazine: "magazines",
  "song-book": "songBooks"
};
var mergeManualOrderCatalog = /* @__PURE__ */ __name((value = {}) => Object.fromEntries(
  Object.entries(MANUAL_ORDER_CATALOG_DEFAULTS).map(([id, defaults]) => [id, { ...defaults, ...value?.[id] ?? {} }])
), "mergeManualOrderCatalog");

// src/guestOrders.js
var FIRESTORE = "https://firestore.googleapis.com/v1/projects";
var IMAGE_TYPES = /* @__PURE__ */ new Set(["image/jpeg", "image/png", "image/webp"]);
var MAX_IMAGE_BYTES = 10 * 1024 * 1024;
var SAFE_ID = /^[a-f0-9]{32}$/i;
var CATEGORIES = ["Birthday", "Couple", "Anniversary", "Personal", "Parents", "Marriage", "Special Day", "Farewell", "Best Friends", "Other"];
var CATEGORY_REQUIRED = {
  Birthday: ["name", "age", "date"],
  Couple: ["names"],
  Anniversary: ["names", "date", "year"],
  Personal: ["name"],
  Parents: ["names"],
  Marriage: ["names", "date"],
  "Special Day": ["name"],
  Farewell: ["name"],
  "Best Friends": ["names"],
  Other: ["occasion"]
};
var CATEGORY_LABELS = { name: "Name", age: "Age", date: "Date", names: "Names", year: "Anniversary year", occasion: "Occasion" };
var DEFAULT_SIZES = [
  ["a4-4", "A4", 4, 299],
  ["a4-8", "A4", 8, 549],
  ["a4-12", "A4", 12, 749],
  ["a4-16", "A4", 16, 949],
  ["a4-20", "A4", 20, 1149],
  ["a4-24", "A4", 24, 1349],
  ["a4-28", "A4", 28, 1649],
  ["a4-32", "A4", 32, 1949],
  ["a4-36", "A4", 36, 2149],
  ["a4-40", "A4", 40, 2349],
  ["a5-4", "A5", 4, 200],
  ["a5-8", "A5", 8, 0]
].map(([id, format, pages, price]) => ({ id, format, pages, price, photos: "" }));
var DEFAULT_FRAME_OPTIONS = [
  { id: "Small (6\xD78 in)", label: "Small (6\xD78 in)", price: 699 },
  { id: "Medium (8\xD710 in)", label: "Medium (8\xD710 in)", price: 999 },
  { id: "Large (12\xD716 in)", label: "Large (12\xD716 in)", price: 1499 }
];
var text = /* @__PURE__ */ __name((value, max = 2e3) => String(value ?? "").trim().slice(0, max), "text");
var safeName = /* @__PURE__ */ __name((value) => text(value, 180).replace(/[\u0000-\u001f]/g, ""), "safeName");
var json = /* @__PURE__ */ __name((body, status, cors) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...cors } }), "json");
async function readLimitedBody(stream) {
  if (!stream) return new Uint8Array(0);
  const reader = stream.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_IMAGE_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}
__name(readLimitedBody, "readLimitedBody");
function decodeValue(value = {}) {
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return value.booleanValue;
  if ("nullValue" in value) return null;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return (value.arrayValue.values ?? []).map(decodeValue);
  if ("mapValue" in value) return decodeFields(value.mapValue.fields ?? {});
  return null;
}
__name(decodeValue, "decodeValue");
function decodeFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
}
__name(decodeFields, "decodeFields");
function encodeValue(value) {
  if (value === null || value === void 0) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  return { mapValue: { fields: encodeFields(value) } };
}
__name(encodeValue, "encodeValue");
function encodeFields(value) {
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, encodeValue(entry)]));
}
__name(encodeFields, "encodeFields");
var docsBase = /* @__PURE__ */ __name((project) => `${FIRESTORE}/${encodeURIComponent(project)}/databases/(default)/documents`, "docsBase");
async function getFirestoreDoc(project, path) {
  const response = await fetch(`${docsBase(project)}/${path}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Could not load trusted order settings (${response.status}).`);
  const doc = await response.json();
  return decodeFields(doc.fields ?? {});
}
__name(getFirestoreDoc, "getFirestoreDoc");
function parseProductOptions(value = "") {
  return String(value).split("\n").map((line) => {
    const [label = "", rawPrice = ""] = line.split("|").map((part) => part.trim());
    return { id: label, label, price: Number(rawPrice) };
  }).filter((option) => option.label && Number.isFinite(option.price) && option.price > 0);
}
__name(parseProductOptions, "parseProductOptions");
async function trustedCatalog(project) {
  const frameDoc = await getFirestoreDoc(project, "contentData/products--frame");
  const sizeDocs = await Promise.all(DEFAULT_SIZES.map((size) => getFirestoreDoc(project, `contentData/printSizes--${encodeURIComponent(size.id)}`)));
  const settingsDoc = await getFirestoreDoc(project, "contentData/orderSettings--singleton");
  const manualOrderDoc = await getFirestoreDoc(project, "contentData/manualOrderCatalog--singleton");
  const frameProduct = frameDoc?.value;
  const configuredSizes = DEFAULT_SIZES.map((fallback, index) => {
    const saved = sizeDocs[index]?.value;
    return saved ? { ...fallback, ...saved, id: fallback.id } : fallback;
  });
  return {
    frameOptions: frameProduct ? parseProductOptions(frameProduct.options) : DEFAULT_FRAME_OPTIONS,
    sizes: configuredSizes,
    deliverySettings: settingsDoc?.value ?? {},
    manualOrderCatalog: mergeManualOrderCatalog(manualOrderDoc?.value ?? MANUAL_ORDER_CATALOG_DEFAULTS)
  };
}
__name(trustedCatalog, "trustedCatalog");
function dhakaNow(now = /* @__PURE__ */ new Date()) {
  return Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now).map(({ type, value }) => [type, value]));
}
__name(dhakaNow, "dhakaNow");
async function verifyMedia(env, sessionKey, files, allowEmpty = true) {
  if (!Array.isArray(files) || !allowEmpty && !files.length || files.length > 50) throw new Error("This item has an invalid number of photos.");
  const verified = [];
  for (const file of files) {
    const id = String(file?.id ?? "");
    const key = String(file?.storageKey ?? "");
    const size = Number(file?.size);
    const type = String(file?.type ?? "");
    if (!SAFE_ID.test(id) || key !== `manual-orders/${sessionKey}/${id}` || !IMAGE_TYPES.has(type) || !Number.isInteger(size) || size < 1 || size > MAX_IMAGE_BYTES) {
      throw new Error("An uploaded photo is invalid. Please remove it and add it again.");
    }
    const object = await env.MEDIA_BUCKET.head(key);
    if (!object || Number(object.size) !== size || object.httpMetadata?.contentType !== type) throw new Error(`The uploaded photo ${safeName(file.name)} could not be verified. Please upload it again.`);
    verified.push({ id, name: safeName(file.name) || "order-photo", size, type, storageKey: key });
  }
  return verified;
}
__name(verifyMedia, "verifyMedia");
async function verifyReference(env, sessionKey, file) {
  if (!file) return null;
  const verified = await verifyMedia(env, sessionKey, [file], false);
  return verified[0];
}
__name(verifyReference, "verifyReference");
function coverName(files, id) {
  return files.find((file) => file.id === id)?.name ?? "";
}
__name(coverName, "coverName");
function assertCovers(files, item) {
  if (files.length < 2) throw new Error("Add at least two photos so every front and back cover can be selected.");
  if (!files.some((file) => file.id === item.frontId) || !files.some((file) => file.id === item.backId)) throw new Error("Choose front and back cover photos from this item\u2019s uploaded photos.");
}
__name(assertCovers, "assertCovers");
function buildItem(input, config, photos, referenceFile) {
  const quantity = Number(input.quantity ?? 1);
  const notes = text(input.notes, 2e3);
  if (!Number.isSafeInteger(quantity) || quantity < 1) throw new Error("One item has an invalid quantity.");
  const cardId = MANUAL_ORDER_TYPE_TO_CARD[input.type];
  const card = cardId ? config.manualOrderCatalog[cardId] : null;
  if (!card?.enabled) throw new Error("One of the selected products is no longer available. Remove it and try again.");
  if (input.type === "polaroids") {
    const unitPrice = Number(card.unitPrice);
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) throw new Error("Polaroid pricing is not available. Please contact us.");
    if (quantity < Number(card.minQuantity || 9)) throw new Error(`Polaroids must be ordered in quantities of ${Number(card.minQuantity || 9)} or more.`);
    if (!photos.length) throw new Error("Add at least one photo for the Polaroids.");
    return { kind: "polaroids", id: "polaroids", name: card.title, optionLabel: `${quantity} pieces`, qty: quantity, price: unitPrice, note: notes, photos: { count: photos.length, files: photos, reference: referenceFile, names: photos.map((file) => file.name) } };
  }
  if (input.type === "frame") {
    if (quantity > Number(card.maxQuantity || 20)) throw new Error(`Frame quantity cannot be more than ${Number(card.maxQuantity || 20)} for one size.`);
    const option = config.frameOptions.find((row) => row.id === input.optionId);
    if (!option) throw new Error("A selected frame size is no longer available. Please choose another size.");
    if (photos.length !== 1) throw new Error("Add one print photo for each frame configuration.");
    return { kind: "frame", id: "frame", name: card.title, optionLabel: option.label, qty: quantity, price: option.price, note: notes, photos: { count: 1, files: photos, reference: referenceFile, names: photos.map((file) => file.name) } };
  }
  if (input.type === "mini-magazine") {
    const unitPrice = Number(card.unitPrice);
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) throw new Error("Mini Magazine pricing is not available. Please contact us.");
    if (quantity !== 1 || photos.length < 2 || photos.length > 8) throw new Error("Each Mini Pocket Magazine needs 2 to 8 photos.");
    assertCovers(photos, input);
    return { kind: "mini-magazine", id: "mini-pocket-magazine", name: card.title, optionLabel: `${photos.length} photos`, qty: 1, price: unitPrice, note: notes, details: notes ? [{ label: "Notes", value: notes }] : [], meta: { pages: 8 }, photos: { count: photos.length, files: photos, names: photos.map((file) => file.name), front: coverName(photos, input.frontId), back: coverName(photos, input.backId), frontId: input.frontId, backId: input.backId } };
  }
  if (input.type === "magazine") {
    const size = config.sizes.find((row) => row.id === input.sizeId && Number(row.price) > 0);
    if (!size || size.format === "A4" && (size.pages < 4 || size.pages > 40 || size.pages % 4 !== 0) || size.format === "A5" && ![4, 8].includes(size.pages)) throw new Error("A selected magazine size or page count is unavailable. Please choose a configured option.");
    if (quantity !== 1 || !CATEGORIES.includes(input.category)) throw new Error("Each magazine must be configured separately with a valid category.");
    for (const key of CATEGORY_REQUIRED[input.category] ?? []) if (!text(input.custom?.[key], 300)) throw new Error(`${CATEGORY_LABELS[key]} is required for this magazine.`);
    assertCovers(photos, input);
    const details = [{ label: "Occasion", value: input.category }];
    for (const [key, value] of Object.entries(input.custom ?? {})) if (text(value, 300)) details.push({ label: CATEGORY_LABELS[key] ?? key, value: text(value, 300) });
    if (notes) details.push({ label: "Additional notes", value: notes });
    return { kind: "magazine", id: "custom-magazine", name: card.title, optionLabel: `${size.format} \xB7 ${size.pages} Pages`, qty: 1, price: Number(size.price), meta: { pages: size.pages, photos: size.photos || "", format: size.format }, details, photos: { count: photos.length, files: photos, names: photos.map((file) => file.name), front: coverName(photos, input.frontId), back: coverName(photos, input.backId), frontId: input.frontId, backId: input.backId } };
  }
  if (input.type === "song-book") {
    const unitPrice = Number(card.unitPrice);
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) throw new Error("Song Book pricing is not available. Please contact us.");
    if (quantity !== 1 || !text(input.songName, 200) || !text(input.lyrics, 2e4)) throw new Error("Enter a song name and lyrics for each Song Book.");
    assertCovers(photos, input);
    const details = [{ label: "Song name", value: text(input.songName, 200) }, { label: "Lyrics", value: text(input.lyrics, 2e4) }];
    if (notes) details.push({ label: "Additional notes", value: notes });
    return { kind: "song-book", id: "song-book", name: card.title, optionLabel: "12 pages", qty: 1, price: unitPrice, meta: { pages: 12 }, details, photos: { count: photos.length, files: photos, names: photos.map((file) => file.name), front: coverName(photos, input.frontId), back: coverName(photos, input.backId), frontId: input.frontId, backId: input.backId } };
  }
  throw new Error("This product is not available in the manual order form.");
}
__name(buildItem, "buildItem");
function labelArea(area) {
  return area === "inside" ? "Inside Dhaka" : "Outside Dhaka";
}
__name(labelArea, "labelArea");
function bdShortDate(date = /* @__PURE__ */ new Date()) {
  const { year, month, day } = dhakaNow(date);
  return `${year.slice(-2)}${month}${day}`;
}
__name(bdShortDate, "bdShortDate");
function firestoreDoc(data) {
  return { fields: encodeFields(data) };
}
__name(firestoreDoc, "firestoreDoc");
async function createOrder(env, order, project, orderId) {
  const collection = `${docsBase(project)}/orders?documentId=${encodeURIComponent(orderId)}`;
  const response = await fetch(collection, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(firestoreDoc(order)) });
  if (response.ok) return { order, created: true };
  if (response.status === 409 || response.status === 400) {
    const existing = await fetch(`${docsBase(project)}/orders/${encodeURIComponent(orderId)}`);
    if (existing.ok) {
      const saved = decodeFields((await existing.json()).fields ?? {});
      if (saved.submissionKey === order.submissionKey) return { order: saved, created: false };
    }
  }
  const problem = await response.json().catch(() => null);
  console.error("Guest order save failed", response.status, problem?.error?.status);
  throw new Error("We could not save your order right now. Please retry in a moment.");
}
__name(createOrder, "createOrder");
async function handleGuestOrder(request, env, cors) {
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > 1024 * 1024) return json({ error: "The order details are too large." }, 413, cors);
  let input;
  try {
    input = await request.json();
  } catch {
    return json({ error: "Order details are not valid JSON." }, 400, cors);
  }
  const submissionKey = String(input.submissionKey ?? "");
  if (!SAFE_ID.test(submissionKey)) return json({ error: "Please refresh the order form and try again." }, 400, cors);
  try {
    const customerInput = input.customer ?? {};
    const deliveryInput = input.delivery ?? {};
    const orderName = text(customerInput.name, 100);
    const instagram = text(customerInput.instagram, 30).replace(/^@+/, "");
    const whatsapp = text(customerInput.whatsapp, 40);
    const recipient = text(deliveryInput.recipient, 100);
    const phone = text(deliveryInput.phone, 40);
    const address = text(deliveryInput.address, 500);
    const city = text(deliveryInput.city, 100);
    const area = deliveryInput.area === "inside" || deliveryInput.area === "outside" ? deliveryInput.area : "";
    const date = text(deliveryInput.date, 10);
    if (!orderName || !recipient || !address || !city || !area || !/^[A-Za-z0-9._]{1,30}$/.test(instagram) || !/^(?:\+?88)?01[3-9]\d{8}$/.test(phone.replace(/[\s()-]/g, "")) || !/^(?:\+?88)?01[3-9]\d{8}$/.test(whatsapp.replace(/[\s()-]/g, ""))) throw new Error("Check the required contact and delivery details.");
    const now = /* @__PURE__ */ new Date();
    const offset = dateOffsetFromDhaka(date, now);
    if (!Number.isInteger(offset) || !Array.isArray(input.items) || input.items.length < 1 || input.items.length > 80) throw new Error("Choose a valid delivery date and at least one product.");
    const project = String(env.FIREBASE_PROJECT_ID || "");
    if (!project) throw new Error("Order storage is not configured. Please contact us on WhatsApp.");
    const config = await trustedCatalog(project);
    if (offset < minimumDeliveryOffset({ area, now })) throw new Error("The selected delivery date is too soon for these products. Choose a later date.");
    const mediaRows = [];
    const orderItems = [];
    const itemCounts = /* @__PURE__ */ new Map();
    for (const item of input.items) {
      const cardId = MANUAL_ORDER_TYPE_TO_CARD[item.type];
      const card = cardId ? config.manualOrderCatalog[cardId] : null;
      const itemCount = (itemCounts.get(cardId) || 0) + 1;
      if (!card?.enabled || itemCount > Number(card.maxItems || 20)) throw new Error("One of the selected products is unavailable or has too many items. Please update your order.");
      itemCounts.set(cardId, itemCount);
      const photos = await verifyMedia(env, submissionKey, item.photos ?? [], item.type === "polaroids" ? false : false);
      const reference = await verifyReference(env, submissionKey, item.referenceFile);
      mediaRows.push(...photos, ...reference ? [reference] : []);
      orderItems.push(buildItem(item, config, photos, reference));
    }
    const hasRush = orderItems.some((item) => item.kind === "magazine" || item.kind === "song-book");
    const rushCharge = expeditedSurcharge({ date, area, hasRushProducts: hasRush, now });
    if (rushCharge === null) throw new Error("The selected delivery date is unavailable. Choose a later date.");
    const standardCharge = area === "inside" ? Number(config.deliverySettings.insideDhakaCharge) || 60 : Number(config.deliverySettings.outsideDhakaCharge) || 110;
    const magazineTotal = orderItems.filter((item) => item.kind === "magazine").reduce((sum, item) => sum + item.price * item.qty, 0);
    const otherTotal = orderItems.filter((item) => item.kind !== "magazine").reduce((sum, item) => sum + item.price * item.qty, 0);
    const productSubtotal = magazineTotal + otherTotal;
    const displayDate = (/* @__PURE__ */ new Date(`${date}T12:00:00+06:00`)).toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "long", year: "numeric" });
    const idHash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(submissionKey)))].map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 10).toUpperCase();
    const id = `PB-${bdShortDate()}-${idHash}`;
    const createdAt = (/* @__PURE__ */ new Date()).toISOString();
    const order = {
      id,
      createdAt,
      status: "New",
      source: "Manual guest order",
      submissionKey,
      customer: {
        name: orderName,
        phone: whatsapp,
        whatsapp,
        instagram: `@${instagram}`,
        address: `${address}, ${city}`,
        recipient,
        deliveryPhone: phone,
        deliveryAddress: address,
        ordererName: orderName
      },
      items: orderItems,
      magazineTotal,
      addonTotal: 0,
      otherTotal,
      delivery: `${labelArea(area)} \xB7 ${displayDate}`,
      deliveryInfo: { location: area, locationLabel: labelArea(area), city, date, phone, recipient, address, daysAhead: offset, standardCharge, rushCharge },
      deliveryCharge: standardCharge,
      rushCharge,
      total: productSubtotal + standardCharge + rushCharge,
      orderType: "manual-multi-product"
    };
    const saved = await createOrder(env, order, project, id);
    return json({ order: saved.order }, saved.created ? 201 : 200, cors);
  } catch (error) {
    return json({ error: text(error.message || "We could not validate this order.", 240) }, 400, cors);
  }
}
__name(handleGuestOrder, "handleGuestOrder");
async function handleGuestMedia(request, env, url, cors) {
  const route = url.pathname.match(/^\/guest-media\/([a-f0-9]{32})\/([a-f0-9]{32})$/i);
  if (request.method === "PUT" && route) {
    const [, sessionKey, fileId] = route;
    const type = request.headers.get("Content-Type")?.split(";")[0]?.trim() || "";
    const rawName = request.headers.get("X-File-Name") || "order-photo";
    let name = "order-photo";
    try {
      name = decodeURIComponent(rawName).slice(0, 180).replace(/[\u0000-\u001f]/g, "") || name;
    } catch {
      return json({ error: "The file name is invalid." }, 400, cors);
    }
    if (!IMAGE_TYPES.has(type)) return json({ error: "Use a JPG, PNG, or WebP image." }, 415, cors);
    const body = await readLimitedBody(request.body);
    if (!body) return json({ error: "Each image must be 10 MB or smaller." }, 413, cors);
    const signatureOk = type === "image/jpeg" ? body[0] === 255 && body[1] === 216 && body[2] === 255 : type === "image/png" ? body[0] === 137 && body[1] === 80 && body[2] === 78 && body[3] === 71 : body.length >= 12 && new TextDecoder().decode(body.slice(0, 4)) === "RIFF" && new TextDecoder().decode(body.slice(8, 12)) === "WEBP";
    if (!signatureOk) return json({ error: "This file does not appear to be a valid image." }, 415, cors);
    const key = `manual-orders/${sessionKey}/${fileId}`;
    await env.MEDIA_BUCKET.put(key, body, { httpMetadata: { contentType: type }, customMetadata: { originalName: name } });
    return json({ key, size: body.length, type }, 201, cors);
  }
  if (request.method === "GET") {
    const key = url.searchParams.get("key") || "";
    if (!/^manual-orders\/[a-f0-9]{32}\/[a-f0-9]{32}$/i.test(key)) return json({ error: "Photo not found." }, 404, cors);
    const object = await env.MEDIA_BUCKET.get(key);
    if (!object) return json({ error: "Photo not found." }, 404, cors);
    const headers = new Headers(cors);
    object.writeHttpMetadata(headers);
    headers.set("Cache-Control", "private, max-age=600");
    headers.set("Content-Disposition", "inline");
    return new Response(object.body, { headers });
  }
  if (request.method === "DELETE" && route) {
    await env.MEDIA_BUCKET.delete(`manual-orders/${route[1]}/${route[2]}`);
    return json({ ok: true }, 200, cors);
  }
  return json({ error: "Unsupported photo action." }, 405, cors);
}
__name(handleGuestMedia, "handleGuestMedia");

// src/index.js
var JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
var cachedJwks = null;
var cachedJwksAt = 0;
var json2 = /* @__PURE__ */ __name((body, status, cors = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...cors }
}), "json");
var decode = /* @__PURE__ */ __name((value) => JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)))), "decode");
var bytes = /* @__PURE__ */ __name((value) => Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)), "bytes");
var MAX_IMAGE_BYTES2 = 20 * 1024 * 1024;
async function readLimitedBody2(stream) {
  if (!stream) return new Uint8Array(0);
  const reader = stream.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_IMAGE_BYTES2) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}
__name(readLimitedBody2, "readLimitedBody");
async function getJwks() {
  if (cachedJwks && Date.now() - cachedJwksAt < 50 * 60 * 1e3) return cachedJwks;
  const response = await fetch(JWKS_URL, { cf: { cacheTtl: 3e3, cacheEverything: true } });
  if (!response.ok) throw new Error("Could not load Firebase signing keys");
  cachedJwks = await response.json();
  cachedJwksAt = Date.now();
  return cachedJwks;
}
__name(getJwks, "getJwks");
async function verifyFirebaseToken(request, env) {
  const token = request.headers.get("Authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return null;
  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature) return null;
  const header = decode(encodedHeader);
  const claims = decode(encodedPayload);
  if (header.alg !== "RS256" || !header.kid) return null;
  const now = Math.floor(Date.now() / 1e3);
  if (claims.aud !== env.FIREBASE_PROJECT_ID || claims.iss !== `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}` || !claims.sub || claims.sub.length > 128 || claims.exp <= now || claims.iat > now || claims.auth_time > now) return null;
  const jwks = await getJwks();
  const jwk = jwks.keys?.find((key) => key.kid === header.kid && key.use === "sig");
  if (!jwk) return null;
  const publicKey = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, bytes(encodedSignature), new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`));
  return valid ? claims : null;
}
__name(verifyFirebaseToken, "verifyFirebaseToken");
function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.APP_ORIGIN || "").split(",").map((value) => value.trim()).filter(Boolean);
  if (!allowed.includes(origin)) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-File-Name",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin"
  };
}
__name(corsHeaders, "corsHeaders");
function isAdmin(claims, env) {
  const allowed = (env.ADMIN_EMAILS || "").toLowerCase().split(",").map((email) => email.trim()).filter(Boolean);
  return allowed.includes(String(claims.email || "").toLowerCase());
}
__name(isAdmin, "isAdmin");
async function hasAdminRole(request, env, claims) {
  return isAdmin(claims, env);
}
__name(hasAdminRole, "hasAdminRole");
var index_default = {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (!cors) return json2({ error: "Origin is not allowed." }, 403);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const url = new URL(request.url);
    if (url.pathname === "/guest-orders" && request.method === "POST") return handleGuestOrder(request, env, cors);
    const manualCardImage = url.pathname.match(/^\/manual-order-cards\/(polaroids|frames|miniMagazines|magazines|songBooks)$/);
    if (manualCardImage && request.method === "GET") {
      const object = await env.MEDIA_BUCKET.get(`manual-order-cards/${manualCardImage[1]}`);
      if (!object) return json2({ error: "No product card image has been uploaded yet." }, 404, cors);
      const headers = new Headers(cors);
      object.writeHttpMetadata(headers);
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      return new Response(object.body, { headers });
    }
    if (manualCardImage && ["PUT", "DELETE"].includes(request.method)) {
      const adminClaims = await verifyFirebaseToken(request, env).catch(() => null);
      if (!adminClaims || !await hasAdminRole(request, env, adminClaims)) return json2({ error: "Admin access is required to manage product card images." }, 403, cors);
      const key = `manual-order-cards/${manualCardImage[1]}`;
      if (request.method === "DELETE") {
        await env.MEDIA_BUCKET.delete(key);
        return json2({ ok: true }, 200, cors);
      }
      const contentType = request.headers.get("Content-Type")?.split(";")[0]?.trim() || "";
      const length = Number(request.headers.get("Content-Length") || 0);
      if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) return json2({ error: "Choose a JPG, PNG, or WebP image." }, 415, cors);
      if (length > 10 * 1024 * 1024) return json2({ error: "Card images must be 10 MB or smaller." }, 413, cors);
      const image = await readLimitedBody2(request.body);
      if (image === null || image.byteLength > 10 * 1024 * 1024) return json2({ error: "Card images must be 10 MB or smaller." }, 413, cors);
      if (!image.byteLength) return json2({ error: "The selected image is empty." }, 400, cors);
      await env.MEDIA_BUCKET.put(key, image, {
        httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable" }
      });
      return json2({ ok: true }, 201, cors);
    }
    const catalogImage = url.pathname.match(/^\/catalog-images\/([a-zA-Z0-9_-]{8,80})$/);
    if (catalogImage && request.method === "GET") {
      const object = await env.MEDIA_BUCKET.get(`catalog-images/${catalogImage[1]}`);
      if (!object) return json2({ error: "Image not found." }, 404, cors);
      const headers = new Headers(cors);
      object.writeHttpMetadata(headers);
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      headers.set("Content-Disposition", "inline");
      headers.set("X-Content-Type-Options", "nosniff");
      return new Response(object.body, { headers });
    }
    if (catalogImage && ["PUT", "DELETE"].includes(request.method)) {
      const adminClaims = await verifyFirebaseToken(request, env).catch(() => null);
      if (!adminClaims || !await hasAdminRole(request, env, adminClaims)) return json2({ error: "Admin access is required to manage catalog images." }, 403, cors);
      const key = `catalog-images/${catalogImage[1]}`;
      if (request.method === "DELETE") {
        await env.MEDIA_BUCKET.delete(key);
        return json2({ ok: true }, 200, cors);
      }
      const contentType = request.headers.get("Content-Type")?.split(";")[0]?.trim() || "";
      if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) return json2({ error: "Choose a JPG, PNG, or WebP image." }, 415, cors);
      const image = await readLimitedBody2(request.body);
      if (image === null || image.byteLength > 10 * 1024 * 1024) return json2({ error: "Images must be 10 MB or smaller." }, 413, cors);
      if (!image.byteLength) return json2({ error: "The uploaded image is empty." }, 400, cors);
      await env.MEDIA_BUCKET.put(key, image, {
        httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable" }
      });
      return json2({ ok: true }, 201, cors);
    }
    if (url.pathname === "/guest-media" && request.method === "GET") {
      const adminClaims = await verifyFirebaseToken(request, env).catch(() => null);
      if (!adminClaims || !await hasAdminRole(request, env, adminClaims)) return json2({ error: "Admin access is required to view guest order photos." }, 403, cors);
      return handleGuestMedia(request, env, url, cors);
    }
    if (url.pathname.startsWith("/guest-media/")) return handleGuestMedia(request, env, url, cors);
    const publicPage = url.pathname.match(/^\/books\/(book-[a-z0-9-]{8,80})\/pages\/(\d{1,5})$/);
    if (request.method === "GET" && publicPage) {
      const object = await env.MEDIA_BUCKET.get(`books/${publicPage[1]}/pages/${publicPage[2]}`);
      if (!object) return json2({ error: "Book page not found." }, 404, cors);
      const headers = new Headers(cors);
      object.writeHttpMetadata(headers);
      headers.set("Cache-Control", "public, max-age=3600");
      return new Response(object.body, { headers });
    }
    const publicSource = url.pathname.match(/^\/books\/(book-[a-z0-9-]{8,80})\/source$/);
    if (request.method === "GET" && publicSource) {
      const object = await env.MEDIA_BUCKET.get(`books/${publicSource[1]}/source.pdf`);
      if (!object) return json2({ error: "Original PDF not found." }, 404, cors);
      const headers = new Headers(cors);
      object.writeHttpMetadata(headers);
      headers.set("Cache-Control", "public, max-age=3600");
      headers.set("Content-Disposition", 'inline; filename="magazine.pdf"');
      return new Response(object.body, { headers });
    }
    const claims = await verifyFirebaseToken(request, env).catch(() => null);
    const authlessAdminRoute = url.pathname === "/books" || url.pathname.startsWith("/books/") || url.pathname === "/steadfast/dispatch" || url.pathname === "/media";
    if (!claims && !authlessAdminRoute) return json2({ error: "A valid Firebase sign-in is required." }, 401, cors);
    if (request.method === "POST" && url.pathname === "/steadfast/dispatch") {
      if (claims && !await hasAdminRole(request, env, claims)) return json2({ error: "Admin access is required to dispatch orders." }, 403, cors);
      if (!env.STEADFAST_API_KEY || !env.STEADFAST_SECRET_KEY) {
        return json2({ error: "Steadfast API credentials are not configured on the media Worker." }, 503, cors);
      }
      let input;
      try {
        input = await request.json();
      } catch {
        return json2({ error: "Invalid dispatch details." }, 400, cors);
      }
      const invoice = String(input.invoice || "").trim().slice(0, 80);
      const recipientName = String(input.recipient_name || "").trim().slice(0, 100);
      const rawPhone = String(input.recipient_phone || "").replace(/[^\d]/g, "");
      const recipientPhone = rawPhone.startsWith("8801") && rawPhone.length === 13 ? `0${rawPhone.slice(3)}` : rawPhone.slice(0, 20);
      const recipientAddress = String(input.recipient_address || "").trim().slice(0, 250);
      const codAmount = Number(input.cod_amount);
      if (!invoice || !recipientName || recipientPhone.length < 11 || !recipientAddress || !Number.isFinite(codAmount) || codAmount < 0) {
        return json2({ error: "Enter a valid recipient name, phone, address, and COD amount." }, 400, cors);
      }
      const rawAlternativePhone = String(input.alternative_phone || "").replace(/[^\d]/g, "");
      const payload = {
        invoice,
        recipient_name: recipientName,
        recipient_phone: recipientPhone,
        recipient_address: recipientAddress,
        cod_amount: String(Math.round(codAmount)),
        recipient_email: String(input.recipient_email || "").trim().slice(0, 180),
        alternative_phone: rawAlternativePhone.startsWith("8801") && rawAlternativePhone.length === 13 ? `0${rawAlternativePhone.slice(3)}` : rawAlternativePhone.slice(0, 20),
        item_description: String(input.item_description || "Customized magazine order").trim().slice(0, 200),
        note: String(input.note || "").trim().slice(0, 250)
      };
      let courierResponse;
      try {
        courierResponse = await fetch("https://portal.packzy.com/api/v1/create_order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": env.STEADFAST_API_KEY,
            "secret-key": env.STEADFAST_SECRET_KEY
          },
          body: JSON.stringify(payload)
        });
      } catch (error) {
        console.error("Steadfast request failed", error);
        return json2({ error: "Could not connect to Steadfast. Please retry." }, 502, cors);
      }
      const result = await courierResponse.json().catch(() => ({}));
      if (!courierResponse.ok || result.status !== 200 || !result.consignment) {
        return json2({ error: String(result.message || "Steadfast could not create this consignment.").slice(0, 240) }, 502, cors);
      }
      return json2({
        tracking_code: String(result.consignment.tracking_code || ""),
        consignment_id: String(result.consignment.consignment_id || ""),
        consignment: result.consignment
      }, 201, cors);
    }
    if (request.method === "GET" && url.pathname === "/books") {
      const books = [];
      let cursor;
      do {
        const listed = await env.MEDIA_BUCKET.list({ prefix: "books/", cursor });
        for (const object of listed.objects.filter((item) => item.key.endsWith("/manifest.json"))) {
          const manifest = await env.MEDIA_BUCKET.get(object.key);
          if (!manifest) continue;
          try {
            books.push(await manifest.json());
          } catch {
          }
        }
        cursor = listed.truncated ? listed.cursor : void 0;
      } while (cursor);
      return json2({ books }, 200, cors);
    }
    const manifestPath = url.pathname.match(/^\/books\/(book-[a-z0-9-]{8,80})\/manifest$/);
    if (request.method === "PUT" && manifestPath) {
      let manifest;
      try {
        manifest = await request.json();
      } catch {
        return json2({ error: "Invalid book details." }, 400, cors);
      }
      if (!Number.isInteger(manifest.pageCount) || manifest.pageCount < 1 || !Number.isFinite(manifest.ratio) || manifest.ratio <= 0) return json2({ error: "Invalid book details." }, 400, cors);
      const record = {
        key: manifestPath[1],
        pageCount: manifest.pageCount,
        ratio: manifest.ratio,
        name: String(manifest.name || "Book PDF").slice(0, 180),
        sourceAvailable: true,
        uploadedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await env.MEDIA_BUCKET.put(`books/${record.key}/manifest.json`, JSON.stringify(record), {
        httpMetadata: { contentType: "application/json", cacheControl: "private, no-store" }
      });
      return json2({ book: record }, 201, cors);
    }
    const sourceMultipart = url.pathname.match(/^\/books\/(book-[a-z0-9-]{8,80})\/source\/multipart$/);
    if (sourceMultipart && request.method === "POST") {
      try {
        const upload = await env.MEDIA_BUCKET.createMultipartUpload(`books/${sourceMultipart[1]}/source.pdf`, {
          httpMetadata: { contentType: "application/pdf", cacheControl: "public, max-age=3600" },
          customMetadata: { ownerUid: claims?.sub || "admin" }
        });
        return json2({ uploadId: upload.uploadId }, 201, cors);
      } catch (error) {
        console.error("Could not start Cloudflare R2 PDF upload", error);
        return json2({ error: "Could not start the PDF upload." }, 502, cors);
      }
    }
    if (sourceMultipart && request.method === "DELETE") {
      const uploadId = url.searchParams.get("uploadId") || "";
      if (!uploadId || uploadId.length > 512) return json2({ error: "Invalid PDF upload session." }, 400, cors);
      try {
        await env.MEDIA_BUCKET.resumeMultipartUpload(`books/${sourceMultipart[1]}/source.pdf`, uploadId).abort();
        return json2({ ok: true }, 200, cors);
      } catch (error) {
        console.error("Could not abort Cloudflare R2 PDF upload", error);
        return json2({ error: "Could not cancel the PDF upload." }, 502, cors);
      }
    }
    const sourcePart = url.pathname.match(/^\/books\/(book-[a-z0-9-]{8,80})\/source\/part$/);
    if (request.method === "PUT" && sourcePart) {
      const uploadId = url.searchParams.get("uploadId") || "";
      const partNumber = Number(url.searchParams.get("partNumber"));
      if (!uploadId || uploadId.length > 512 || !Number.isInteger(partNumber) || partNumber < 1 || partNumber > 1e4) {
        return json2({ error: "Invalid PDF upload part." }, 400, cors);
      }
      if (!request.body) return json2({ error: "The PDF upload part is empty." }, 400, cors);
      try {
        const part = await env.MEDIA_BUCKET.resumeMultipartUpload(`books/${sourcePart[1]}/source.pdf`, uploadId).uploadPart(partNumber, request.body);
        return json2({ part }, 200, cors);
      } catch (error) {
        console.error("Could not upload a Cloudflare R2 PDF part", error);
        return json2({ error: `Could not upload PDF part ${partNumber}.` }, 502, cors);
      }
    }
    const sourceComplete = url.pathname.match(/^\/books\/(book-[a-z0-9-]{8,80})\/source\/complete$/);
    if (request.method === "POST" && sourceComplete) {
      let body;
      try {
        body = await request.json();
      } catch {
        return json2({ error: "Invalid PDF upload completion details." }, 400, cors);
      }
      const uploadId = String(body?.uploadId || "");
      const parts = Array.isArray(body?.parts) ? body.parts : [];
      if (!uploadId || uploadId.length > 512 || !parts.length || parts.length > 1e4) return json2({ error: "Invalid PDF upload completion details." }, 400, cors);
      const orderedParts = [...parts].sort((a, b) => Number(a.partNumber) - Number(b.partNumber));
      if (orderedParts.some((part, index) => !Number.isInteger(part.partNumber) || part.partNumber !== index + 1 || typeof part.etag !== "string" || !part.etag)) {
        return json2({ error: "PDF upload parts are incomplete." }, 400, cors);
      }
      try {
        const object = await env.MEDIA_BUCKET.resumeMultipartUpload(`books/${sourceComplete[1]}/source.pdf`, uploadId).complete(orderedParts);
        return json2({ ok: true, size: object.size }, 201, cors);
      } catch (error) {
        console.error("Could not complete Cloudflare R2 PDF upload", error);
        return json2({ error: "Could not finish saving the original PDF." }, 502, cors);
      }
    }
    const uploadSource = url.pathname.match(/^\/books\/(book-[a-z0-9-]{8,80})\/source$/);
    if (request.method === "PUT" && uploadSource) {
      if (request.headers.get("Content-Type") !== "application/pdf") return json2({ error: "An original PDF file is required." }, 415, cors);
      if (!request.body) return json2({ error: "The PDF file is empty." }, 400, cors);
      try {
        await env.MEDIA_BUCKET.put(`books/${uploadSource[1]}/source.pdf`, request.body, {
          httpMetadata: { contentType: "application/pdf", cacheControl: "public, max-age=3600" },
          customMetadata: { ownerUid: claims?.sub || "admin" }
        });
      } catch (error) {
        console.error("Cloudflare R2 original PDF upload failed", error);
        return json2({ error: "Cloudflare R2 could not store the original PDF." }, 502, cors);
      }
      return json2({ ok: true }, 201, cors);
    }
    const uploadPage = url.pathname.match(/^\/books\/(book-[a-z0-9-]{8,80})\/pages\/(\d{1,5})$/);
    if (request.method === "PUT" && uploadPage) {
      const contentType = request.headers.get("Content-Type") || "";
      if (!["image/png", "image/jpeg"].includes(contentType)) return json2({ error: "A rendered book page image is required." }, 415, cors);
      try {
        await env.MEDIA_BUCKET.put(`books/${uploadPage[1]}/pages/${uploadPage[2]}`, request.body, {
          httpMetadata: { contentType, cacheControl: "public, max-age=3600" },
          customMetadata: { ownerUid: claims?.sub || "admin" }
        });
      } catch (error) {
        console.error("Cloudflare R2 book page upload failed", error);
        return json2({ error: "Cloudflare R2 could not store a book page." }, 502, cors);
      }
      return json2({ ok: true }, 201, cors);
    }
    const deleteBook = url.pathname.match(/^\/books\/(book-[a-z0-9-]{8,80})$/);
    if (request.method === "DELETE" && deleteBook) {
      const prefix = `books/${deleteBook[1]}/`;
      let cursor;
      do {
        const listed = await env.MEDIA_BUCKET.list({ prefix, cursor });
        if (listed.objects.length) await env.MEDIA_BUCKET.delete(listed.objects.map((object) => object.key));
        cursor = listed.truncated ? listed.cursor : void 0;
      } while (cursor);
      await env.MEDIA_BUCKET.delete(`books/${deleteBook[1]}/manifest.json`);
      return json2({ ok: true }, 200, cors);
    }
    if (request.method === "PUT" && /^\/media\/[a-zA-Z0-9_-]{8,80}$/.test(url.pathname)) {
      const contentType = request.headers.get("Content-Type") || "";
      const length = Number(request.headers.get("Content-Length") || 0);
      if (!contentType.startsWith("image/")) return json2({ error: "Only image uploads are accepted." }, 415, cors);
      if (length > MAX_IMAGE_BYTES2) return json2({ error: "Images must be 20 MB or smaller." }, 413, cors);
      const id = url.pathname.split("/").pop();
      const key = claims ? `users/${claims.sub}/images/${id}` : `admin/images/${id}`;
      let image;
      try {
        image = await readLimitedBody2(request.body);
      } catch (error) {
        console.error("Could not read uploaded image body", error);
        return json2({ error: "Could not read the uploaded image. Please retry." }, 400, cors);
      }
      if (image === null) return json2({ error: "Images must be 20 MB or smaller." }, 413, cors);
      if (!image.byteLength) return json2({ error: "The uploaded image is empty." }, 400, cors);
      const encodedName = request.headers.get("X-File-Name") || "";
      let fileName = "image";
      try {
        fileName = decodeURIComponent(encodedName).slice(0, 180) || fileName;
      } catch {
      }
      try {
        await env.MEDIA_BUCKET.put(key, image, {
          httpMetadata: { contentType, cacheControl: "private, no-store" },
          customMetadata: { ownerUid: claims?.sub || "admin", fileName }
        });
      } catch (error) {
        console.error("Cloudflare R2 image upload failed", error);
        return json2({ error: "Cloudflare R2 could not store the uploaded image." }, 502, cors);
      }
      return json2({ key }, 201, cors);
    }
    if (request.method === "GET" && url.pathname === "/media") {
      const key = url.searchParams.get("key") || "";
      const match = key.match(/^users\/([A-Za-z0-9_-]{1,128})\/images\/([a-zA-Z0-9_-]{8,80})$/);
      if (!match || claims && match[1] !== claims.sub && !await hasAdminRole(request, env, claims)) return json2({ error: "Photo not found." }, 404, cors);
      const object = await env.MEDIA_BUCKET.get(key);
      if (!object) return json2({ error: "Photo not found." }, 404, cors);
      const headers = new Headers(cors);
      object.writeHttpMetadata(headers);
      headers.set("ETag", object.httpEtag);
      headers.set("Cache-Control", "private, no-store");
      headers.set("Content-Disposition", "inline");
      return new Response(object.body, { headers });
    }
    return json2({ error: "Not found." }, 404, cors);
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
