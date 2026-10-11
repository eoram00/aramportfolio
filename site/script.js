const portfolioList = document.getElementById("portfolio-list");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let portfolioItems = [];
const categoryLabels = {
  rblx_thumbnail: "GAME THUMBNAIL", animation: "ANIMATION", "애니메이션": "ANIMATION",
  "logo design": "IDENTITY DESIGN", "로고디자인": "IDENTITY DESIGN", Rovelyz: "CONTENT THUMBNAIL"
};
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}
function safeLink(value) {
  try {
    const url = new URL(String(value || "#contact"), window.location.href);
    return ["https:", "http:", "mailto:"].includes(url.protocol) ? url.href : "#contact";
  } catch { return "#contact"; }
}
let revealObserver;
if ("IntersectionObserver" in window && !reduceMotion.matches) {
  document.documentElement.classList.add("js-motion");
  revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: .08 });
  document.querySelectorAll(".reveal").forEach(element => revealObserver.observe(element));
}
function renderPortfolio(items) {
  portfolioItems = items;
  document.querySelectorAll("[data-work-count]").forEach(label => {
    label.textContent = String(items.length).padStart(2, "0");
  });
  if (!items.length) {
    portfolioList.innerHTML = '<p class="empty-state">등록된 작업이 없습니다.</p>';
    return;
  }
  portfolioList.innerHTML = items.map((item, index) => {
    const number = String(index + 1).padStart(2, "0");
    const title = escapeHtml(item.title);
    const category = escapeHtml(categoryLabels[item.category] || item.category);
    const link = safeLink(item.link);
    const linkLabel = link.startsWith("mailto:") ? "작업 문의하기" : "작업 보러가기";
    const isLogo = ["logo design", "로고디자인"].includes(item.category);
    return `<article class="project${isLogo ? " is-logo" : ""}">
      <div class="project-number"><span>(${number})</span><span>${escapeHtml(item.year)}</span></div>
      <div class="card-stage"><div class="card-inner">
        <div class="card-face card-front">
          <button class="card-open" type="button" aria-expanded="false" aria-controls="card-back-${index}" aria-label="${title} 자세히 보기">
            <img src="${escapeHtml(item.image)}" alt="${title} 작업 이미지" loading="lazy" decoding="async">
            <span class="card-action" aria-hidden="true">+</span>
          </button>
        </div>
        <div class="card-face card-back" id="card-back-${index}" inert>
          <div class="card-back-top"><span>${number} / ${category}</span><button class="card-close" type="button" aria-label="${title} 카드 닫기">×</button></div>
          <div class="card-copy"><h4>${title}</h4><p>${escapeHtml(item.description)}</p></div>
          <button class="card-preview" type="button" aria-label="${title} 전체화면 감상">크게 감상하기 <span>⤢</span></button>
          <a class="project-link" href="${escapeHtml(link)}" ${link.startsWith("http") ? 'target="_blank" rel="noopener noreferrer"' : ""}>${linkLabel}<span aria-hidden="true">↗</span></a>
        </div>
      </div></div>
      <div class="project-caption"><h3>${title}</h3><span>${category}</span><button class="project-expand" type="button" aria-label="${title} 전체화면으로 보기">⤢</button></div>
    </article>`;
  }).join("");
  const cards = [...portfolioList.querySelectorAll(".project")];
  function setCardOpen(card, open) {
    const front = card.querySelector(".card-open");
    const back = card.querySelector(".card-back");
    card.classList.toggle("is-flipped", open);
    front.setAttribute("aria-expanded", String(open));
    front.inert = open;
    back.inert = !open;
  }
  cards.forEach((card, index) => {
    revealObserver?.observe(card);
    const front = card.querySelector(".card-open");
    const close = card.querySelector(".card-close");
    let focusTimer;
    front.addEventListener("click", () => {
      cards.forEach(other => setCardOpen(other, other === card));
      clearTimeout(focusTimer);
      focusTimer = setTimeout(() => {
        if (card.classList.contains("is-flipped")) close.focus({ preventScroll: true });
      }, reduceMotion.matches ? 0 : 400);
    });
    close.addEventListener("click", () => {
      setCardOpen(card, false);
      clearTimeout(focusTimer);
      front.focus({ preventScroll: true });
    });
    card.querySelectorAll(".project-expand, .card-preview").forEach(button => {
      button.addEventListener("click", () => openViewer(index, button));
    });
    initCardLight(card);
  });
}
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !viewer.open) portfolioList.querySelector(".is-flipped .card-close")?.click();
});
async function loadPortfolio() {
  try {
    const response = await fetch("data/portfolio.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Portfolio unavailable");
    const payload = await response.json();
    const items = Array.isArray(payload) ? payload : payload.items;
    if (!Array.isArray(items)) throw new Error("Invalid portfolio data");
    renderPortfolio(items);
  } catch {
    portfolioList.innerHTML = '<p class="empty-state">작업을 불러오지 못했습니다. 잠시 후 다시 확인해주세요.</p>';
  }
}
const model = document.querySelector(".aram-model");
const motionToggle = document.querySelector(".motion-toggle");
let paused = reduceMotion.matches;
let modelDistance = 0;
let sceneProgress = 0;
function updateMotion() {
  model.toggleAttribute("auto-rotate", !paused && sceneProgress < .015 && !viewer.open);
  motionToggle.setAttribute("aria-pressed", String(paused));
  motionToggle.setAttribute("aria-label", paused ? "자동 회전 재생" : "자동 회전 일시정지");
  motionToggle.textContent = paused ? "PLAY ▷" : "PAUSE Ⅱ";
}
motionToggle.addEventListener("click", () => { paused = !paused; updateMotion(); });
reduceMotion.addEventListener("change", () => {
  paused = reduceMotion.matches;
  updateMotion();
  if (reduceMotion.matches) {
    revealObserver?.disconnect();
    document.documentElement.classList.remove("js-motion");
  }
  updateScroll();
});
function sizeModel() {
  if (!model.loaded || typeof model.getDimensions !== "function") return;
  const dimensions = model.getDimensions();
  const bounds = model.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  // Fit a padded bounding sphere so every rotation stays inside the canvas.
  const radius = Math.hypot(dimensions.x, dimensions.y, dimensions.z) / 2;
  const limitingAngle = Math.atan(Math.tan(Math.PI / 12) * Math.min(1, bounds.width / bounds.height));
  modelDistance = radius / Math.sin(limitingAngle) * 1.12;
  model.setAttribute("camera-orbit", `-15deg 82deg ${modelDistance.toFixed(3)}m`);
  frameModel();
  model.dataset.framed = "true";
}
model.addEventListener("load", sizeModel);
customElements.whenDefined("model-viewer").then(sizeModel);
new ResizeObserver(sizeModel).observe(model);
const hero = document.querySelector(".hero");
const heroFrame = document.querySelector(".hero-frame");
const works = document.querySelector(".works-section");
const about = document.querySelector(".about-section");
const progress = document.querySelector(".reading-progress");
const clamp = value => Math.max(0, Math.min(1, value));
const ease = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
let scrollFrame;
function frameModel() {
  if (!modelDistance || paused || reduceMotion.matches) return;
  model.setAttribute("camera-orbit", `${(-15 + sceneProgress * 195).toFixed(2)}deg ${(82 - Math.sin(sceneProgress * Math.PI) * 13).toFixed(2)}deg ${modelDistance.toFixed(3)}m`);
}
function updateScroll() {
  scrollFrame = 0;
  const travel = document.documentElement.scrollHeight - innerHeight;
  progress.style.setProperty("--progress", String(travel > 0 ? Math.min(1, scrollY / travel) : 0));
  const motion = !reduceMotion.matches;
  document.body.classList.toggle("scene-ready", motion);
  sceneProgress = motion ? clamp(scrollY / Math.max(1, hero.offsetHeight - heroFrame.offsetHeight)) : 0;
  hero.style.setProperty("--scene", sceneProgress.toFixed(4));
  hero.style.setProperty("--title-exit", ease(sceneProgress / .8).toFixed(4));
  works.style.setProperty("--entry-radius", `${motion ? clamp(works.getBoundingClientRect().top / innerHeight) * 60 : 0}px`);
  const dark = motion ? ease((innerHeight * 1.45 - about.getBoundingClientRect().top) / (innerHeight * 1.2)) : 0;
  const rgb = [237, 243, 245].map((value, index) => Math.round(value + ([11, 27, 37][index] - value) * dark));
  document.body.style.setProperty("--scene-bg", `rgb(${rgb.join(' ')})`);
  document.body.style.setProperty("--scene-ink", dark > .53 ? "#edf5f9" : "#12242d");
  document.body.style.setProperty("--scene-muted", dark > .53 ? "#b1c9d7" : "#526973");
  about.style.setProperty("--portrait-drift", `${motion ? (1 - dark) * 65 : 0}px`);
  frameModel();
  updateMotion();
}
window.addEventListener("scroll", () => {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
}, { passive: true });
window.addEventListener("resize", updateScroll);
document.querySelector(".discord-copy").addEventListener("click", async () => {
  const status = document.querySelector(".copy-status");
  try {
    await navigator.clipboard.writeText("aramanim");
    status.textContent = "디스코드 아이디 aramanim을 복사했습니다.";
  } catch {
    status.textContent = "디스코드 아이디: aramanim — 선택해서 복사해주세요.";
  }
});

function initCardLight(card) {
  const stage = card.querySelector('.card-stage');
  const front = card.querySelector('.card-open');
  let pointerFrame;
  card.addEventListener('pointermove', event => {
    if (reduceMotion.matches || event.pointerType !== 'mouse' || card.classList.contains('is-flipped')) return;
    if (pointerFrame) cancelAnimationFrame(pointerFrame);
    const { clientX, clientY } = event;
    pointerFrame = requestAnimationFrame(() => {
      const bounds = stage.getBoundingClientRect();
      const x = clamp((clientX - bounds.left) / bounds.width);
      const y = clamp((clientY - bounds.top) / bounds.height);
      stage.style.setProperty('--tilt-x', `${(y - .5) * -5}deg`);
      stage.style.setProperty('--tilt-y', `${(x - .5) * 6}deg`);
      front.style.setProperty('--light-x', `${x * 100}%`);
      front.style.setProperty('--light-y', `${y * 100}%`);
      card.classList.add('is-hovered');
    });
  });
  card.addEventListener('pointerleave', () => {
    cancelAnimationFrame(pointerFrame);
    stage.style.setProperty('--tilt-x', '0deg');
    stage.style.setProperty('--tilt-y', '0deg');
    card.classList.remove('is-hovered');
  });
}

const viewer = document.querySelector('.project-viewer');
const viewerImage = viewer.querySelector('.viewer-image');
let activeProject = 0;
let opener = null;
let sharedImage = null;
let viewerTransition;
let viewerClosing = false;
let viewerOpening = false;
function fillViewer(index) {
  activeProject = (index + portfolioItems.length) % portfolioItems.length;
  const item = portfolioItems[activeProject];
  viewerImage.src = item.image;
  viewerImage.alt = `${item.title} 작업 전체 이미지`;
  viewer.querySelector('#viewer-title').textContent = item.title;
  viewer.querySelector('.viewer-description').textContent = item.description;
  viewer.querySelector('.viewer-index').textContent = `${String(activeProject + 1).padStart(2, '0')} / ${String(portfolioItems.length).padStart(2, '0')}`;
  viewer.querySelector('.viewer-category').textContent = categoryLabels[item.category] || item.category;
  const link = viewer.querySelector('.viewer-link');
  link.href = safeLink(item.link);
  link.textContent = link.href.startsWith('mailto:') ? '작업 문의하기 ↗' : '작업 보러가기 ↗';
  if (link.href.startsWith('http')) { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
  else { link.removeAttribute('target'); link.removeAttribute('rel'); }
}
function transitionViewer(change, source) {
  viewerTransition?.skipTransition();
  viewerTransition = null;
  const clearNames = () => {
    portfolioList.querySelectorAll('.card-open img').forEach(image => { image.style.viewTransitionName = ''; });
    viewerImage.style.viewTransitionName = '';
  };
  clearNames();
  if (reduceMotion.matches || !document.startViewTransition || !source) { change(); clearNames(); return; }
  source.style.viewTransitionName = 'project-art';
  const transition = document.startViewTransition(change);
  viewerTransition = transition;
  transition.finished.catch(() => {}).finally(() => {
    if (viewerTransition === transition) { clearNames(); viewerTransition = null; }
  });
}
function openViewer(index, button) {
  if (viewer.open || viewerClosing || viewerOpening) return;
  viewerOpening = true;
  activeProject = index;
  opener = button;
  const card = button.closest('.project');
  sharedImage = card.classList.contains('is-flipped') ? null : card.querySelector('.card-open img');
  fillViewer(index);
  transitionViewer(() => {
    if (sharedImage) sharedImage.style.viewTransitionName = '';
    viewerImage.style.viewTransitionName = sharedImage ? 'project-art' : '';
    document.documentElement.classList.add('viewer-open');
    viewer.showModal();
    viewerOpening = false;
    viewer.querySelector('.viewer-close').focus({ preventScroll: true });
    updateMotion();
  }, sharedImage);
}
function closeViewer() {
  if (!viewer.open || viewerClosing) return;
  viewerClosing = true;
  const destination = sharedImage;
  transitionViewer(() => {
    viewerImage.style.viewTransitionName = '';
    if (destination) destination.style.viewTransitionName = 'project-art';
    viewer.close();
    document.documentElement.classList.remove('viewer-open');
    opener?.focus({ preventScroll: true });
    updateMotion();
    viewerClosing = false;
  }, destination ? viewerImage : null);
}
function nextProject(direction) {
  if (viewerClosing) return;
  viewerTransition?.skipTransition();
  if (sharedImage) sharedImage.style.viewTransitionName = '';
  sharedImage = null;
  fillViewer(activeProject + direction);
  if (!reduceMotion.matches) {
    viewer.querySelector('.viewer-art').animate([
      { opacity: 0, transform: `translateX(${direction * 45}px) scale(.96)` },
      { opacity: 1, transform: 'translateX(0) scale(1)' }
    ], { duration: 550, easing: 'cubic-bezier(.22,1,.36,1)' });
  }
}
viewer.querySelector('.viewer-close').addEventListener('click', closeViewer);
viewer.querySelector('.viewer-prev').addEventListener('click', () => nextProject(-1));
viewer.querySelector('.viewer-next').addEventListener('click', () => nextProject(1));
viewer.addEventListener('cancel', event => { event.preventDefault(); closeViewer(); });
viewer.addEventListener('keydown', event => {
  if (event.key === 'ArrowRight') { event.preventDefault(); nextProject(1); }
  if (event.key === 'ArrowLeft') { event.preventDefault(); nextProject(-1); }
});
let touchStart;
viewer.querySelector('.viewer-art').addEventListener('touchstart', event => {
  touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
}, { passive: true });
viewer.querySelector('.viewer-art').addEventListener('touchend', event => {
  if (!touchStart) return;
  const dx = event.changedTouches[0].clientX - touchStart.x;
  const dy = event.changedTouches[0].clientY - touchStart.y;
  if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.5) nextProject(dx < 0 ? 1 : -1);
  touchStart = null;
}, { passive: true });
heroFrame.addEventListener('pointermove', event => {
  if (reduceMotion.matches || event.pointerType !== 'mouse') return;
  const bounds = heroFrame.getBoundingClientRect();
  heroFrame.style.setProperty('--spot-x', `${(event.clientX - bounds.left) / bounds.width * 100}%`);
  heroFrame.style.setProperty('--spot-y', `${(event.clientY - bounds.top) / bounds.height * 100}%`);
});
updateMotion();
updateScroll();
loadPortfolio();
