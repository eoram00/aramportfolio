const portfolioList = document.getElementById("portfolio-list");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
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
          <a class="project-link" href="${escapeHtml(link)}" ${link.startsWith("http") ? 'target="_blank" rel="noopener noreferrer"' : ""}>${linkLabel}<span aria-hidden="true">↗</span></a>
        </div>
      </div></div>
      <div class="project-caption"><h3>${title}</h3><span>${category}</span></div>
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
  cards.forEach(card => {
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
  });
}
document.addEventListener("keydown", event => {
  if (event.key === "Escape") portfolioList.querySelector(".is-flipped .card-close")?.click();
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
function updateMotion() {
  model.toggleAttribute("auto-rotate", !paused);
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
});
updateMotion();
function sizeModel() {
  if (!model.loaded || typeof model.getDimensions !== "function") return;
  const dimensions = model.getDimensions();
  const bounds = model.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  // Fit a padded bounding sphere so every rotation stays inside the canvas.
  const radius = Math.hypot(dimensions.x, dimensions.y, dimensions.z) / 2;
  const limitingAngle = Math.atan(Math.tan(Math.PI / 12) * Math.min(1, bounds.width / bounds.height));
  const distance = radius / Math.sin(limitingAngle) * 1.12;
  model.setAttribute("camera-orbit", `-15deg 82deg ${distance.toFixed(3)}m`);
  model.dataset.framed = "true";
}
model.addEventListener("load", sizeModel);
customElements.whenDefined("model-viewer").then(sizeModel);
new ResizeObserver(sizeModel).observe(model);
const hero = document.querySelector(".hero");
const progress = document.querySelector(".reading-progress");
let scrollFrame;
function updateScroll() {
  scrollFrame = 0;
  const travel = document.documentElement.scrollHeight - innerHeight;
  progress.style.setProperty("--progress", String(travel > 0 ? Math.min(1, scrollY / travel) : 0));
  hero.style.setProperty("--title-drift", reduceMotion.matches ? "0px" : `${Math.min(scrollY, hero.offsetHeight) * .12}px`);
}
window.addEventListener("scroll", () => {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
}, { passive: true });
window.addEventListener("resize", updateScroll);
updateScroll();
document.querySelector(".discord-copy").addEventListener("click", async () => {
  const status = document.querySelector(".copy-status");
  try {
    await navigator.clipboard.writeText("aramanim");
    status.textContent = "디스코드 아이디 aramanim을 복사했습니다.";
  } catch {
    status.textContent = "디스코드 아이디: aramanim — 선택해서 복사해주세요.";
  }
});
loadPortfolio();
