// Application State
const state = {
    pages: [],
    currentPageIndex: 0,
    selectedElement: null,
    history: [],
    historyIndex: -1,
    zoom: 1,
    isDragging: false,
    isResizing: false,
    isRotating: false,
    dragStart: { x: 0, y: 0 },
    elementStart: { x: 0, y: 0, width: 0, height: 0 },
    rotateStart: { x: 0, y: 0, angle: 0 }
};

// playback flag
state.isPlaying = false;

// Templates
const templates = [
    {
        id: 'blessing-invite',
        name: 'Blessing Invitation',
        background: '#f9e79f',
        elements: [
            {
                type: 'text',
                content: 'We invite you and your familys\ngracious presence and blessing',
                x: 50,
                y: 100,
                width: 350,
                height: 120,
                fontSize: 26,
                fontFamily: 'Charm, cursive',
                color: '#8b6914',
                textAlign: 'center',
                animation: 'fadeIn'
            },
            // decorative image removed from default template to avoid inserting it automatically
        ]
    },
    {
        id: 'blank',
        name: 'Blank Canvas',
        background: '#ffffff',
        elements: []
    },
    {
        id: 'simple-text',
        name: 'Simple Text',
        background: '#f0f0f0',
        elements: [
            {
                type: 'text',
                content: 'Your Text Here',
                x: 100,
                y: 350,
                width: 250,
                height: 100,
                fontSize: 32,
                fontFamily: 'Arial, sans-serif',
                color: '#333333',
                textAlign: 'center',
                rotation: 0,
                animation: 'slideInUp'
            }
        ]
    }
];

// Animation options
const animations = [
    { name: 'None', value: 'none' },
    { name: 'Fade In', value: 'fadeIn' },
    { name: 'Slide Left', value: 'slideInLeft' },
    { name: 'Slide Right', value: 'slideInRight' },
    { name: 'Slide Up', value: 'slideInUp' },
    { name: 'Slide Down', value: 'slideInDown' },
    { name: 'Zoom In', value: 'zoomIn' },
    { name: 'Rotate', value: 'rotate' }
];

// Initialize Application
function init() {
    // Create initial page
    if (state.pages.length === 0) {
        // start with a blank page by default (don't insert the decorated template/image)
        addPage(templates[1]);
    }
    
    renderPages();
    renderCurrentSlide();
    setupEventListeners();
    updateNavigationButtons();
}

// Add new page
function addPage(template = templates[1]) {
    const page = {
        id: Date.now(),
        background: template.background,
        elements: JSON.parse(JSON.stringify(template.elements)).map(el => ({ ...el, rotation: el.rotation || 0 })),
        duration: template.duration || 2
    };
    
    state.pages.push(page);
    state.currentPageIndex = state.pages.length - 1;
    saveToHistory();
    renderPages();
    renderCurrentSlide();
    updateNavigationButtons();
}

// Delete page
function deletePage(index) {
    if (state.pages.length <= 1) {
        alert('You must have at least one page');
        return;
    }
    
    state.pages.splice(index, 1);
    if (state.currentPageIndex >= state.pages.length) {
        state.currentPageIndex = state.pages.length - 1;
    }
    saveToHistory();
    renderPages();
    renderCurrentSlide();
    updateNavigationButtons();
}

// Duplicate page
function duplicatePage(index) {
    if (index < 0 || index >= state.pages.length) return;
    const page = state.pages[index];
    const copy = JSON.parse(JSON.stringify(page));
    copy.id = Date.now();
    // ensure rotation properties exist
    copy.elements = copy.elements.map(el => ({ ...el, rotation: el.rotation || 0 }));
    state.pages.splice(index + 1, 0, copy);
    state.currentPageIndex = index + 1;
    saveToHistory();
    renderPages();
    renderCurrentSlide();
    updateNavigationButtons();
}

// Render pages list
function renderPages() {
    // Populate Swiper slides in left sidebar
    const wrapper = document.getElementById('pagesSwiperWrapper');
    if (!wrapper) return;
    wrapper.innerHTML = '';

    state.pages.forEach((page, index) => {
        const slide = document.createElement('div');
        slide.className = 'swiper-slide';

        const pageItem = document.createElement('div');
        pageItem.className = `page-item ${index === state.currentPageIndex ? 'active' : ''}`;
        pageItem.onclick = () => switchPage(index);

        const thumbnail = document.createElement('div');
        thumbnail.className = 'page-thumbnail';
        thumbnail.style.background = page.background;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-delete-page';
        deleteBtn.innerHTML = '×';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deletePage(index);
        };

        const label = document.createElement('div');
        label.className = 'page-label';
    label.textContent = `Page ${index + 1} • ${page.duration || 2}s`;

        thumbnail.appendChild(deleteBtn);
        pageItem.appendChild(thumbnail);
        pageItem.appendChild(label);
        slide.appendChild(pageItem);
        wrapper.appendChild(slide);
    });

    // initialize/update Swiper and a visible custom scrollbar that syncs with Swiper's progress
    if (window.pagesSwiper) {
        window.pagesSwiper.update();
    } else {
        window.pagesSwiper = new Swiper('.swiper-container.pages-list', {
            direction: 'vertical',
            slidesPerView: 'auto',
            spaceBetween: 0,
            freeMode: true,
            // enable mousewheel with releaseOnEdges so wheel direction flips work
            mousewheel: {
                releaseOnEdges: true
            }
        });

        // create a simple visible scrollbar (track + thumb) inside the pages list
        (function createCustomScrollbar() {
            const pagesListEl = document.getElementById('pagesList');
            if (!pagesListEl) return;
            // ensure relative positioning for absolute scrollbar
            pagesListEl.style.position = pagesListEl.style.position || 'relative';

            if (pagesListEl.querySelector('.custom-scrollbar')) return; // already created

            const track = document.createElement('div');
            track.className = 'custom-scrollbar';
            const thumb = document.createElement('div');
            thumb.className = 'custom-scrollbar-thumb';
            track.appendChild(thumb);
            pagesListEl.appendChild(track);

            // update thumb size/position based on swiper metrics
            function updateThumb() {
                const swiper = window.pagesSwiper;
                if (!swiper) return;
                const trackRect = track.getBoundingClientRect();
                const trackH = Math.max(0, trackRect.height);
                const contentH = swiper.virtualSize || (swiper.wrapperEl ? swiper.wrapperEl.scrollHeight : 0);
                const viewH = swiper.size || trackH;

                if (!contentH || contentH <= viewH) {
                    track.style.display = 'none';
                    return;
                }

                track.style.display = 'block';
                const thumbH = Math.max(20, Math.round((viewH / contentH) * trackH));
                const maxTop = trackH - thumbH;
                const top = Math.round((swiper.progress || 0) * maxTop);
                thumb.style.height = thumbH + 'px';
                thumb.style.top = top + 'px';
            }

            // events: update on translate/progress/resize
            window.pagesSwiper.on('setTranslate', updateThumb);
            window.pagesSwiper.on('progress', updateThumb);
            window.addEventListener('resize', updateThumb);

            // initial sync
            setTimeout(updateThumb, 50);

            // clicking track jumps to position
            track.addEventListener('click', (ev) => {
                if (ev.target === thumb) return; // handled by drag
                const rect = track.getBoundingClientRect();
                const y = ev.clientY - rect.top;
                const thumbH = thumb.clientHeight || 20;
                const maxTop = rect.height - thumbH;
                const target = (y - thumbH / 2) / maxTop;
                window.pagesSwiper.setProgress(Math.max(0, Math.min(1, target)));
            });

            // drag thumb
            let dragging = false;
            let startY = 0;
            let startTop = 0;

            thumb.addEventListener('mousedown', (ev) => {
                ev.preventDefault();
                dragging = true;
                startY = ev.clientY;
                startTop = parseInt(thumb.style.top || 0, 10) || 0;
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });

            function onMouseMove(ev) {
                if (!dragging) return;
                const rect = track.getBoundingClientRect();
                const delta = ev.clientY - startY;
                const thumbH = thumb.clientHeight || 20;
                let newTop = startTop + delta;
                newTop = Math.max(0, Math.min(rect.height - thumbH, newTop));
                thumb.style.top = newTop + 'px';
                const progress = newTop / (rect.height - thumbH);
                window.pagesSwiper.setProgress(progress);
            }

            function onMouseUp() {
                dragging = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }
        })();
    }
    
    // Render pagination dots
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    
    state.pages.forEach((page, index) => {
        const dot = document.createElement('div');
        dot.className = `page-dot ${index === state.currentPageIndex ? 'active' : ''}`;
        dot.onclick = () => switchPage(index);
        pagination.appendChild(dot);
    });
}

// Switch to page
function switchPage(index) {
    if (index >= 0 && index < state.pages.length) {
        state.currentPageIndex = index;
        state.selectedElement = null;
        renderPages();
        renderCurrentSlide();
        updateNavigationButtons();
        renderPropertiesPanel();
    }
}

// Render current slide
function renderCurrentSlide() {
    const currentSlide = document.getElementById('currentSlide');
    const page = state.pages[state.currentPageIndex];
    
    if (!page) return;
    
    currentSlide.innerHTML = '';
    currentSlide.style.background = page.background;
    
    page.elements.forEach((element, index) => {
        const el = createElementNode(element, index);
        currentSlide.appendChild(el);
    });
}

// Create element node
function createElementNode(element, index) {
    const el = document.createElement('div');
    el.className = 'slide-element';
    el.dataset.index = index;
    
    if (element.animation && element.animation !== 'none') {
        el.classList.add(`animate-${element.animation}`);
    }
    
    if (element.type === 'text') {
        el.classList.add('text-element');
        el.textContent = element.content;
        el.style.fontSize = element.fontSize + 'px';
        el.style.fontFamily = element.fontFamily;
        el.style.color = element.color;
        el.style.textAlign = element.textAlign || 'left';
        el.style.lineHeight = (element.lineHeight || 1.15) + '';
    } else if (element.type === 'image') {
        el.classList.add('image-element');
        el.style.backgroundImage = `url(${element.src})`;
    }
    
    el.style.left = element.x + 'px';
    el.style.top = element.y + 'px';
    el.style.width = element.width + 'px';
    el.style.height = element.height + 'px';
    el.style.transform = `rotate(${(element.rotation || 0)}deg)`;
    
    // Add resize handles
    const handles = ['nw', 'ne', 'sw', 'se'];
    handles.forEach(pos => {
        const handle = document.createElement('div');
        handle.className = `resize-handle ${pos}`;
        handle.dataset.position = pos;
        el.appendChild(handle);
    });
    
    // Add rotate handle
    const rotateHandle = document.createElement('div');
    rotateHandle.className = 'rotate-handle';
    el.appendChild(rotateHandle);
    
    // Event listeners
    el.addEventListener('mousedown', (e) => startDrag(e, index));
    
    el.querySelectorAll('.resize-handle').forEach(handle => {
        handle.addEventListener('mousedown', (e) => startResize(e, index));
    });

    rotateHandle.addEventListener('mousedown', (e) => startRotate(e, index));
    
    if (state.selectedElement === index) {
        el.classList.add('selected');
    }

    return el;
}

// Start dragging element
function startDrag(e, index) {
    if (e.target.classList.contains('resize-handle')) return;
    if (e.target.classList.contains('rotate-handle')) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const page = state.pages[state.currentPageIndex];
    const element = page.elements[index];
    
    state.selectedElement = index;
    state.isDragging = true;
    state.dragStart = { x: e.clientX, y: e.clientY };
    state.elementStart = { x: element.x, y: element.y };
    
    renderCurrentSlide();
    renderPropertiesPanel();
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
}

// Drag element
function drag(e) {
    if (!state.isDragging) return;
    
    const page = state.pages[state.currentPageIndex];
    const element = page.elements[state.selectedElement];
    const dx = e.clientX - state.dragStart.x;
    const dy = e.clientY - state.dragStart.y;

    // use canvas size for bounds (responsive)
    const canvasEl = document.getElementById('canvas');
    const canvasRect = canvasEl.getBoundingClientRect();
    const canvasW = Math.round(canvasRect.width);
    const canvasH = Math.round(canvasRect.height);

    element.x = Math.max(0, Math.min(canvasW - element.width, state.elementStart.x + dx));
    element.y = Math.max(0, Math.min(canvasH - element.height, state.elementStart.y + dy));
    
    const el = document.querySelector(`[data-index="${state.selectedElement}"]`);
    el.style.left = element.x + 'px';
    el.style.top = element.y + 'px';
}

// Stop dragging
function stopDrag() {
    if (state.isDragging) {
        state.isDragging = false;
        saveToHistory();
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', stopDrag);
    }
}

// Start resizing element
function startResize(e, index) {
    e.preventDefault();
    e.stopPropagation();
    
    const page = state.pages[state.currentPageIndex];
    const element = page.elements[index];
    
    state.selectedElement = index;
    state.isResizing = true;
    state.resizePosition = e.target.dataset.position;
    state.dragStart = { x: e.clientX, y: e.clientY };
    state.elementStart = {
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height
    };
    
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
}

// Resize element
function resize(e) {
    if (!state.isResizing) return;
    
    const page = state.pages[state.currentPageIndex];
    const element = page.elements[state.selectedElement];
    
    const dx = e.clientX - state.dragStart.x;
    const dy = e.clientY - state.dragStart.y;
    
    const pos = state.resizePosition;
    
    if (pos.includes('e')) {
        element.width = Math.max(50, state.elementStart.width + dx);
    }
    if (pos.includes('w')) {
        const newWidth = Math.max(50, state.elementStart.width - dx);
        const widthDiff = newWidth - element.width;
        element.width = newWidth;
        element.x = state.elementStart.x - widthDiff;
    }
    if (pos.includes('s')) {
        element.height = Math.max(30, state.elementStart.height + dy);
    }
    if (pos.includes('n')) {
        const newHeight = Math.max(30, state.elementStart.height - dy);
        const heightDiff = newHeight - element.height;
        element.height = newHeight;
        element.y = state.elementStart.y - heightDiff;
    }
    
    const el = document.querySelector(`[data-index="${state.selectedElement}"]`);
    el.style.left = element.x + 'px';
    el.style.top = element.y + 'px';
    el.style.width = element.width + 'px';
    el.style.height = element.height + 'px';
}

// Stop resizing
function stopResize() {
    if (state.isResizing) {
        state.isResizing = false;
        saveToHistory();
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResize);
    }
}

// Rotation handlers
function startRotate(e, index) {
    e.preventDefault();
    e.stopPropagation();
    state.selectedElement = index;
    state.isRotating = true;
    state.rotateStart = { x: e.clientX, y: e.clientY, angle: (state.pages[state.currentPageIndex].elements[index].rotation || 0) };
    document.addEventListener('mousemove', rotate);
    document.addEventListener('mouseup', stopRotate);
}

function rotate(e) {
    if (!state.isRotating) return;
    const page = state.pages[state.currentPageIndex];
    const element = page.elements[state.selectedElement];
    const centerX = element.x + element.width / 2;
    const centerY = element.y + element.height / 2;
    const dx1 = state.rotateStart.x - centerX;
    const dy1 = state.rotateStart.y - centerY;
    const dx2 = e.clientX - centerX;
    const dy2 = e.clientY - centerY;
    const angle1 = Math.atan2(dy1, dx1);
    const angle2 = Math.atan2(dy2, dx2);
    const delta = (angle2 - angle1) * (180 / Math.PI);
    element.rotation = (state.rotateStart.angle + delta) % 360;
    renderCurrentSlide();
}

function stopRotate() {
    if (state.isRotating) {
        state.isRotating = false;
        saveToHistory();
        document.removeEventListener('mousemove', rotate);
        document.removeEventListener('mouseup', stopRotate);
    }
}

// Draw an element onto a 2D canvas context. progress (0..1) can be used for simple enter animations.
function drawElementOnCtx(ctx, el, progress = 1, canvasW = 450, canvasH = 800) {
    return new Promise((resolve) => {
        ctx.save();
        const x = el.x;
        const y = el.y;
        const w = el.width;
        const h = el.height;
        const cx = x + w / 2;
        const cy = y + h / 2;

        // basic animation transforms
        let alpha = 1;
        let tx = 0, ty = 0, scale = 1;
        const anim = el.animation || 'none';
        if (anim === 'fadeIn') alpha = progress;
        else if (anim === 'slideInLeft') { tx = (1 - progress) * -canvasW * 0.25; alpha = progress; }
        else if (anim === 'slideInRight') { tx = (1 - progress) * canvasW * 0.25; alpha = progress; }
        else if (anim === 'slideInUp') { ty = (1 - progress) * canvasH * 0.2; alpha = progress; }
        else if (anim === 'zoomIn') { scale = 0.5 + progress * 0.5; alpha = progress; }

        ctx.globalAlpha = alpha;
        ctx.translate(cx, cy);
        ctx.rotate((el.rotation || 0) * Math.PI / 180);
        ctx.scale(scale, scale);
        ctx.translate(-cx, -cy);
        ctx.translate(tx, ty);

        if (el.type === 'image') {
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, x, y, w, h);
                ctx.restore();
                resolve();
            };
            img.onerror = () => { ctx.restore(); resolve(); };
            img.src = el.src;
        } else if (el.type === 'text') {
            ctx.fillStyle = el.color || '#000';
            const fs = el.fontSize || 24;
            ctx.font = `${fs}px ${el.fontFamily || 'sans-serif'}`;
            ctx.textAlign = el.textAlign || 'left';
            ctx.textBaseline = 'top';
            const lines = (el.content || '').split('\n');
            let offsetY = y;
            const lh = el.lineHeight || 1.15;
            for (let line of lines) {
                if (ctx.textAlign === 'center') ctx.fillText(line, x + w / 2, offsetY, w);
                else if (ctx.textAlign === 'right') ctx.fillText(line, x + w, offsetY, w);
                else ctx.fillText(line, x, offsetY, w);
                offsetY += fs * lh;
            }
            ctx.restore();
            resolve();
        } else {
            ctx.restore();
            resolve();
        }
    });
}

// Render properties panel
function renderPropertiesPanel() {
    const panelContent = document.getElementById('panelContent');
    
    if (state.selectedElement === null) {
        // Show page-level settings when no element is selected
        const page = state.pages[state.currentPageIndex];
        panelContent.innerHTML = `
            <div class="form-group">
                <label>Background</label>
                <div style="display:flex;gap:8px;align-items:center">
                    <div class="color-preview" id="pageBgPreview" style="background:${page.background};width:48px;height:48px"></div>
                    <div style="display:flex;flex-direction:column;gap:8px;flex:1">
                        <button class="btn-secondary" id="editBgBtn">Change Background</button>
                        <div style="display:flex;gap:8px">
                            <button class="btn-secondary" id="pageAddText">Add Text</button>
                            <button class="btn-secondary" id="pageAddImage">Add Image</button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="form-group">
                <label>Per-page duration (s)</label>
                <input type="number" id="pageDuration" value="${page.duration || 2}" min="0.5" step="0.5">
            </div>
            <div class="form-group">
                <button class="btn-secondary" id="duplicateThisPage">Duplicate Page</button>
            </div>
        `;

        // wire listeners
        document.getElementById('editBgBtn').addEventListener('click', () => changeBackground());
        document.getElementById('pageAddText').addEventListener('click', () => { addTextElement(); });
        document.getElementById('pageAddImage').addEventListener('click', () => { addImageElement(); });
        document.getElementById('duplicateThisPage').addEventListener('click', () => duplicatePage(state.currentPageIndex));

        document.getElementById('pageDuration').addEventListener('input', (e) => {
            const v = parseFloat(e.target.value) || 2;
            page.duration = v;
            renderPages();
            saveToHistory();
        });

        return;
    }
    
    const page = state.pages[state.currentPageIndex];
    const element = page.elements[state.selectedElement];
    
    let html = '';
    
    if (element.type === 'text') {
        html = `
            <div class="form-group">
                <label>Text Content</label>
                <textarea id="textContent">${element.content}</textarea>
            </div>
            
            <div class="form-group">
                <label>Font Family</label>
                <select id="fontFamily">
                    <option value="Arial, sans-serif" ${element.fontFamily === 'Arial, sans-serif' ? 'selected' : ''}>Arial</option>
                    <option value="Charm, cursive" ${element.fontFamily === 'Charm, cursive' ? 'selected' : ''}>Charm</option>
                    <option value="Georgia, serif" ${element.fontFamily === 'Georgia, serif' ? 'selected' : ''}>Georgia</option>
                    <option value="Courier New, monospace" ${element.fontFamily === 'Courier New, monospace' ? 'selected' : ''}>Courier</option>
                    <option value="Verdana, sans-serif" ${element.fontFamily === 'Verdana, sans-serif' ? 'selected' : ''}>Verdana</option>
                </select>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Font Size</label>
                    <div style="display:flex;gap:8px;align-items:center">
                        <input type="number" id="fontSize" value="${element.fontSize}" min="8" max="120" style="width:80px">
                        <input type="range" id="fontSizeSlider" min="8" max="120" value="${element.fontSize}" style="flex:1">
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Color</label>
                    <div class="color-input-wrapper">
                        <div class="color-preview" id="colorPreview" style="background: ${element.color}"></div>
                        <input type="color" id="textColor" value="${element.color}">
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label>Text Align</label>
                <select id="textAlign">
                    <option value="left" ${element.textAlign === 'left' ? 'selected' : ''}>Left</option>
                    <option value="center" ${element.textAlign === 'center' ? 'selected' : ''}>Center</option>
                    <option value="right" ${element.textAlign === 'right' ? 'selected' : ''}>Right</option>
                </select>
            </div>
        `;
    }
    
    html += `
        <div class="form-row">
            <div class="form-group">
                <label>X Position</label>
                <input type="number" id="elementX" value="${Math.round(element.x)}" min="0">
            </div>
            
            <div class="form-group">
                <label>Y Position</label>
                <input type="number" id="elementY" value="${Math.round(element.y)}" min="0">
            </div>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>Width</label>
                <input type="number" id="elementWidth" value="${Math.round(element.width)}" min="50">
            </div>
            
            <div class="form-group">
                <label>Height</label>
                <input type="number" id="elementHeight" value="${Math.round(element.height)}" min="30">
            </div>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label>Rotation (deg)</label>
                <input type="number" id="elementRotation" value="${element.rotation || 0}" step="1">
            </div>
            <div class="form-group">
                <label>Line Height</label>
                <input type="number" id="elementLineHeight" value="${element.lineHeight || 1.15}" step="0.05" min="0.6" max="3">
            </div>
        </div>

        <div class="form-group">
            <label>Animation</label>
            <div class="animation-options" id="animationOptions">
                ${animations.map(anim => `
                    <div class="animation-option ${element.animation === anim.value ? 'selected' : ''}" data-animation="${anim.value}">
                        ${anim.name}
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="form-group">
            <button class="btn-secondary" id="deleteElementBtn" style="width: 100%; background: #ff4444; color: white;">Delete Element</button>
        </div>
    `;
    
    panelContent.innerHTML = html;
    
    // Add event listeners
    if (element.type === 'text') {
        document.getElementById('textContent').addEventListener('input', (e) => {
            element.content = e.target.value;
            renderCurrentSlide();
            saveToHistory();
        });
        
        document.getElementById('fontFamily').addEventListener('change', (e) => {
            element.fontFamily = e.target.value;
            renderCurrentSlide();
            saveToHistory();
        });
        
        const fontSizeInput = document.getElementById('fontSize');
        const fontSizeSlider = document.getElementById('fontSizeSlider');
        if (fontSizeInput) {
            fontSizeInput.addEventListener('input', (e) => {
                element.fontSize = parseInt(e.target.value) || element.fontSize;
                if (fontSizeSlider) fontSizeSlider.value = element.fontSize;
                renderCurrentSlide();
                saveToHistory();
            });
        }
        if (fontSizeSlider) {
            fontSizeSlider.addEventListener('input', (e) => {
                element.fontSize = parseInt(e.target.value) || element.fontSize;
                if (fontSizeInput) fontSizeInput.value = element.fontSize;
                renderCurrentSlide();
                saveToHistory();
            });
        }
        
        document.getElementById('colorPreview').addEventListener('click', () => {
            document.getElementById('textColor').click();
        });
        
        document.getElementById('textColor').addEventListener('input', (e) => {
            element.color = e.target.value;
            document.getElementById('colorPreview').style.background = e.target.value;
            renderCurrentSlide();
            saveToHistory();
        });
        
        document.getElementById('textAlign').addEventListener('change', (e) => {
            element.textAlign = e.target.value;
            renderCurrentSlide();
            saveToHistory();
        });
    }
    
    document.getElementById('elementX').addEventListener('input', (e) => {
        element.x = parseInt(e.target.value);
        renderCurrentSlide();
        saveToHistory();
    });
    
    document.getElementById('elementY').addEventListener('input', (e) => {
        element.y = parseInt(e.target.value);
        renderCurrentSlide();
        saveToHistory();
    });
    
    document.getElementById('elementWidth').addEventListener('input', (e) => {
        element.width = parseInt(e.target.value);
        renderCurrentSlide();
        saveToHistory();
    });
    
    document.getElementById('elementHeight').addEventListener('input', (e) => {
        element.height = parseInt(e.target.value);
        renderCurrentSlide();
        saveToHistory();
    });
    
    // Rotation & line-height
    const rotInput = document.getElementById('elementRotation');
    if (rotInput) {
        rotInput.addEventListener('input', (e) => {
            element.rotation = parseFloat(e.target.value) || 0;
            renderCurrentSlide();
            saveToHistory();
        });
    }

    const lhInput = document.getElementById('elementLineHeight');
    if (lhInput) {
        lhInput.addEventListener('input', (e) => {
            element.lineHeight = parseFloat(e.target.value) || 1.15;
            renderCurrentSlide();
            saveToHistory();
        });
    }
    
    document.querySelectorAll('.animation-option').forEach(opt => {
        opt.addEventListener('click', () => {
            element.animation = opt.dataset.animation;
            document.querySelectorAll('.animation-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            renderCurrentSlide();
            saveToHistory();
        });
    });
    
    document.getElementById('deleteElementBtn').addEventListener('click', () => {
        page.elements.splice(state.selectedElement, 1);
        state.selectedElement = null;
        renderCurrentSlide();
        renderPropertiesPanel();
        saveToHistory();
    });
}

// Add text element
function addTextElement() {
    const page = state.pages[state.currentPageIndex];
    const newElement = {
        type: 'text',
        content: 'New Text',
        x: 100,
        y: 100,
        width: 250,
        height: 80,
        fontSize: 24,
        fontFamily: 'Arial, sans-serif',
        color: '#333333',
        textAlign: 'center',
        animation: 'fadeIn'
    };
    
    page.elements.push(newElement);
    state.selectedElement = page.elements.length - 1;
    renderCurrentSlide();
    renderPropertiesPanel();
    saveToHistory();
    closeModal('moreOptionsModal');
}

// Add image element
function addImageElement() {
    // Use the shared hidden input element so we don't create many inputs
    const input = document.getElementById('elementUploadInput');
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const page = state.pages[state.currentPageIndex];
                const newElement = {
                    type: 'image',
                    src: event.target.result,
                    x: 100,
                    y: 200,
                    width: 200,
                    height: 200,
                    rotation: 0,
                    animation: 'zoomIn'
                };

                page.elements.push(newElement);
                state.selectedElement = page.elements.length - 1;
                renderCurrentSlide();
                renderPropertiesPanel();
                saveToHistory();
            };
            reader.readAsDataURL(file);
        }
        // clear value to allow same file re-selection
        input.value = '';
    };
    input.click();
    closeModal('moreOptionsModal');
}

// Change background
function changeBackground() {
    // Ask user whether to upload image or pick color
    const useImage = confirm('Click OK to upload an image for the background, Cancel to pick a color');
    if (useImage) {
        const input = document.getElementById('bgUploadInput');
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    state.pages[state.currentPageIndex].background = `url(${event.target.result})`;
                    renderCurrentSlide();
                    saveToHistory();
                };
                reader.readAsDataURL(file);
            }
            input.value = '';
        };
        input.click();
    } else {
        const color = prompt('Enter a background color (hex), e.g. #ffffff', state.pages[state.currentPageIndex].background || '#ffffff');
        if (color) {
            state.pages[state.currentPageIndex].background = color;
            renderCurrentSlide();
            saveToHistory();
        }
    }
    closeModal('moreOptionsModal');
}

// History management
function saveToHistory() {
    state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push(JSON.stringify(state.pages));
    state.historyIndex++;
    
    if (state.history.length > 50) {
        state.history.shift();
        state.historyIndex--;
    }
}

function undo() {
    if (state.historyIndex > 0) {
        state.historyIndex--;
        state.pages = JSON.parse(state.history[state.historyIndex]);
        renderPages();
        renderCurrentSlide();
    }
}

function redo() {
    if (state.historyIndex < state.history.length - 1) {
        state.historyIndex++;
        state.pages = JSON.parse(state.history[state.historyIndex]);
        renderPages();
        renderCurrentSlide();
    }
}

// Navigation
function updateNavigationButtons() {
    document.getElementById('prevSlide').disabled = state.currentPageIndex === 0;
    document.getElementById('nextSlide').disabled = state.currentPageIndex === state.pages.length - 1;
}

// Play preview through slides
async function playPreview(defaultDuration = 2) {
    if (state.isPlaying) return;
    state.isPlaying = true;
    const playBtn = document.getElementById('playPreviewBtn');
    if (playBtn) playBtn.textContent = 'Playing...';

    // simple playback: iterate pages and render each for its duration
    for (let i = 0; i < state.pages.length; i++) {
        if (!state.isPlaying) break;
        state.currentPageIndex = i;
        renderPages();
        renderCurrentSlide();
        renderPropertiesPanel();
        const dur = state.pages[i].duration || defaultDuration;
        await new Promise(r => setTimeout(r, dur * 1000));
    }

    state.isPlaying = false;
    if (playBtn) playBtn.textContent = 'Play Preview ▶';
}

// Zoom controls
function zoomIn() {
    state.zoom = Math.min(2, state.zoom + 0.1);
    updateZoom();
}

function zoomOut() {
    state.zoom = Math.max(0.5, state.zoom - 0.1);
    updateZoom();
}

function updateZoom() {
    const canvas = document.getElementById('canvas');
    canvas.style.transform = `scale(${state.zoom})`;
    document.getElementById('zoomLevel').textContent = Math.round(state.zoom * 100) + '%';
    syncZoomSlider();
}

// sync slider (if present)
function syncZoomSlider() {
    const slider = document.getElementById('zoomSlider');
    if (slider) slider.value = Math.round(state.zoom * 100);
}

// Modal functions
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Show templates
function showTemplates() {
    const grid = document.getElementById('templatesGrid');
    grid.innerHTML = '';
    
    templates.forEach(template => {
        const card = document.createElement('div');
        card.className = 'template-card';
        card.onclick = () => {
            addPage(template);
            closeModal('templatesModal');
        };
        
        const preview = document.createElement('div');
        preview.className = 'template-preview';
        preview.style.background = template.background;
        
        const name = document.createElement('div');
        name.className = 'template-name';
        name.textContent = template.name;
        
        card.appendChild(preview);
        card.appendChild(name);
        grid.appendChild(card);
    });
    
    openModal('templatesModal');
}

// Download video
async function downloadVideo() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.classList.add('active');

    // Video params - derive from canvas size so output matches editor preview
    const canvasPreview = document.getElementById('canvas');
    const width = Math.max(320, Math.round(parseFloat(getComputedStyle(canvasPreview).width)));
    const height = Math.max(320, Math.round(parseFloat(getComputedStyle(canvasPreview).height)));
    const fps = 30;
    const secondsPerSlide = 2; // default duration per slide

    // Offscreen canvas to draw slides for the recorder
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const stream = canvas.captureStream(fps);
    const recordedChunks = [];
    let recorder;
    try {
        recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
    } catch (e) {
        try { recorder = new MediaRecorder(stream); } catch (err) { alert('MediaRecorder is not supported in this browser'); loadingOverlay.classList.remove('active'); return; }
    }

    recorder.ondataavailable = (ev) => { if (ev.data && ev.data.size) recordedChunks.push(ev.data); };
    recorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'project.webm';
        a.click();
        URL.revokeObjectURL(url);
        loadingOverlay.classList.remove('active');
        alert('Export complete (webm). This is a browser-side simulated export. Rename to .mp4 if needed.');
    };

    recorder.start();

    // render each slide for a number of frames (use per-page duration if provided)
    for (let p = 0; p < state.pages.length; p++) {
        const page = state.pages[p];
        const dur = page.duration || secondsPerSlide;
        const totalFrames = Math.max(1, Math.round(dur * fps));
        for (let f = 0; f < totalFrames; f++) {
            // draw background
            ctx.clearRect(0, 0, width, height);
            if (page.background && page.background.startsWith('url(')) {
                const dataUrl = page.background.slice(4, -1).replace(/"/g, '');
                // sync draw
                await new Promise(res => {
                    const img = new Image();
                    img.onload = () => {
                        const scale = Math.max(width / img.width, height / img.height);
                        const sw = img.width * scale;
                        const sh = img.height * scale;
                        const sx = (width - sw) / 2;
                        const sy = (height - sh) / 2;
                        ctx.drawImage(img, sx, sy, sw, sh);
                        res();
                    };
                    img.onerror = () => res();
                    img.src = dataUrl;
                });
            } else {
                ctx.fillStyle = page.background || '#ffffff';
                ctx.fillRect(0, 0, width, height);
            }

            // draw elements (await each so images are rendered into canvas before frame)
            for (let el of page.elements) {
                const progress = Math.min(1, f / totalFrames);
                await drawElementOnCtx(ctx, el, progress, width, height);
            }

            // wait for the next frame interval
            await new Promise(r => setTimeout(r, 1000 / fps));
        }
    }

    // give recorder a moment to capture final frames
    setTimeout(() => recorder.stop(), 100);
}

// Setup event listeners
function setupEventListeners() {
    // Header buttons
    document.getElementById('backBtn').addEventListener('click', () => {
        if (confirm('Are you sure you want to go back? Unsaved changes will be lost.')) {
            location.reload();
        }
    });
    
    document.getElementById('undoBtn').addEventListener('click', undo);
    document.getElementById('redoBtn').addEventListener('click', redo);
    document.getElementById('saveBtn').addEventListener('click', () => {
        localStorage.setItem('videoProject', JSON.stringify(state.pages));
        alert('Project saved!');
    });
    document.getElementById('downloadBtn').addEventListener('click', downloadVideo);
    
    // Sidebar
    document.getElementById('addPageBtn').addEventListener('click', () => showTemplates());
    document.getElementById('customizePagesBtn').addEventListener('click', () => showTemplates());
    
    // Navigation
    document.getElementById('prevSlide').addEventListener('click', () => {
        switchPage(state.currentPageIndex - 1);
    });
    document.getElementById('nextSlide').addEventListener('click', () => {
        switchPage(state.currentPageIndex + 1);
    });
    
    // Zoom
    document.getElementById('zoomIn').addEventListener('click', zoomIn);
    document.getElementById('zoomOut').addEventListener('click', zoomOut);
    // Zoom slider
    const zoomSlider = document.getElementById('zoomSlider');
    if (zoomSlider) {
        // initialize slider position
        zoomSlider.value = Math.round(state.zoom * 100);
        zoomSlider.addEventListener('input', (e) => {
            state.zoom = (parseInt(e.target.value, 10) || 100) / 100;
            updateZoom();
        });
    }
    
    // Duplicate page
    const dupBtn = document.getElementById('duplicatePageBtn');
    if (dupBtn) dupBtn.addEventListener('click', () => duplicatePage(state.currentPageIndex));

    // Play preview and slide duration
    const playBtn = document.getElementById('playPreviewBtn');
    const durationInput = document.getElementById('slideDurationInput');
    if (playBtn && durationInput) {
        playBtn.addEventListener('click', () => {
            const v = parseFloat(durationInput.value) || 2;
            // set duration for all pages as default unless user had custom values
            state.pages.forEach(p => p.duration = p.duration || v);
            playPreview(v);
        });
    }
    
    // More options button
    document.getElementById('moreOptionsBtn').addEventListener('click', () => {
        openModal('moreOptionsModal');
    });
    
    // Modal close buttons
    document.getElementById('closeTemplatesModal').addEventListener('click', () => {
        closeModal('templatesModal');
    });
    document.getElementById('closeMoreOptionsModal').addEventListener('click', () => {
        closeModal('moreOptionsModal');
    });
    
    // More options actions
    document.getElementById('addTextBtn').addEventListener('click', addTextElement);
    document.getElementById('addImageBtn').addEventListener('click', addImageElement);
    document.getElementById('changeBackgroundBtn').addEventListener('click', changeBackground);
    document.getElementById('addShapeBtn').addEventListener('click', () => {
        alert('Shape feature coming soon!');
        closeModal('moreOptionsModal');
    });
    
    // Click outside canvas to deselect
    document.getElementById('canvas').addEventListener('click', (e) => {
        if (e.target.id === 'currentSlide') {
            state.selectedElement = null;
            renderCurrentSlide();
            renderPropertiesPanel();
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z') {
                e.preventDefault();
                undo();
            } else if (e.key === 'y') {
                e.preventDefault();
                redo();
            }
        }
        
        if (e.key === 'Delete' && state.selectedElement !== null) {
            const page = state.pages[state.currentPageIndex];
            page.elements.splice(state.selectedElement, 1);
            state.selectedElement = null;
            renderCurrentSlide();
            renderPropertiesPanel();
            saveToHistory();
        }
    });
    
    // Load saved project
    const saved = localStorage.getItem('videoProject');
    if (saved) {
        try {
            state.pages = JSON.parse(saved);
            renderPages();
            renderCurrentSlide();
        } catch (e) {
            console.error('Failed to load saved project');
        }
    }

    // remove any leftover embedded default SVGs (e.g. previous decorative assets) from loaded pages
    (function removeEmbeddedDefaultSVGs() {
        let removed = false;
        if (!state.pages || !Array.isArray(state.pages)) return;
        state.pages.forEach(page => {
            if (!page || !Array.isArray(page.elements)) return;
            const kept = page.elements.filter(el => {
                if (el && el.type === 'image' && typeof el.src === 'string') {
                    // heuristic: remove embedded SVG data URLs that contain 'radialGradient' or the common <svg> marker
                    if (el.src.startsWith('data:image/svg+xml,') && (el.src.includes('radialGradient') || el.src.includes('<svg') || el.src.includes('%3Csvg')) ) {
                        removed = true;
                        return false; // drop this element
                    }
                }
                return true;
            });
            page.elements = kept;
        });
        if (removed) {
            renderPages();
            renderCurrentSlide();
            saveToHistory();
        }
    })();

    // ensure zoom UI reflects state on load
    updateZoom();
    syncZoomSlider();
}

// Initialize app when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}