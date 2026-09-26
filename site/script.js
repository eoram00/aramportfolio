const portfolioList = document.getElementById("portfolio-list");

const categoryLabels = {
  rblx_thumbnail: "GAME THUMBNAIL",
  animation: "ANIMATION",
  "애니메이션": "ANIMATION",
  "logo design": "IDENTITY DESIGN",
  "로고디자인": "IDENTITY DESIGN",
  Rovelyz: "CONTENT THUMBNAIL"
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function safeLink(value) {
  try {
    const url = new URL(String(value), window.location.href);
    return ["https:", "http:", "mailto:"].includes(url.protocol) ? escapeHtml(url.href) : "#contact";
  } catch {
    return "#contact";
  }
}

function renderPortfolio(items) {
  if (!items.length) {
    portfolioList.innerHTML = '<p class="empty-state">곧 새로운 작업을 소개할게요.</p>';
    return;
  }

  portfolioList.innerHTML = items.map((item, index) => {
    const number = String(index + 1).padStart(2, "0");
    const title = escapeHtml(item.title);
    const category = escapeHtml(categoryLabels[item.category] || item.category);
    const description = escapeHtml(item.description);
    const image = escapeHtml(item.image);
    const year = escapeHtml(item.year);
    const link = safeLink(item.link);
    const linkLabel = link.startsWith("mailto:") ? "작업 문의하기" : link === "#contact" ? "문의하기" : "작업 보러가기";
    return `
      <article class="portfolio-card tone-${(index % 5) + 1} card-enter">
        <div class="card-inner">
          <div class="card-face card-front">
            <button class="card-open" type="button" aria-expanded="false" aria-controls="card-back-${index}" aria-label="${title} 자세히 보기">
              <img src="${image}" alt="${title} 작업 이미지" loading="lazy">
              <span class="card-image-shade"></span>
              <span class="card-front-top"><span>${number} / ${category}</span><span class="card-plus">↗</span></span>
              <span class="card-front-bottom"><strong>${title}</strong><span>클릭해서 펼치기 ↗</span></span>
            </button>
          </div>
          <div class="card-face card-back" id="card-back-${index}" inert>
            <div class="card-back-top"><span>${number} / ${category}</span><button class="card-close" type="button" aria-label="${title} 카드 닫기">↶</button></div>
            <div class="card-back-content"><span class="card-year">SELECTED WORK / ${year}</span><h3>${title}</h3><p>${description}</p></div>
            <a class="card-project-link" href="${link}" ${link.startsWith("http") ? 'target="_blank" rel="noopener noreferrer"' : ""}>${linkLabel} <span>↗</span></a>
          </div>
        </div>
      </article>`;
  }).join("");

  const cards = [...portfolioList.querySelectorAll(".portfolio-card")];
  if (document.documentElement.classList.contains("js-motion") && "IntersectionObserver" in window) {
    const cardObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        cardObserver.unobserve(entry.target);
      });
    }, { threshold: .08 });
    cards.forEach((card) => cardObserver.observe(card));
  }
  function setCardOpen(card, open) {
    const front = card.querySelector(".card-open");
    const back = card.querySelector(".card-back");
    card.classList.toggle("is-flipped", open);
    front.setAttribute("aria-expanded", String(open));
    front.inert = open;
    back.inert = !open;
  }

  cards.forEach((card) => {
    const front = card.querySelector(".card-open");
    const close = card.querySelector(".card-close");
    front.addEventListener("click", () => {
      cards.forEach((other) => setCardOpen(other, other === card));
      window.setTimeout(() => close.focus({ preventScroll: true }), 380);
    });
    close.addEventListener("click", () => {
      setCardOpen(card, false);
      window.setTimeout(() => front.focus({ preventScroll: true }), 380);
    });
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const openCard = portfolioList.querySelector(".portfolio-card.is-flipped");
  if (openCard) openCard.querySelector(".card-close").click();
});

async function loadPortfolio() {
  try {
    const response = await fetch("data/portfolio.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Portfolio could not be loaded");
    const payload = await response.json();
    renderPortfolio(Array.isArray(payload) ? payload : payload.items || []);
  } catch {
    portfolioList.innerHTML = '<p class="empty-state">작업을 불러오지 못했습니다. 잠시 후 다시 확인해주세요.</p>';
  }
}

function initInteractions() {
  const hero = document.querySelector(".hero-layout");
  const stage = document.querySelector(".playground-stage");
  const scene = document.querySelector(".aram-scene");
  const model = document.querySelector(".aram-model");
  const objectStage = document.querySelector(".object-stage");
  const floatingObject = document.querySelector(".floating-object");
  const progress = document.querySelector(".scroll-progress");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduceMotion.matches) model.removeAttribute("auto-rotate");
  function sizeModel() {
    if (!model.loaded || typeof model.getDimensions !== "function") return;
    const dimensions = model.getDimensions();
    const bounds = model.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    // A padded bounding sphere fits the entire object at every orbit angle.
    const radius = Math.hypot(dimensions.x, dimensions.y, dimensions.z) / 2;
    const verticalHalfAngle = Math.PI / 12;
    const limitingAngle = Math.atan(Math.tan(verticalHalfAngle) * Math.min(1, bounds.width / bounds.height));
    const distance = radius / Math.sin(limitingAngle) * 1.12;
    model.setAttribute("camera-orbit", `-15deg 82deg ${distance.toFixed(3)}m`);
    model.dataset.framed = "true";
  }
  model.addEventListener("load", sizeModel);
  customElements.whenDefined("model-viewer").then(sizeModel);
  new ResizeObserver(sizeModel).observe(model);

  let scrollFrame = 0;
  function updateScrollProgress() {
    scrollFrame = 0;
    const travel = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.setProperty("--scroll-progress", `${travel > 0 ? (window.scrollY / travel) * 100 : 0}%`);
    if (reduceMotion.matches) return;
    const opening = Math.min(1, window.scrollY / window.innerHeight);
    hero.style.setProperty("--hero-drift", `${opening * 75}px`);
    document.body.style.setProperty("--atmosphere-y", `${Math.sin(window.scrollY / 1500) * 65}px`);
    const stageBounds = stage.getBoundingClientRect();
    stage.style.setProperty("--light-scale", String(1 + Math.min(.35, Math.max(0, -stageBounds.top / stageBounds.height) * .35)));
  }
  updateScrollProgress();
  window.addEventListener("scroll", () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScrollProgress);
  }, { passive: true });
  window.addEventListener("resize", updateScrollProgress);

  hero.addEventListener("pointermove", (event) => {
    if (reduceMotion.matches || event.pointerType !== "mouse") return;
    const bounds = hero.getBoundingClientRect();
    hero.style.setProperty("--hero-x", `${event.clientX - bounds.left}px`);
    hero.style.setProperty("--hero-y", `${event.clientY - bounds.top}px`);
  });

  stage.addEventListener("pointermove", (event) => {
    if (reduceMotion.matches || event.pointerType !== "mouse") return;
    const bounds = stage.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - .5;
    const y = (event.clientY - bounds.top) / bounds.height - .5;
    stage.style.setProperty("--grid-x", `${x * 14}px`);
    stage.style.setProperty("--grid-y", `${y * 14}px`);
    scene.style.setProperty("--move-x", `${x * 16}px`);
    scene.style.setProperty("--move-y", `${y * 12}px`);
  });
  stage.addEventListener("pointerleave", () => {
    ["--grid-x", "--grid-y"].forEach((name) => stage.style.removeProperty(name));
    ["--move-x", "--move-y"].forEach((name) => scene.style.removeProperty(name));
  });

  objectStage.addEventListener("pointermove", (event) => {
    if (reduceMotion.matches || event.pointerType !== "mouse") return;
    const bounds = objectStage.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - .5;
    const y = (event.clientY - bounds.top) / bounds.height - .5;
    floatingObject.style.setProperty("--object-x", `${x * 20}px`);
    floatingObject.style.setProperty("--object-y", `${y * 14}px`);
  });
  objectStage.addEventListener("pointerleave", () => {
    floatingObject.style.removeProperty("--object-x");
    floatingObject.style.removeProperty("--object-y");
  });

  stage.querySelectorAll(".tone-swatch").forEach((button) => {
    button.addEventListener("click", () => {
      stage.dataset.tone = button.dataset.tone;
      stage.querySelectorAll(".tone-swatch").forEach((swatch) => {
        const active = swatch === button;
        swatch.classList.toggle("is-active", active);
        swatch.setAttribute("aria-pressed", String(active));
      });
    });
  });

  reduceMotion.addEventListener("change", () => {
    model.toggleAttribute("auto-rotate", !reduceMotion.matches);
  });

  if ("IntersectionObserver" in window && !reduceMotion.matches) {
    document.documentElement.classList.add("js-motion");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: .12 });
    document.querySelectorAll(".reveal-on-scroll").forEach((item) => observer.observe(item));
  }
}

initInteractions();
loadPortfolio();
