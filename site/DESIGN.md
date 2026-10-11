# ARAM STUDIO — layout rules

- Identity: sky blue, chrome, large typography and direct project information.
- Grid: 12 columns. All main content aligns to the same outer edge: clamp(22px, 5vw, 88px).
- Project rhythm: 12 / 6+5 / 8+3 columns; deliberate empty columns and vertical offsets. Below 700px, use one column.
- Hierarchy: project artwork first, title second, category and year third. No invented client credits or promotional claims.
- Color: sky #b8dcef, paper #edf3f5, ink #12242d, closing background #0b1b25. Grain stays subtle over readable text.
- Type: DM Sans for Latin; Noto Sans KR for Korean. Titles use tight tracking; metadata uses small, widely spaced type.
- Motion: the opening follows scroll only within its own container. Chrome uses a real GLB with safe camera framing. Cards flip on click; section content appears once. Respect reduced motion and provide a rotation pause control.
- Contact: aramaram0217@gmail.com / Discord aramanim.

## Scene transitions and interaction
- The sky opening is a bounded sticky scene. Scroll progress moves the title out and rotates the real 3D lettering toward the centre. Native page scrolling stays intact.
- The gallery overlaps the opening with a soft edge that flattens on entry. A shared background gradually changes from paper to deep blue before About, continuing through Contact.
- Fine pointers gently tilt cards and move their highlight. Flip cards retain their detail view; the expand control opens an image viewer with next/previous navigation, arrow keys, mobile swipe and Escape to return.
- Fullscreen uses shared image transitions when available. Reduced motion disables the scroll choreography, card tilt and shared transitions.
- Header identity uses the original transparent vector from SVG/자산 1.svg, published as assets/aram-wordmark.svg. No bitmap background or blend workaround.
