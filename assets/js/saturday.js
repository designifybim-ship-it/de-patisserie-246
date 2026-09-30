(() => {
  'use strict';

  const root = document.querySelector('.builder-section');
  if (!root) return;

  const q = (selector, scope = document) => scope.querySelector(selector);
  const qa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const toast = message => (window.showToast ? window.showToast(message) : alert(message));

  const flavours = {
    sweetheart: { label: 'Sweetheart Classic', short: 'Classic', image: 'assets/img/classic-cinnamon-roll.png', prices: { 1: 5, 4: 20, 6: 30 } },
    biscoff: { label: 'Biscoff Dream', short: 'Biscoff', image: 'assets/img/biscoff-cinnamon-roll.png', prices: { 1: 7.5, 4: 30, 6: 45 } },
    strawberry: { label: 'Strawberry Kiss', short: 'Strawberry', image: 'assets/img/strawberry-cinnamon-roll.png', prices: { 1: 8.5, 4: 34, 6: 50 } },
    baileys: { label: "Bailey's Bliss", short: "Bailey's", image: 'assets/img/baileys-cinnamon-roll.png', prices: { 1: 8.5, 4: 34, 6: 50 } }
  };
  const availableKeys = Object.keys(flavours);
  const parishes = ['St. Michael','Christ Church','St. Philip','St. George','St. James','St. Thomas','St. John','St. Joseph','St. Peter','St. Andrew','St. Lucy'];
  const makeRequestId = () => `DP03-${Date.now().toString(36).slice(-4).toUpperCase()}${Math.random().toString(36).slice(2,5).toUpperCase()}`;
  const makeBox = () => ({
    mode: 'single',
    singleFlavor: 'sweetheart',
    packSize: 1,
    mixedSize: 4,
    mixedSixFlavours: ['sweetheart', 'biscoff', 'strawberry']
  });

  const state = {
    step: 1,
    boxes: [makeBox()],
    activeBoxIndex: 0,
    fulfilment: 'Pickup',
    parish: '',
    area: '',
    requestedTime: '',
    name: '',
    whatsapp: '',
    email: '',
    paymentMethod: 'CIBC First Pay',
    dietary: ['No dietary needs'],
    notes: '',
    requestId: makeRequestId()
  };

  const els = {
    panels: qa('.step-panel', root),
    fill: q('.progress-fill', root),
    stepLabel: q('[data-step-label]', root),
    visual: q('[data-roll-visual]', root),
    ticket: q('[data-ticket]', root),
    ticketOpen: q('[data-view-ticket]', root),
    ticketClose: q('[data-close-ticket]', root)
  };

  const activeBox = () => state.boxes[state.activeBoxIndex];

  function money(value) {
    const number = Number(value || 0);
    return `$${Number.isInteger(number) ? number.toFixed(0) : number.toFixed(2)}`;
  }

  function syncInputs() {
    state.name = q('#customer-name', root)?.value.trim() || '';
    state.whatsapp = q('#customer-whatsapp', root)?.value.trim() || '';
    state.email = q('#customer-email', root)?.value.trim() || '';
    state.notes = q('#customer-notes', root)?.value.trim() || '';
    const pickup = q('#requested-time', root)?.value || '';
    const delivery = q('#requested-time-delivery', root)?.value || '';
    state.area = q('#delivery-area', root)?.value.trim() || '';
    state.requestedTime = state.fulfilment === 'Delivery' ? delivery : pickup;
  }

  function formatTime(value) {
    if (!value) return 'To be confirmed';
    const [hour, minute] = value.split(':').map(Number);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;
    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  function boxPrice(box) {
    if (box.mode === 'mixed') return box.mixedSize === 6 ? 40 : 30;
    return flavours[box.singleFlavor].prices[box.packSize];
  }

  function totalPrice() {
    return state.boxes.reduce((sum, box) => sum + boxPrice(box), 0);
  }

  function isDelivery() {
    return state.fulfilment === 'Delivery';
  }

  function totalLabel() {
    return isDelivery() ? 'Food subtotal' : 'Total';
  }

  function deliveryFeeText() {
    return 'To be added after location is confirmed';
  }

  function boxComposition(box) {
    if (box.mode === 'single') return { [box.singleFlavor]: box.packSize };
    if (box.mixedSize === 4) return { sweetheart: 1, biscoff: 1, strawberry: 1, baileys: 1 };
    return box.mixedSixFlavours.reduce((result, key) => {
      result[key] = 2;
      return result;
    }, {});
  }

  function rollsInBox(box) {
    return box.mode === 'mixed' ? box.mixedSize : box.packSize;
  }

  function compositionText(box, separator = ' • ') {
    return Object.entries(boxComposition(box)).map(([key, count]) => `${count} ${flavours[key].short}`).join(separator);
  }

  function boxTitle(box) {
    if (box.mode === 'mixed') return `Mixed Box of ${box.mixedSize}`;
    const qty = box.packSize;
    return `${qty} ${flavours[box.singleFlavor].label} roll${qty === 1 ? '' : 's'}`;
  }

  function boxDetail(box) {
    if (box.mode === 'mixed' && box.mixedSize === 4) return '1 each: Classic, Biscoff, Strawberry, Bailey\'s';
    if (box.mode === 'mixed') return `2 each: ${box.mixedSixFlavours.map(key => flavours[key].short).join(', ')}`;
    return `${flavours[box.singleFlavor].label} • ${box.packSize} roll${box.packSize === 1 ? '' : 's'}`;
  }

  function orderSummaryLabel() {
    return `${state.boxes.length} box${state.boxes.length === 1 ? '' : 'es'} selected`;
  }

  function locationText() {
    return state.fulfilment === 'Delivery'
      ? [state.parish, state.area].filter(Boolean).join(' • ') || 'To be confirmed'
      : 'Pickup location confirmed on WhatsApp';
  }

  function setText(selector, value) {
    const el = q(selector, root);
    if (el) el.textContent = value;
  }

  function renderVisual() {
    if (!els.visual) return;
    const box = activeBox();
    const items = [];
    Object.entries(boxComposition(box)).forEach(([key, count]) => {
      for (let i = 0; i < count; i += 1) items.push(key);
    });

    const total = rollsInBox(box);
    const cols = total === 6 ? 3 : total === 4 ? 2 : 1;
    els.visual.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
    els.visual.style.maxWidth = total === 6 ? '540px' : total === 4 ? '430px' : '220px';
    els.visual.replaceChildren();
    items.forEach(key => {
      const cell = document.createElement('div');
      cell.className = 'roll-piece real-roll pop-in';
      const img = document.createElement('img');
      img.src = flavours[key].image;
      img.alt = flavours[key].label;
      img.loading = 'lazy';
      cell.appendChild(img);
      els.visual.appendChild(cell);
    });
  }

  function renderPackPrices() {
    const box = activeBox();
    const priceMap = flavours[box.singleFlavor].prices;
    [1, 4, 6].forEach(size => setText(`[data-pack-price="${size}"]`, money(priceMap[size])));
  }

  function renderBoxManager() {
    const wrap = q('[data-added-boxes]', root);
    const addButton = q('[data-add-box]', root);
    setText('[data-box-count-label]', `${state.boxes.length} of 3 box${state.boxes.length === 1 ? '' : 'es'} added`);
    if (addButton) {
      addButton.disabled = state.boxes.length >= 3;
      addButton.innerHTML = state.boxes.length >= 3
        ? '<i class="ph-fill ph-check"></i> 3 box limit reached'
        : '<i class="ph-fill ph-plus"></i> Add another box';
    }
    if (!wrap) return;
    wrap.replaceChildren();
    state.boxes.forEach((box, index) => {
      const card = document.createElement('div');
      card.className = `added-box-card${index === state.activeBoxIndex ? ' active' : ''}`;
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'box-edit-button';
      edit.dataset.editBox = String(index);
      edit.innerHTML = `<span>Box ${index + 1}${index === state.activeBoxIndex ? ' • editing' : ''}</span><strong>${boxTitle(box)}</strong><small>${money(boxPrice(box))} BBD • Tap to edit</small>`;
      card.appendChild(edit);
      if (state.boxes.length > 1) {
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'box-remove-button';
        remove.dataset.removeBox = String(index);
        remove.setAttribute('aria-label', `Remove box ${index + 1}`);
        remove.innerHTML = '×';
        card.appendChild(remove);
      }
      wrap.appendChild(card);
    });
  }

  function renderFinalList() {
    const wrap = q('[data-final-box-list]', root);
    if (!wrap) return;
    wrap.replaceChildren();
    state.boxes.forEach((box, index) => {
      const row = document.createElement('div');
      row.className = 'final-box-item';
      row.innerHTML = `<strong>Box ${index + 1}: ${boxTitle(box)}</strong><span>${money(boxPrice(box))} BBD</span>`;
      wrap.appendChild(row);
    });
  }

  function renderTicketBoxes() {
    const wrap = q('[data-ticket-boxes]', root);
    if (!wrap) return;
    wrap.replaceChildren();
    state.boxes.forEach((box, index) => {
      const item = document.createElement('div');
      item.className = 'ticket-box-item';

      const visual = document.createElement('div');
      visual.className = 'ticket-box-visual';
      Object.entries(boxComposition(box)).forEach(([key, count]) => {
        const thumb = document.createElement('div');
        thumb.className = 'ticket-roll-thumb';
        const img = document.createElement('img');
        img.src = flavours[key].image;
        img.alt = flavours[key].label;
        const badge = document.createElement('span');
        badge.textContent = `×${count}`;
        thumb.append(img, badge);
        visual.appendChild(thumb);
      });

      const copy = document.createElement('div');
      copy.className = 'ticket-box-copy';
      copy.innerHTML = `<div class="ticket-box-item-head"><strong>Box ${index + 1}: ${boxTitle(box)}</strong><b>${money(boxPrice(box))} BBD</b></div><p>${boxDetail(box)}</p>`;
      item.append(visual, copy);
      wrap.appendChild(item);
    });
  }

  function renderBuilder() {
    const box = activeBox();
    const isMixed = box.mode === 'mixed';
    qa('[data-order-mode]', root).forEach(button => button.classList.toggle('active', button.dataset.orderMode === box.mode));
    q('[data-single-order]', root)?.classList.toggle('is-hidden', isMixed);
    q('[data-mixed-order]', root)?.classList.toggle('show', isMixed);
    qa('[data-single-flavour]', root).forEach(button => button.classList.toggle('active', button.dataset.singleFlavour === box.singleFlavor));
    qa('[data-pack-size]', root).forEach(button => button.classList.toggle('active', Number(button.dataset.packSize) === box.packSize));
    qa('[data-mixed-size]', root).forEach(button => button.classList.toggle('active', Number(button.dataset.mixedSize) === box.mixedSize));
    q('[data-six-flavour-picker]', root)?.classList.toggle('show', isMixed && box.mixedSize === 6);
    qa('[data-six-flavour]', root).forEach(button => button.classList.toggle('selected', box.mixedSixFlavours.includes(button.dataset.sixFlavour)));
    setText('[data-six-count]', `${box.mixedSixFlavours.length} of 3 selected`);

    renderPackPrices();
    setText('[data-current-box-label]', `Box ${state.activeBoxIndex + 1} selection`);
    setText('[data-selection-title]', boxTitle(box));
    setText('[data-selection-detail]', boxDetail(box));
    setText('[data-selection-price]', `${money(boxPrice(box))} BBD`);
    setText('[data-progress-price]', `${money(totalPrice())} BBD total`);
    setText('[data-final-order]', orderSummaryLabel());
    setText('[data-final-total-label]', totalLabel());
    setText('[data-final-total]', `${money(totalPrice())} BBD`);
    q('[data-final-delivery-note]', root)?.classList.toggle('show', isDelivery());
    renderVisual();
    renderBoxManager();
    renderFinalList();
    updateTicket();
  }

  function updateTicket() {
    syncInputs();
    setText('[data-ticket-id]', `Request ${state.requestId}`);
    setText('[data-ticket-name]', state.name || '-');
    setText('[data-ticket-whatsapp]', state.whatsapp || '-');
    setText('[data-ticket-email]', state.email || 'Not provided');
    setText('[data-ticket-payment]', state.paymentMethod);
    setText('[data-ticket-total-label]', totalLabel());
    setText('[data-ticket-total]', `${money(totalPrice())} BBD`);
    const deliveryFeeRow = q('[data-ticket-delivery-fee-row]', root);
    if (deliveryFeeRow) deliveryFeeRow.style.display = isDelivery() ? '' : 'none';
    setText('[data-ticket-delivery-fee]', deliveryFeeText());
    setText('[data-ticket-fulfilment]', state.fulfilment);
    setText('[data-ticket-time]', formatTime(state.requestedTime));
    setText('[data-ticket-location]', locationText());
    setText('[data-ticket-dietary]', state.dietary.join(', '));
    setText('[data-ticket-notes]', state.notes || 'No extra notes.');
    setText('[data-progress-price]', `${money(totalPrice())} BBD total`);
    setText('[data-final-order]', orderSummaryLabel());
    setText('[data-final-total-label]', totalLabel());
    setText('[data-final-total]', `${money(totalPrice())} BBD`);
    q('[data-final-delivery-note]', root)?.classList.toggle('show', isDelivery());
    renderTicketBoxes();
    renderFinalList();
  }

  function validateStep(step) {
    syncInputs();
    if (step === 1) {
      const invalidIndex = state.boxes.findIndex(box => box.mode === 'mixed' && box.mixedSize === 6 && box.mixedSixFlavours.length !== 3);
      if (invalidIndex >= 0) return `Box ${invalidIndex + 1}: choose exactly 3 flavours for the mixed box of 6.`;
    }
    if (step === 2) {
      if (!state.requestedTime) return 'Please add your preferred pickup or delivery time.';
      if (state.fulfilment === 'Delivery' && !state.parish) return 'Please choose your delivery parish.';
      if (state.fulfilment === 'Delivery' && !state.area) return 'Please add your delivery area or landmark.';
    }
    if (step === 3) {
      if (!state.name) return 'Please add your name.';
      if (!state.whatsapp) return 'Please add a WhatsApp number for confirmation.';
      if (!state.paymentMethod) return 'Please choose a payment method.';
    }
    return '';
  }

  function validateAll() {
    for (const step of [1, 2, 3]) {
      const message = validateStep(step);
      if (message) return message;
    }
    return '';
  }

  function setStep(step) {
    state.step = Math.max(1, Math.min(4, Number(step) || 1));
    els.panels.forEach((panel, index) => panel.classList.toggle('active', index === state.step - 1));
    if (els.fill) els.fill.style.width = `${state.step * 25}%`;
    if (els.stepLabel) els.stepLabel.textContent = `Step ${state.step} of 4`;
    if (state.step === 4) updateTicket();
    const top = Math.max(0, root.getBoundingClientRect().top + window.scrollY - 120);
    window.scrollTo({ top, behavior: 'smooth' });
  }

  qa('[data-order-mode]', root).forEach(button => button.addEventListener('click', () => {
    activeBox().mode = button.dataset.orderMode === 'mixed' ? 'mixed' : 'single';
    renderBuilder();
  }));

  qa('[data-single-flavour]', root).forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.singleFlavour;
    if (!flavours[key]) return;
    activeBox().singleFlavor = key;
    renderBuilder();
  }));

  qa('[data-pack-size]', root).forEach(button => button.addEventListener('click', () => {
    const size = Number(button.dataset.packSize);
    if (![1, 4, 6].includes(size)) return;
    activeBox().packSize = size;
    renderBuilder();
  }));

  qa('[data-mixed-size]', root).forEach(button => button.addEventListener('click', () => {
    activeBox().mixedSize = Number(button.dataset.mixedSize) === 6 ? 6 : 4;
    renderBuilder();
  }));

  qa('[data-six-flavour]', root).forEach(button => button.addEventListener('click', () => {
    const box = activeBox();
    const key = button.dataset.sixFlavour;
    if (!availableKeys.includes(key)) return;
    if (box.mixedSixFlavours.includes(key)) {
      if (box.mixedSixFlavours.length <= 1) return;
      box.mixedSixFlavours = box.mixedSixFlavours.filter(item => item !== key);
    } else {
      if (box.mixedSixFlavours.length >= 3) return toast('A mixed box of 6 uses exactly 3 flavours. Remove one before adding another.');
      box.mixedSixFlavours.push(key);
    }
    renderBuilder();
  }));

  q('[data-add-box]', root)?.addEventListener('click', () => {
    if (state.boxes.length >= 3) return toast('You can add up to 3 boxes per order request.');
    state.boxes.push(makeBox());
    state.activeBoxIndex = state.boxes.length - 1;
    renderBuilder();
    toast(`Box ${state.boxes.length} added. Choose what you want in this box.`);
  });

  q('[data-added-boxes]', root)?.addEventListener('click', event => {
    const edit = event.target.closest('[data-edit-box]');
    if (edit) {
      state.activeBoxIndex = Math.max(0, Math.min(state.boxes.length - 1, Number(edit.dataset.editBox)));
      renderBuilder();
      return;
    }
    const remove = event.target.closest('[data-remove-box]');
    if (remove) {
      const index = Number(remove.dataset.removeBox);
      if (state.boxes.length <= 1 || !Number.isInteger(index)) return;
      state.boxes.splice(index, 1);
      if (state.activeBoxIndex >= state.boxes.length) state.activeBoxIndex = state.boxes.length - 1;
      else if (index < state.activeBoxIndex) state.activeBoxIndex -= 1;
      renderBuilder();
      toast('Box removed from your order.');
    }
  });

  qa('[data-fulfilment]', root).forEach(button => button.addEventListener('click', () => {
    qa('[data-fulfilment]', root).forEach(item => item.classList.remove('selected'));
    button.classList.add('selected');
    state.fulfilment = button.dataset.fulfilment === 'Delivery' ? 'Delivery' : 'Pickup';
    q('[data-delivery-fields]', root)?.classList.toggle('show', state.fulfilment === 'Delivery');
    q('[data-pickup-fields]', root)?.classList.toggle('show', state.fulfilment !== 'Delivery');
    if (state.fulfilment !== 'Delivery') {
      state.parish = '';
      state.area = '';
      qa('.chip', q('[data-parish-chips]', root) || root).forEach(chip => chip.classList.remove('selected'));
    }
    updateTicket();
  }));

  const parishWrap = q('[data-parish-chips]', root);
  if (parishWrap) {
    parishes.forEach(name => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'chip';
      button.textContent = name;
      button.addEventListener('click', () => {
        qa('.chip', parishWrap).forEach(chip => chip.classList.remove('selected'));
        button.classList.add('selected');
        state.parish = name;
        updateTicket();
      });
      parishWrap.appendChild(button);
    });
  }

  qa('[data-payment-method]', root).forEach(button => button.addEventListener('click', () => {
    qa('[data-payment-method]', root).forEach(item => item.classList.remove('selected'));
    button.classList.add('selected');
    state.paymentMethod = button.dataset.paymentMethod || '';
    updateTicket();
  }));

  qa('[data-dietary]', root).forEach(button => button.addEventListener('click', () => {
    const none = 'No dietary needs';
    const value = button.dataset.dietary;
    if (!value) return;
    if (value === none) {
      state.dietary = [none];
      qa('[data-dietary]', root).forEach(item => item.classList.toggle('selected', item.dataset.dietary === none));
    } else {
      state.dietary = state.dietary.filter(item => item !== none);
      if (state.dietary.includes(value)) {
        state.dietary = state.dietary.filter(item => item !== value);
        button.classList.remove('selected');
      } else {
        state.dietary.push(value);
        button.classList.add('selected');
      }
      q(`[data-dietary="${none}"]`, root)?.classList.remove('selected');
      if (!state.dietary.length) {
        state.dietary = [none];
        q(`[data-dietary="${none}"]`, root)?.classList.add('selected');
      }
    }
    updateTicket();
  }));

  qa('input, textarea', root).forEach(el => {
    el.addEventListener('input', updateTicket);
    el.addEventListener('change', updateTicket);
  });

  qa('[data-next]', root).forEach(button => button.addEventListener('click', () => {
    const message = validateStep(state.step);
    if (message) return toast(message);
    setStep(state.step + 1);
  }));
  qa('[data-back]', root).forEach(button => button.addEventListener('click', () => setStep(state.step - 1)));

  els.ticketOpen?.addEventListener('click', () => {
    const message = validateAll();
    if (message) return toast(message);
    updateTicket();
    if (els.ticket && typeof els.ticket.showModal === 'function') els.ticket.showModal();
    else els.ticket?.setAttribute('open', '');
    toast('Your ticket is ready. Download it, then attach it in WhatsApp.');
  });

  els.ticketClose?.addEventListener('click', () => {
    if (!els.ticket) return;
    if (typeof els.ticket.close === 'function') els.ticket.close();
    else els.ticket.removeAttribute('open');
  });

  els.ticket?.addEventListener('click', event => {
    if (event.target === els.ticket) {
      if (typeof els.ticket.close === 'function') els.ticket.close();
      else els.ticket.removeAttribute('open');
    }
  });

  function summaryText() {
    syncInputs();
    const boxLines = state.boxes.map((box, index) => `Box ${index + 1}: ${boxTitle(box)} | ${boxDetail(box)} | ${money(boxPrice(box))} BBD`);
    return [
      "De' Patisserie Saturday Treats Request",
      `Request ID: ${state.requestId}`,
      'Status: PENDING APPROVAL',
      'Date: Saturday, October 3, 2026',
      ...boxLines,
      `${totalLabel()}: ${money(totalPrice())} BBD`,
      ...(isDelivery() ? [`Delivery fee: ${deliveryFeeText()}`] : []),
      `Fulfilment: ${state.fulfilment}`,
      `Requested time: ${formatTime(state.requestedTime)}`,
      `Location: ${locationText()}`,
      `Payment method: ${state.paymentMethod}`,
      `Name: ${state.name || '-'}`,
      `WhatsApp: ${state.whatsapp || '-'}`,
      `Email: ${state.email || 'Not provided'}`,
      `Dietary notes: ${state.dietary.join(', ')}`,
      `Extra notes: ${state.notes || 'None'}`,
      'This request is pending approval.'
    ].join('\n');
  }

  function roundedRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 8) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    let line = '';
    let lines = 0;
    for (let i = 0; i < words.length; i += 1) {
      const test = line ? `${line} ${words[i]}` : words[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, y);
        y += lineHeight;
        lines += 1;
        if (lines >= maxLines) return y;
        line = words[i];
      } else line = test;
    }
    if (line && lines < maxLines) {
      ctx.fillText(line, x, y);
      y += lineHeight;
    }
    return y;
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  async function buildTicketCanvas() {
    syncInputs();
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 2400;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff7fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 320);
    gradient.addColorStop(0, '#f8aec0');
    gradient.addColorStop(.52, '#f5849c');
    gradient.addColorStop(1, '#e64870');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, 320);

    try {
      const logo = await loadImage('assets/img/logo.png');
      const maxW = 300, maxH = 150;
      const scale = Math.min(maxW / logo.width, maxH / logo.height);
      const w = logo.width * scale, h = logo.height * scale;
      ctx.drawImage(logo, (canvas.width - w) / 2, 26, w, h);
    } catch (error) {}

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 42px Arial, sans-serif';
    ctx.fillText('Saturday Treats Order Ticket', canvas.width / 2, 220);
    roundedRect(ctx, 342, 248, 396, 48, 24);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.fillStyle = '#87152c';
    ctx.font = '700 22px Arial, sans-serif';
    ctx.fillText('PENDING APPROVAL', canvas.width / 2, 280);

    ctx.textAlign = 'left';
    let y = 368;
    const left = 74;
    const cardW = canvas.width - 148;

    function section(title, rows) {
      const startY = y;
      const rowHeights = rows.map(([, value]) => {
        ctx.font = '400 24px Arial, sans-serif';
        const text = String(value || '-');
        const estimated = Math.max(1, Math.ceil(ctx.measureText(text).width / 610));
        return Math.max(54, estimated * 32 + 18);
      });
      const h = 72 + rowHeights.reduce((a, b) => a + b, 0) + 22;
      roundedRect(ctx, left, startY, cardW, h, 24);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#f1c8d3';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#e64870';
      ctx.font = '700 30px Arial, sans-serif';
      ctx.fillText(title, left + 28, startY + 48);
      let rowY = startY + 88;
      rows.forEach(([label, value], idx) => {
        ctx.fillStyle = '#87152c';
        ctx.font = '700 22px Arial, sans-serif';
        ctx.fillText(label, left + 28, rowY);
        ctx.fillStyle = '#4f3941';
        ctx.font = '400 24px Arial, sans-serif';
        const nextY = wrapText(ctx, String(value || '-'), left + 250, rowY, cardW - 300, 32, 4);
        rowY = Math.max(rowY + rowHeights[idx], nextY + 10);
      });
      y = startY + h + 22;
    }

    section('Customer', [
      ['Name', state.name || '-'],
      ['WhatsApp', state.whatsapp || '-'],
      ['Email', state.email || 'Not provided'],
      ['Payment', state.paymentMethod]
    ]);

    async function orderSection() {
      const startY = y;
      const boxRowH = 126;
      const deliveryH = isDelivery() ? 54 : 0;
      const h = 98 + 58 + (state.boxes.length * boxRowH) + 68 + deliveryH + 26;
      roundedRect(ctx, left, startY, cardW, h, 24);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#f1c8d3';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#e64870';
      ctx.font = '700 30px Arial, sans-serif';
      ctx.fillText('Your Order', left + 28, startY + 48);
      ctx.fillStyle = '#87152c';
      ctx.font = '700 21px Arial, sans-serif';
      ctx.fillText('Date', left + 28, startY + 92);
      ctx.fillStyle = '#4f3941';
      ctx.font = '400 22px Arial, sans-serif';
      ctx.fillText('Saturday, October 3, 2026', left + 250, startY + 92);

      let rowY = startY + 126;
      for (let index = 0; index < state.boxes.length; index += 1) {
        const box = state.boxes[index];
        roundedRect(ctx, left + 22, rowY, cardW - 44, 108, 18);
        ctx.fillStyle = '#fff7f9';
        ctx.fill();
        ctx.strokeStyle = '#f6d9e1';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        const entries = Object.entries(boxComposition(box));
        let thumbX = left + 38;
        for (const [key, count] of entries) {
          try {
            const img = await loadImage(flavours[key].image);
            ctx.drawImage(img, thumbX, rowY + 14, 74, 74);
            ctx.fillStyle = '#87152c';
            ctx.beginPath();
            ctx.arc(thumbX + 64, rowY + 78, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.font = '700 14px Arial, sans-serif';
            ctx.fillText(`×${count}`, thumbX + 64, rowY + 83);
            ctx.textAlign = 'left';
          } catch (error) {}
          thumbX += 78;
        }

        const textX = left + 390;
        ctx.fillStyle = '#87152c';
        ctx.font = '700 21px Arial, sans-serif';
        wrapText(ctx, `Box ${index + 1}: ${boxTitle(box)}`, textX, rowY + 34, cardW - 440, 26, 2);
        ctx.fillStyle = '#6f4452';
        ctx.font = '400 18px Arial, sans-serif';
        wrapText(ctx, boxDetail(box), textX, rowY + 64, cardW - 440, 23, 2);
        ctx.fillStyle = '#e64870';
        ctx.font = '700 19px Arial, sans-serif';
        ctx.fillText(`${money(boxPrice(box))} BBD`, textX, rowY + 94);
        rowY += boxRowH;
      }

      ctx.fillStyle = '#87152c';
      ctx.font = '700 23px Arial, sans-serif';
      ctx.fillText(totalLabel().toUpperCase(), left + 28, rowY + 34);
      ctx.textAlign = 'right';
      ctx.fillText(`${money(totalPrice())} BBD`, left + cardW - 28, rowY + 34);
      ctx.textAlign = 'left';
      rowY += 58;

      if (isDelivery()) {
        ctx.fillStyle = '#6f2940';
        ctx.font = '700 18px Arial, sans-serif';
        ctx.fillText('Delivery fee', left + 28, rowY + 24);
        ctx.fillStyle = '#6f4452';
        ctx.font = '400 17px Arial, sans-serif';
        wrapText(ctx, deliveryFeeText(), left + 250, rowY + 24, cardW - 300, 22, 2);
      }
      y = startY + h + 22;
    }

    await orderSection();

    section('Fulfilment', [
      ['Method', state.fulfilment],
      ['Time', formatTime(state.requestedTime)],
      ['Location', locationText()]
    ]);
    section('Notes', [
      ['Dietary', state.dietary.join(', ')],
      ['Notes', state.notes || 'No extra notes.']
    ]);

    roundedRect(ctx, left, y, cardW, 130, 24);
    ctx.fillStyle = '#fff0f4';
    ctx.fill();
    ctx.strokeStyle = '#efb8c6';
    ctx.stroke();
    ctx.fillStyle = '#87152c';
    ctx.font = '700 24px Arial, sans-serif';
    ctx.fillText('Pending Approval', left + 28, y + 42);
    ctx.fillStyle = '#6f4452';
    ctx.font = '400 22px Arial, sans-serif';
    wrapText(ctx, "Your order is not confirmed until De' Patisserie approves it.", left + 28, y + 78, cardW - 56, 30, 3);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#956677';
    ctx.font = '400 20px Arial, sans-serif';
    ctx.fillText(`Request ${state.requestId}`, canvas.width / 2, canvas.height - 38);
    return canvas;
  }

  function canvasBlob(canvas) {
    return new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1));
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function getTicketPng() {
    const canvas = await buildTicketCanvas();
    const blob = await canvasBlob(canvas);
    if (!blob) throw new Error('PNG export failed');
    return blob;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  }

  function absoluteImage(src) {
    try { return new URL(src, document.baseURI).href; } catch (error) { return src; }
  }

  function ticketPrintHtml() {
    syncInputs();
    const boxesHtml = state.boxes.map((box, index) => {
      const visualHtml = Object.entries(boxComposition(box)).map(([key, count]) => `
        <span class="roll-thumb"><img src="${escapeHtml(absoluteImage(flavours[key].image))}" alt="${escapeHtml(flavours[key].label)}"><i>×${count}</i></span>`).join('');
      return `
      <section class="box-card">
        <div class="box-visual">${visualHtml}</div>
        <div class="box-copy"><div class="box-head"><strong>Box ${index + 1}: ${escapeHtml(boxTitle(box))}</strong><b>${escapeHtml(money(boxPrice(box)))} BBD</b></div>
        <p>${escapeHtml(boxDetail(box))}</p></div>
      </section>`;
    }).join('');

    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>De' Patisserie Order Ticket</title><style>
      *{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
      @page{size:A4 portrait;margin:10mm}
      body{margin:0;font-family:Arial,sans-serif;background:#fff7fa;color:#3c2430}
      .sheet{max-width:190mm;margin:0 auto;background:#fff;border:1px solid #f0bcc8;border-radius:20px;overflow:hidden}
      .top{padding:18px 20px;background:linear-gradient(120deg,#f8aec0,#f5849c,#e64870);color:#fff;text-align:center}.logo{width:92px;height:64px;object-fit:contain;background:#fff;border-radius:14px;padding:4px}.top h1{margin:8px 0 7px;font-size:24px}.pill{display:inline-block;padding:6px 10px;border-radius:999px;background:#fff;color:#87152c;font-size:9px;font-weight:700}
      .body{padding:16px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.card,.box-card{border:1px solid #f3ced9;border-radius:15px;padding:13px;background:#fffafb;break-inside:avoid;page-break-inside:avoid}.box-card{grid-column:1/-1;display:grid;grid-template-columns:150px 1fr;gap:13px;align-items:center}.box-visual{display:flex;align-items:center;gap:3px;min-height:64px}.roll-thumb{position:relative;display:inline-grid;place-items:center;width:52px;height:52px}.roll-thumb img{width:52px;height:52px;object-fit:contain}.roll-thumb i{position:absolute;right:-1px;bottom:-1px;display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:#87152c;color:#fff;font-style:normal;font-size:7px;font-weight:700}.card h2{margin:0 0 8px;color:#e64870;font-size:15px}.row{display:grid;grid-template-columns:84px 1fr;gap:8px;padding:6px 0;border-bottom:1px solid #f9e4ea;font-size:10px;line-height:1.4}.row:last-child{border-bottom:0}.row strong{color:#87152c}.box-head{display:flex;justify-content:space-between;gap:12px;color:#87152c;font-size:12px}.box-head b{color:#e64870;white-space:nowrap}.box-card p{margin:7px 0 0;color:#6f4452;font-size:9px}.total{grid-column:1/-1;display:flex;justify-content:space-between;padding:12px 14px;border-radius:13px;background:#87152c;color:#fff;font-size:12px;font-weight:700}.note{grid-column:1/-1;padding:11px 13px;border-radius:13px;background:#fff0f4;border:1px dashed #efb1c0;font-size:9px;line-height:1.5;color:#6f2940}.foot{text-align:center;color:#8a6270;font-size:9px;padding:10px 14px 14px}@media print{body{background:#fff}.sheet{border:0;border-radius:0}}
    </style></head><body><main class="sheet"><header class="top"><img class="logo" src="${escapeHtml(absoluteImage('assets/img/logo.png'))}" alt="De' Patisserie"><h1>Saturday Treats Order Ticket</h1><span class="pill">PENDING APPROVAL</span></header><section class="body"><div class="grid"><section class="card"><h2>Customer</h2><div class="row"><strong>Name</strong><span>${escapeHtml(state.name || '-')}</span></div><div class="row"><strong>WhatsApp</strong><span>${escapeHtml(state.whatsapp || '-')}</span></div><div class="row"><strong>Email</strong><span>${escapeHtml(state.email || 'Not provided')}</span></div><div class="row"><strong>Payment</strong><span>${escapeHtml(state.paymentMethod)}</span></div></section><section class="card"><h2>Pickup or Delivery</h2><div class="row"><strong>Method</strong><span>${escapeHtml(state.fulfilment)}</span></div><div class="row"><strong>Time</strong><span>${escapeHtml(formatTime(state.requestedTime))}</span></div><div class="row"><strong>Location</strong><span>${escapeHtml(locationText())}</span></div><div class="row"><strong>Dietary</strong><span>${escapeHtml(state.dietary.join(', '))}</span></div></section>${boxesHtml}<div class="total"><span>${escapeHtml(totalLabel())}</span><span>${escapeHtml(money(totalPrice()))} BBD</span></div>${isDelivery() ? `<div class="note"><strong>Delivery fee:</strong> ${escapeHtml(deliveryFeeText())}. The delivery fee will be added to the food subtotal.</div>` : ''}<div class="note"><strong>Notes:</strong> ${escapeHtml(state.notes || 'No extra notes.')}<br><br><strong>Pending Approval:</strong> Your order is not confirmed until De' Patisserie approves it.</div></div></section><footer class="foot">Request ${escapeHtml(state.requestId)} • Thank you for supporting De' Patisserie</footer></main><script>window.addEventListener('load',()=>{const imgs=[...document.images];Promise.all(imgs.map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.onload=resolve;img.onerror=resolve}))).then(()=>setTimeout(()=>window.print(),250));});<\/script></body></html>`;
  }

  function printTicketPdf() {
    const frame = document.createElement('iframe');
    frame.style.position = 'fixed';
    frame.style.width = '1px';
    frame.style.height = '1px';
    frame.style.opacity = '0';
    frame.style.pointerEvents = 'none';
    document.body.appendChild(frame);
    const printDoc = frame.contentDocument || frame.contentWindow.document;
    printDoc.open();
    printDoc.write(ticketPrintHtml());
    printDoc.close();
    setTimeout(() => frame.remove(), 120000);
  }

  function downloadTicketPdf() {
    printTicketPdf();
    return 'print';
  }

  q('[data-save-pdf]', root)?.addEventListener('click', async () => {
    const message = validateAll();
    if (message) return toast(message);
    try {
      downloadTicketPdf();
      toast('In the print window, choose Save as PDF. Then attach the saved PDF in WhatsApp.');
    } catch (error) {
      toast('The PDF screen could not be opened. Try Save PNG instead.');
    }
  });

  q('[data-save-png]', root)?.addEventListener('click', async () => {
    const message = validateAll();
    if (message) return toast(message);
    try {
      const blob = await getTicketPng();
      downloadBlob(blob, `De-Patisserie-${state.requestId}.png`);
      toast('PNG saved. Open WhatsApp and attach the saved image.');
    } catch (error) {
      toast('The PNG could not be created on this browser.');
    }
  });

  q('[data-open-whatsapp]', root)?.addEventListener('click', () => {
    const message = validateAll();
    if (message) return toast(message);
    const whatsappText = `${summaryText()}\n\nI have attached my order ticket.`;
    window.open(`https://wa.me/12462644609?text=${encodeURIComponent(whatsappText)}`, '_blank', 'noopener');
    toast('In WhatsApp, attach the PDF or PNG you downloaded and send it.');
  });

  renderBuilder();
})();
