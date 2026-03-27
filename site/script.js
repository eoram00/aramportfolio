const portfolioList = document.getElementById("portfolio-list");

const fallbackItems = [
  {
    title: "Brand Launch Motion",
    category: "Motion Graphics / Branding",
    description: "브랜드 톤앤매너를 강조하는 런칭 필름. 타이포그래피와 제품 무드를 중심으로 구성했습니다.",
    image: "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80",
    link: "https://www.behance.net/",
    year: "2026"
  },
  {
    title: "Typography Reel",
    category: "Kinetic Type",
    description: "짧은 카피를 리듬감 있게 전개한 타이포 모션 작업입니다. 박자와 시선 이동에 집중했습니다.",
    image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
    link: "https://www.instagram.com/",
    year: "2025"
  },
  {
    title: "3D Visual Loop",
    category: "3D / Loop Animation",
    description: "짧지만 강한 인상을 남기는 반복형 비주얼 루프. 전시, 소셜 미디어, 오프닝 영상용으로 활용 가능합니다.",
    image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
    link: "https://vimeo.com/",
    year: "2024"
  }
];

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
    renderPortfolio(Array.isArray(items) ? items : fallbackItems);
  } catch (error) {
    renderPortfolio(fallbackItems);
  }
}

loadPortfolio();
