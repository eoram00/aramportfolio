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
      <article class="portfolio-card tone-${(index % 5) + 1}">
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

loadPortfolio();
