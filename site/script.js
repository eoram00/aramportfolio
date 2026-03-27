const portfolioList = document.getElementById("portfolio-list");

function renderPortfolio(items) {
  if (!items.length) {
    portfolioList.innerHTML = `
      <div class="empty-state">
        아직 등록된 포트폴리오가 없습니다.
      </div>
    `;
    return;
  }

  portfolioList.innerHTML = items
    .map(
      (item) => `
        <article class="portfolio-card">
          <img src="${item.image}" alt="${item.title}">
          <div class="portfolio-body">
            <div class="portfolio-meta">
              <span>${item.category}</span>
              <span>${item.year}</span>
            </div>
            <h3>${item.title}</h3>
            <p>${item.description}</p>
            <div class="portfolio-actions">
              <a class="primary-button" href="${item.link}" target="_blank" rel="noreferrer">프로젝트 보기</a>
            </div>
          </div>
        </article>
      `
    )
    .join("");

  bindRevealAnimations();
}

function bindRevealAnimations() {
  const revealSections = document.querySelectorAll(".scroll-reveal");
  const revealCards = document.querySelectorAll(".portfolio-card");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("in-view");
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.18,
      rootMargin: "0px 0px -8% 0px"
    }
  );

  revealSections.forEach((section) => observer.observe(section));
  revealCards.forEach((card) => observer.observe(card));
}

async function loadPortfolio() {
  try {
    const response = await fetch("data/portfolio.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("portfolio load failed");
    }

    const payload = await response.json();
    const items = Array.isArray(payload) ? payload : payload.items;
    renderPortfolio(Array.isArray(items) ? items : []);
  } catch (error) {
    renderPortfolio([]);
  }
}

loadPortfolio();
