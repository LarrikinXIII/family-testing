function comingSoon(event) {
    event.preventDefault();
    document.getElementById('comingSoonModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('comingSoonModal').style.display = 'none';
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;
let highestZ = 100;
let activeCard = null;

// Initialize all polaroids
const board = document.getElementById('gallery-container');
document.querySelectorAll('.polaroid').forEach((item) => {
  const r = Math.random() * 20 - 10;
  
  const maxX = (board ? board.offsetWidth : window.innerWidth) - 260;
  const maxY = (board ? board.offsetHeight : window.innerHeight) - 300;
  
  const x = Math.max(10, Math.random() * maxX);
  const y = Math.max(10, Math.random() * maxY);

  item.dataset.homeX = x;
  item.dataset.homeY = y;
  item.dataset.homeR = r;

  setTransform(item, x, y, 1, r);
  initPhysics(item);
});

function initPhysics(el) {
  let state = {
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: parseFloat(el.dataset.homeX),
    currentY: parseFloat(el.dataset.homeY),
    scale: 1,
    rotation: parseFloat(el.dataset.homeR),
    startDist: 0,
    startScale: 1,
  };

  function updateVisuals() {
    el.style.transform = `translate(${state.currentX}px, ${state.currentY}px) rotate(${state.rotation}deg) scale(${state.scale})`;
  }

  const onPointerDown = (e) => {
    if (
      e.target.tagName === 'BUTTON' ||
      e.target.tagName === 'INPUT' ||
      e.target.closest('.close-x') ||
      e.target.closest('.delete-file')
    )
      return;
    
    const isTouch = e.touches && e.touches.length > 0;
    
    // Only flag dragging if this specific card was targeted
    state.isDragging = true;
    el.style.zIndex = ++highestZ;
    el.style.cursor = 'grabbing';

    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    const clientY = isTouch ? e.touches[0].clientY : e.clientY;
    state.startX = clientX - state.currentX;
    state.startY = clientY - state.currentY;

    // Check for pinch initialization
    if (e.touches && e.touches.length === 2) {
      state.isDragging = false;
      state.startDist = getHypot(e.touches);
      state.startScale = state.scale;
    }
  };

  const onPointerMove = (e) => {
    const isTouch = e.touches && e.touches.length > 0;

    // FIX: If the user is pinching (2 fingers), ONLY let the activeCard handle the zoom calculation
    if (e.touches && e.touches.length === 2) {
      if (activeCard !== el) return; // Instantly blocks inactive polaroids from scaling up together
      
      const newDist = getHypot(e.touches);
      const scaleChange = newDist / state.startDist;
      state.scale = Math.min(
        Math.max(state.startScale * scaleChange, MIN_SCALE),
        MAX_SCALE
      );
      requestAnimationFrame(updateVisuals);
      return;
    }

    // Normal dragging logic check
    if (!state.isDragging) return;

    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    const clientY = isTouch ? e.touches[0].clientY : e.clientY;
    state.currentX = clientX - state.startX;
    state.currentY = clientY - state.startY;
    requestAnimationFrame(updateVisuals);
  };

  const onPointerUp = () => {
    state.isDragging = false;
    el.style.cursor = 'grab';
  };

  const onWheel = (e) => {
    if (activeCard !== el) return;
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    state.scale = Math.min(
      Math.max(state.scale + delta, MIN_SCALE),
      MAX_SCALE
    );
    requestAnimationFrame(updateVisuals);
  };

  const onClick = (e) => {
    if (state.isDragging) return;
    if (
      e.target.tagName === 'BUTTON' ||
      e.target.tagName === 'INPUT' ||
      e.target.closest('.delete-file')
    )
      return;
      
    if (activeCard !== el) {
      activate(el, state);
    } else {
      deactivate(el);
    }
  };

  el.addEventListener('mousedown', onPointerDown);
  el.addEventListener('touchstart', onPointerDown, { passive: true });
  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('touchmove', onPointerMove, { passive: false }); // Set to false to allow pinch control interception
  window.addEventListener('mouseup', onPointerUp);
  window.addEventListener('touchend', onPointerUp);
  el.addEventListener('wheel', onWheel);
  el.addEventListener('click', onClick);
  el._state = state;
}

function setTransform(el, x, y, scale, rot) {
  el.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${scale})`;
}

function getHypot(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function activate(target, state) {
  if (activeCard && activeCard !== target) deactivate(activeCard);
  activeCard = target;
  target.classList.add('active');
  target.style.zIndex = ++highestZ + 500;

  target.dataset.preCenterX = state.currentX;
  target.dataset.preCenterY = state.currentY;

    // --- REPLACE IT TO LOOK EXACTLY LIKE THIS ---
  const isMobile = window.innerWidth < 1024;
  let targetScale = 1.2;

  if (isMobile) {
    const targetWidth = window.innerWidth * 0.9;
    targetScale = targetWidth / target.offsetWidth;
  } else {
    // Limits the active card wide expansion bounds to a perfect desktop size
    targetScale = 500 / target.offsetWidth; 
  }

  // --- REPLACED LINES START ---
  const container = document.getElementById('gallery-container');
  const containerRect = container.getBoundingClientRect();

  const centerX = (containerRect.width - target.offsetWidth) / 2;
  const centerY = (containerRect.height - target.offsetHeight) / 2;
  // --- REPLACED LINES END ---

  state.currentX = centerX;
  state.currentY = centerY;
  state.rotation = 0;
  state.scale = targetScale;
  
  target.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)';
  setTransform(target, centerX, centerY, targetScale, 0);
  setTimeout(() => (target.style.transition = 'none'), 400);
}

function deactivate(target) {
  target.classList.remove('active');
  const state = target._state;

  state.currentX = parseFloat(target.dataset.preCenterX) || state.currentX;
  state.currentY = parseFloat(target.dataset.preCenterY) || state.currentY;
  
  state.scale = 1;
  state.rotation = (Math.random() * 20 - 10); 

  target.style.transition = 'transform 0.5s ease-out';
  setTransform(target, state.currentX, state.currentY, 1, state.rotation);
  
  setTimeout(() => (target.style.transition = 'none'), 500);
  if (activeCard === target) activeCard = null;
}

document
  .getElementById('gallery-container')
  .addEventListener('click', (e) => {
    if (e.target.id === 'gallery-container' && activeCard)
      deactivate(activeCard);
  });


    /* =========================================
       2. SMART CONFIGURATOR & DYNAMIC FAMILY
       ========================================= */

    // ⚠️ PASTE YOUR GOOGLE WEB APP URL HERE!
  

    let cart = [];
    let currentProduct = null;
    let selectedTierPrice = 0;
    let selectedTierName = "";
    
    // Holds files temporarily: { "Father": [File1, File2], "Child 2": [] }
    let fileStorage = {}; 

    function openConfig(btn, e) {
        e.stopPropagation(); 
        const card = btn.closest('.polaroid');
        
        // 1. Reset State
        fileStorage = {}; 
        currentProduct = { title: card.dataset.title, sku: card.dataset.sku };
        const members = card.dataset.members.split(',');
        const prices = card.dataset.prices.split(',');

        document.getElementById('conf-img').src = card.querySelector('img').src;
        document.getElementById('conf-title').innerText = currentProduct.title;
        document.getElementById('conf-sku').innerText = currentProduct.sku;

        // 2. Setup Prices
        const tierBox = document.getElementById('tier-container');
        tierBox.innerHTML = '';
        ['Social Media', 'Small Print', 'Large Print'].forEach((name, i) => {
            const div = document.createElement('div');
            div.className = 'tier-card';
            div.innerHTML = `<span class="tier-name">${name}</span><span class="tier-price">₱${prices[i]}</span>`;
            div.onclick = () => {
                document.querySelectorAll('.tier-card').forEach(t => t.classList.remove('selected'));
                div.classList.add('selected');
                selectedTierPrice = parseInt(prices[i]);
                selectedTierName = name;
            };
            if(i===0) div.click();
            tierBox.appendChild(div);
        });

        // 3. Setup Uploads (Default Members)
        const memBox = document.getElementById('members-container');
        memBox.innerHTML = ''; 
        members.forEach(member => {
            createUploadRow(member);
        });

        // 4. Add "Plus" Button
        const addBtn = document.createElement('button');
        addBtn.className = 'add-member-btn';
        addBtn.innerText = "+ Add Another Person (Child, Pet, etc.)";
        addBtn.onclick = addNewMember;
        memBox.appendChild(addBtn);

        document.getElementById('order-overlay').classList.add('open');
    }

    // --- DYNAMIC FAMILY LOGIC ---
    function addNewMember() {
        const name = prompt("Who are you adding? (e.g. 'Child 2', 'Grandma')");
        if (name && name.trim() !== "") {
            const memBox = document.getElementById('members-container');
            const btn = memBox.querySelector('.add-member-btn');
            btn.remove(); // Remove button temporarily
            createUploadRow(name); // Add new row
            memBox.appendChild(btn); // Put button back at bottom
        }
    }

    function createUploadRow(member) {
        if (!fileStorage[member]) {
            fileStorage[member] = []; 
        } else {
            member = member + " (" + (Math.random()*100).toFixed(0) + ")";
            fileStorage[member] = [];
        }

        const memBox = document.getElementById('members-container');
        const container = document.createElement('div');
        container.style.marginBottom = "15px";
        const safeId = member.replace(/[^a-zA-Z0-9]/g, ''); 

        container.innerHTML = `
            <div class="upload-row">
                <span class="upload-label">${member}</span>
                <label class="file-btn">
                    + Add Photos
                    <input type="file" multiple hidden onchange="handleFiles('${member}', this)">
                </label>
            </div>
            <div id="list-${safeId}" class="file-list"></div>
        `;
        memBox.appendChild(container);
    }

    // --- FILE HANDLERS ---
    function handleFiles(member, input) {
        if (input.files.length > 0) {
            fileStorage[member] = fileStorage[member].concat(Array.from(input.files));
            renderFileList(member);
            input.value = ''; 
        }
    }

    function removeFile(member, index) {
        fileStorage[member].splice(index, 1);
        renderFileList(member);
    }

    function renderFileList(member) {
        const safeId = member.replace(/[^a-zA-Z0-9]/g, ''); 
        const listEl = document.getElementById(`list-${safeId}`);
        listEl.innerHTML = ''; 
        fileStorage[member].forEach((file, index) => {
            const chip = document.createElement('div');
            chip.className = 'file-chip';
            chip.innerHTML = `<span>${file.name}</span><div class="delete-file" onclick="removeFile('${member}', ${index})">×</div>`;
            listEl.appendChild(chip);
        });
    }

    function closeModal() {
        document.getElementById('order-overlay').classList.remove('open');
    }

    function closeWelcomeModal() {
    const welcome = document.getElementById('welcomeModal');
    if (welcome) {
        welcome.style.display = 'none';
    }
}

   // --- ADD TO CART (Includes Dynamic Members) ---
    function addToCart() {
        const note = document.getElementById('conf-note').value;
        let itemFiles = [];
        
        // Loop through ALL keys in fileStorage (Defaults + New Members)
        Object.keys(fileStorage).forEach(member => {
            fileStorage[member].forEach(file => {
                itemFiles.push({ role: member, obj: file });
            });
        });

        cart.push({
            product: currentProduct.title,
            tier: selectedTierName,
            price: selectedTierPrice,
            note: note,
            files: itemFiles
        });
        
        const total = cart.reduce((sum, i) => sum + i.price, 0);
        document.getElementById('cart-total').innerText = "₱" + total;
        document.getElementById('cart-count').innerText = cart.length;
       document.getElementById('cart-wrapper').classList.add('visible');
        closeModal();
    }

   // --- CHECKOUT ---
async function checkout() {
    const btn = document.querySelector(".checkout-btn");
    const originalText = btn.innerText;

    if (cart.length === 0) {
        alert("Your cart is empty.");
        return;
    }

    const emailInput = document.getElementById("customer-email");
    const customerEmail = emailInput ? emailInput.value.trim() : "";

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(customerEmail)) {
        document.getElementById('emailErrorModal').style.display = 'flex';
        // Auto-opens your modal input layout bar from our previous update step
        if (typeof openEmailModal === "function") openEmailModal(); 
        return;
    }

    btn.disabled = true;
    btn.innerText = "⏳ Sending Order...";

    // --- ANIMATED LOADING OVERLAY INITIALIZATION ---
    document.getElementById('loadingOverlay').style.display = 'flex';
    const progressBar = document.getElementById('loadingProgressBar');
    progressBar.style.width = '0%';

    let progress = 0;
    const progressInterval = setInterval(() => {
        if (progress < 85) {
            progress += Math.random() * 12;
            if (progress > 85) progress = 85;
            progressBar.style.width = `${progress}%`;
        }
    }, 250);

    try {
        // Convert uploaded images
        const readFile = (file) =>
            new Promise((resolve) => {
                const reader = new FileReader();

                reader.onload = () => resolve({
                    name: file.name,
                    data: reader.result
                });

                reader.readAsDataURL(file);
            });

        let filesPayload = [];

        for (const item of cart) {
            for (const fileWrapper of (item.files || [])) {
                const img = await readFile(fileWrapper.obj);

                img.name =
                    `${item.product} (${item.tier}) - ${fileWrapper.role} - ${img.name}`;

                filesPayload.push(img);
            }
        }

        const payload = {
            orderId: "ORD-" + Date.now().toString().slice(-6),
            total: cart.reduce((sum, i) => sum + i.price, 0),

            itemsSummary: cart
                .map(i => `${i.product} (${i.tier})\nNote: ${i.note}`)
                .join("\n\n"),

            note: document.getElementById("conf-note").value.trim(),
            customerEmail,
            images: filesPayload
        };

        // Local vs Production
        const API_URL =
            location.hostname === "localhost" ||
            location.hostname === "127.0.0.1"
                ? "http://localhost:3000/api/order"
                : "https://xinavane-family-order.onrender.com/api/order";

        const res = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || "Unknown server error");
        }

        // --- SUCCESS RESOLUTION TRACKING ---
        clearInterval(progressInterval);
        progressBar.style.width = '100%';

        // Brief delay so they visually see the bar fill to 100% completion
        await new Promise(resolve => setTimeout(resolve, 500));
        document.getElementById('loadingOverlay').style.display = 'none';

        // --- NEW PREMIUM COMPONENT TRIGGER ---
        // Instead of a browser alert, we trigger the beautiful custom success popup
        document.getElementById('orderSuccessModal').style.display = 'flex';

    } catch (err) {
        // --- ERROR RESPONSES HANDLING ---
        clearInterval(progressInterval);
        document.getElementById('loadingOverlay').style.display = 'none';

        console.error(err);
        alert(err.message || "Unable to send order.");

    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

// --- STATE MANAGEMENT RESET UTILITY ---
// Clear the modal display rules, flush the item rows array, and refresh the desktop desk
function handleSuccessReset() {
    document.getElementById('orderSuccessModal').style.display = 'none';
    cart = [];
    location.reload();
}




// --- COMPACT CART VALUE SYNC ROUTINES ---
function openEmailModal() {
    const currentEmail = document.getElementById('customer-email').value;
    document.getElementById('modal-email-field').value = currentEmail;
    document.getElementById('emailCaptureModal').style.display = 'flex';
    setTimeout(() => document.getElementById('modal-email-field').focus(), 150);
}

function saveEmailFromModal() {
    const modalEmail = document.getElementById('modal-email-field').value.trim();
    const emailInput = document.getElementById('customer-email');
    const triggerBtn = document.getElementById('email-trigger-btn');
    
    // Updates your original targeted text nodes directly
    emailInput.value = modalEmail;
    
    if (modalEmail !== "") {
        triggerBtn.innerHTML = "EMAIL ✓";
        triggerBtn.style.background = "#22c55e"; 
        triggerBtn.style.borderColor = "#22c55e";
    } else {
        triggerBtn.innerHTML = "ENTER EMAIL";
        triggerBtn.style.background = "rgba(255,255,255,0.15)";
        triggerBtn.style.borderColor = "rgba(255,255,255,0.25)";
    }
    
    document.getElementById('emailCaptureModal').style.display = 'none';
}

// --- CATEGORY TAB FILTER CONTROLS (WITH AUTOMATIC SHUFFLE) ---
function filterCategory(targetCategory, selectedButton) {
    // 1. Swap active style class between tab elements smoothly
    document.querySelectorAll('.category-tab').forEach(btn => btn.classList.remove('active'));
    selectedButton.classList.add('active');

    // 2. Locate your active board container
    const board = document.getElementById('gallery-container');

    // 3. Toggle visibility and dynamically re-scatter filtered elements
    document.querySelectorAll('.polaroid').forEach(card => {
        const cardCategory = card.getAttribute('data-category');
        
        if (targetCategory === 'all' || cardCategory === targetCategory) {
            card.style.display = 'flex';
            card.style.opacity = '1';

            // --- THE LIVE SCATTER SHUFFLE LOGIC ---
            // Calculates fresh boundaries based on your desk container dimensions
            const maxX = (board ? board.offsetWidth : window.innerWidth) - 260;
            const maxY = (board ? board.offsetHeight : window.innerHeight) - 300;
            
            const x = Math.max(10, Math.random() * maxX);
            const y = Math.max(10, Math.random() * maxY);
            const r = Math.random() * 20 - 10; // Fresh random rotation angle

            // Update the card's tracking datasets so dragging still works perfectly
            card.dataset.homeX = x;
            card.dataset.homeY = y;
            card.dataset.homeR = r;

            // Sync the coordinates to the physics state engine
            if (card._state) {
                card._state.currentX = x;
                card._state.currentY = y;
                card._state.rotation = r;
            }

            // Fire an elegant, fluid CSS transition animation to shuffle them into place
            card.style.transition = 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)';
            setTransform(card, x, y, 1, r);
            
            // Clean up the transition property after animation completes so regular dragging stays instant
            setTimeout(() => {
                if (!card.classList.contains('active')) {
                    card.style.transition = 'none';
                }
            }, 500);

        } else {
            // Completely hide out-of-category card items from the screen grid mesh
            card.style.opacity = '0';
            card.style.display = 'none';
        }
    });
}