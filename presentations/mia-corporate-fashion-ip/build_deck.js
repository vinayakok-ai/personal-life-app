const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const Icons = require("react-icons/fi");

// Palette: plum dominant, rose-gold accent, soft blush tint, white content
const C = { plum: "3B1F3A", rose: "B76E79", blush: "F7ECEF", ink: "2A2A2E", muted: "6E6873", white: "FFFFFF", gold: "D4A373", line: "E6DDE0" };
const FONT_H = "Cambria", FONT_B = "Calibri";

async function icon(name, color, size = 256) {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(Icons[name], { color: "#" + color, size }));
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

(async () => {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9"; // 10 x 5.625
  pres.author = "Marketing IP proposal";
  pres.title = "Mia at Work — Face of Fashion in Corporate";

  const W = 10, H = 5.625, M = 0.5;

  function wrapSlide(s) { const orig = s.addText.bind(s); s.addText = (t, o = {}) => orig(t, Object.assign({ valign: "top" }, o)); return s; }
  function darkSlide() { const s = wrapSlide(pres.addSlide()); s.background = { color: C.plum }; return s; }
  function lightSlide(title, kicker) {
    const s = wrapSlide(pres.addSlide()); s.background = { color: C.white };
    if (kicker) s.addText(kicker.toUpperCase(), { x: M, y: 0.32, w: 6, h: 0.25, fontFace: FONT_B, fontSize: 10, color: C.rose, bold: true, charSpacing: 2, margin: 0, isTextBox: true });
    s.addText(title, { x: M, y: 0.55, w: 9, h: 0.6, fontFace: FONT_H, fontSize: 28, color: C.plum, bold: true, valign: "top", margin: 0, isTextBox: true });
    s.addText("Mia at Work  ·  Proposal for Mia by Tanishq", { x: M, y: H - 0.4, w: 6, h: 0.25, fontFace: FONT_B, fontSize: 9, color: C.muted, margin: 0, isTextBox: true });
    return s;
  }
  function pageNo(s, n) { s.addText(String(n), { x: W - M - 0.5, y: H - 0.4, w: 0.5, h: 0.25, fontFace: FONT_B, fontSize: 9, color: C.muted, align: "right", margin: 0, isTextBox: true }); }
  async function iconCircle(s, name, x, y, d = 0.5, bg = C.blush, fg = C.plum) {
    s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: bg }, line: { color: bg } });
    s.addImage({ data: await icon(name, fg), x: x + d * 0.25, y: y + d * 0.25, w: d * 0.5, h: d * 0.5 });
  }
  function card(s, x, y, w, h, fill = C.blush) {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { color: fill }, rectRadius: 0.08 });
  }
  function bullets(s, items, x, y, w, h, opts = {}) {
    s.addText(items.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < items.length - 1, paraSpaceAfter: 5 } })),
      { x, y, w, h, fontFace: FONT_B, fontSize: opts.fontSize || 12, color: opts.color || C.ink, valign: "top", margin: 0, isTextBox: true });
  }

  // 1. Title
  {
    const s = darkSlide();
    s.addShape(pres.shapes.OVAL, { x: 6.4, y: -1.2, w: 5, h: 5, fill: { color: C.rose, transparency: 80 }, line: { color: C.rose, transparency: 80 } });
    s.addText("A MARKETING IP PROPOSAL FOR MIA BY TANISHQ", { x: M, y: 1.2, w: 8, h: 0.3, fontFace: FONT_B, fontSize: 11, color: C.gold, bold: true, charSpacing: 3, margin: 0, isTextBox: true });
    s.addText("Mia at Work", { x: M, y: 1.6, w: 8, h: 1.0, fontFace: FONT_H, fontSize: 54, color: C.white, bold: true, margin: 0, isTextBox: true });
    s.addText("The Face of Fashion in Corporate", { x: M, y: 2.6, w: 8, h: 0.6, fontFace: FONT_H, fontSize: 26, color: C.white, italic: true, margin: 0, isTextBox: true });
    s.addText("An on-ground fashion IP across Bengaluru's IT parks, celebrating the corporate woman and her everyday style.", { x: M, y: 3.4, w: 6.5, h: 0.7, fontFace: FONT_B, fontSize: 14, color: "E8DDE3", margin: 0, isTextBox: true });
    s.addText("Bengaluru  ·  8-week season  ·  4 park rounds + 1 finale", { x: M, y: 4.6, w: 8, h: 0.3, fontFace: FONT_B, fontSize: 12, color: C.gold, margin: 0, isTextBox: true });
    s.addNotes("Open with the idea in one line: Mia becomes the brand that celebrates how corporate women in Bengaluru express themselves at work. Then the ask: title sponsorship of a 4-park, 8-week season.");
  }

  // 2. Opportunity
  {
    const s = lightSlide("An under-served audience at work", "The opportunity"); pageNo(s, 2);
    const stats = [
      ["1.5M+", "tech workers in Bengaluru IT parks and corridors", "FiUsers"],
      ["1 in 3", "share of women in the workforce across large IT campuses", "FiPieChart"],
      ["5 days", "a week she dresses for work, where jewellery is chosen fast and worn long", "FiCalendar"],
      ["Zero", "existing on-ground fashion property speaks to her at her workplace", "FiTarget"],
    ];
    for (let i = 0; i < 4; i++) {
      const x = M + i * 2.3, y = 1.5;
      card(s, x, y, 2.1, 2.7);
      await iconCircle(s, stats[i][2], x + 0.2, y + 0.2, 0.5, C.white, C.rose);
      s.addText(stats[i][0], { x: x + 0.2, y: y + 0.85, w: 1.8, h: 0.7, fontFace: FONT_H, fontSize: 32, bold: true, color: C.plum, margin: 0, isTextBox: true });
      s.addText(stats[i][1], { x: x + 0.2, y: y + 1.6, w: 1.75, h: 1.0, fontFace: FONT_B, fontSize: 11, color: C.ink, valign: "top", margin: 0, isTextBox: true });
    }
    s.addText("Workforce figures are indicative and will be validated with park management during venue scouting.", { x: M, y: 4.45, w: 9, h: 0.3, fontFace: FONT_B, fontSize: 9, italic: true, color: C.muted, margin: 0, isTextBox: true });
    s.addNotes("Frame the white space: campuses run health camps, food fests and sports days, but nobody has built a fashion property for the women who work there.");
  }

  // 3. Why Mia
  {
    const s = lightSlide("Why this IP belongs to Mia", "Brand fit"); pageNo(s, 3);
    const rows = [
      ["FiBriefcase", "Workwear is Mia's home turf", "Mia is already positioned as everyday, wearable, modern jewellery. This IP puts that promise on the woman it was designed for, at the place she wears it most."],
      ["FiHeart", "Owned emotion, not borrowed", "Instead of renting a celebrity moment, Mia owns a recurring story: 'the face of fashion in corporate' is a title only Mia gives."],
      ["FiCamera", "A content engine", "Every round produces styled looks, transformation reels and influencer judging moments, all wearing Mia."],
      ["FiMapPin", "Right next to the store", "Bengaluru IT parks sit within minutes of Mia and Tanishq stores in Whitefield, Marathahalli, Hebbal and Koramangala."],
    ];
    for (let i = 0; i < 4; i++) {
      const y = 1.45 + i * 0.85;
      await iconCircle(s, rows[i][0], M, y, 0.55);
      s.addText(rows[i][1], { x: M + 0.8, y: y - 0.02, w: 8, h: 0.3, fontFace: FONT_B, fontSize: 14, bold: true, color: C.plum, margin: 0, isTextBox: true });
      s.addText(rows[i][2], { x: M + 0.8, y: y + 0.27, w: 8.2, h: 0.5, fontFace: FONT_B, fontSize: 11.5, color: C.ink, valign: "top", margin: 0, isTextBox: true });
    }
  }

  // 4. Concept
  {
    const s = darkSlide(); pageNo(s, 4);
    s.addText("THE IDEA", { x: M, y: 0.6, w: 4, h: 0.3, fontFace: FONT_B, fontSize: 10, color: C.gold, bold: true, charSpacing: 2, margin: 0, isTextBox: true });
    s.addText("Find the Face of Fashion in Corporate. Crown her in Mia.", { x: M, y: 0.95, w: 5.6, h: 1.5, fontFace: FONT_H, fontSize: 30, bold: true, color: C.white, margin: 0, isTextBox: true });
    s.addText("A city-wide search inside IT parks. Working women register, get shortlisted by fashion influencers in a lunchtime round at their own campus, are styled and mentored, and walk a professional ramp at the season finale alongside pro models. The winner becomes the Face of Mia at Work for the season.", { x: M, y: 2.55, w: 5.6, h: 1.6, fontFace: FONT_B, fontSize: 13, color: "E8DDE3", valign: "top", margin: 0, isTextBox: true });
    const pills = [["FiSearch", "Search", "Open registration across 4 parks"], ["FiStar", "Shortlist", "Influencer judges pick 5 per park"], ["FiScissors", "Style", "Mentoring, Mia styling, look creation"], ["FiAward", "Crown", "Finale ramp, winner announced"]];
    for (let i = 0; i < 4; i++) {
      const y = 0.9 + i * 1.0;
      card(s, 6.5, y, 3.0, 0.85, "4E2E4D");
      await iconCircle(s, pills[i][0], 6.65, y + 0.17, 0.5, C.rose, C.white);
      s.addText(pills[i][1], { x: 7.3, y: y + 0.12, w: 2.1, h: 0.3, fontFace: FONT_B, fontSize: 14, bold: true, color: C.white, margin: 0, isTextBox: true });
      s.addText(pills[i][2], { x: 7.3, y: y + 0.42, w: 2.1, h: 0.35, fontFace: FONT_B, fontSize: 10.5, color: "E8DDE3", margin: 0, isTextBox: true });
    }
  }

  // 5. Format at a glance
  {
    const s = lightSlide("Four park rounds feed one finale", "Format at a glance"); pageNo(s, 5);
    const parks = ["Manyata Tech Park", "Embassy TechVillage", "Bagmane Tech Park", "RMZ Ecoworld"];
    for (let i = 0; i < 4; i++) {
      const y = 1.5 + i * 0.72;
      card(s, M, y, 3.2, 0.6);
      s.addText(`Round 1  ·  Park ${i + 1}`, { x: M + 0.2, y: y + 0.06, w: 2.9, h: 0.25, fontFace: FONT_B, fontSize: 10, color: C.rose, bold: true, margin: 0, isTextBox: true });
      s.addText(parks[i], { x: M + 0.2, y: y + 0.28, w: 2.9, h: 0.28, fontFace: FONT_B, fontSize: 13, color: C.plum, bold: true, margin: 0, isTextBox: true });
      s.addShape(pres.shapes.LINE, { x: 3.7, y: y + 0.3, w: 0.7, h: 0, line: { color: C.rose, width: 1.5, endArrowType: "triangle" } });
    }
    card(s, 4.5, 1.5, 2.1, 2.76, C.plum);
    s.addText("20 finalists", { x: 4.6, y: 2.2, w: 1.9, h: 0.5, fontFace: FONT_H, fontSize: 24, bold: true, color: C.white, align: "center", margin: 0, isTextBox: true });
    s.addText("5 from each park, mentored over 2 weeks", { x: 4.6, y: 2.75, w: 1.9, h: 0.6, fontFace: FONT_B, fontSize: 11, color: "E8DDE3", align: "center", margin: 0, isTextBox: true });
    s.addShape(pres.shapes.LINE, { x: 6.7, y: 2.88, w: 0.5, h: 0, line: { color: C.rose, width: 1.5, endArrowType: "triangle" } });
    card(s, 7.3, 1.5, 2.2, 2.76, C.rose);
    s.addText("Grand Finale", { x: 7.4, y: 1.7, w: 2.0, h: 0.4, fontFace: FONT_H, fontSize: 17, bold: true, color: C.white, align: "center", margin: 0, isTextBox: true });
    s.addText("Evening ramp show at the anchor park. Pro models open and close, 20 finalists walk the Mia segments, influencer jury crowns the winner.", { x: 7.45, y: 2.15, w: 1.9, h: 1.9, fontFace: FONT_B, fontSize: 11, color: C.white, align: "center", valign: "top", margin: 0, isTextBox: true });
    s.addText("Park list is a proposed shortlist. Final selection follows venue conversations in weeks 1 and 2.", { x: M, y: 4.5, w: 9, h: 0.3, fontFace: FONT_B, fontSize: 9, italic: true, color: C.muted, margin: 0, isTextBox: true });
  }

  // 6. Audience
  {
    const s = lightSlide("Who we are speaking to", "Audience"); pageNo(s, 6);
    card(s, M, 1.4, 4.2, 3.0, C.plum);
    s.addText("Primary: the participant", { x: M + 0.25, y: 1.55, w: 3.7, h: 0.35, fontFace: FONT_B, fontSize: 15, bold: true, color: C.gold, margin: 0, isTextBox: true });
    bullets(s, ["Women 24 to 38, working in IT, ITES, consulting and startups inside the parks", "Dresses for work daily, wants to look polished without effort", "Active on Instagram, follows fashion and workwear creators", "Buys jewellery for herself, values design and wearability over weight"], M + 0.25, 1.95, 3.7, 2.3, { color: C.white, fontSize: 12 });
    card(s, 5.1, 1.4, 4.4, 1.4);
    s.addText("Secondary: the campus audience", { x: 5.35, y: 1.5, w: 4.0, h: 0.3, fontFace: FONT_B, fontSize: 14, bold: true, color: C.plum, margin: 0, isTextBox: true });
    s.addText("Everyone on campus during lunch and evening: colleagues who cheer, try on, take photos and share. This is where reach and word of mouth come from.", { x: 5.35, y: 1.85, w: 4.0, h: 0.9, fontFace: FONT_B, fontSize: 11.5, color: C.ink, valign: "top", margin: 0, isTextBox: true });
    card(s, 5.1, 3.0, 4.4, 1.4);
    s.addText("Tertiary: the digital audience", { x: 5.35, y: 3.1, w: 4.0, h: 0.3, fontFace: FONT_B, fontSize: 14, bold: true, color: C.plum, margin: 0, isTextBox: true });
    s.addText("Followers of the influencer jury and of Mia's own handles across India, who see the finalists' journeys, styling reels and the finale.", { x: 5.35, y: 3.45, w: 4.0, h: 0.9, fontFace: FONT_B, fontSize: 11.5, color: C.ink, valign: "top", margin: 0, isTextBox: true });
  }

  // 7. Venues
  {
    const s = lightSlide("Venue plan: four parks, one anchor", "Venues"); pageNo(s, 7);
    const rows = [["Manyata Tech Park", "Hebbal, North", "Largest campus, central food court plaza", "Round 1"], ["Embassy TechVillage", "Outer Ring Road", "Open amphitheatre, strong footfall at lunch", "Round 1 + Finale"], ["Bagmane Tech Park", "CV Raman Nagar", "Compact, dense, easy stage setup", "Round 1"], ["RMZ Ecoworld", "Bellandur", "Central lawn, evening-friendly", "Round 1"]];
    const tbl = [[{ text: "Park", options: { bold: true, color: C.white, fill: { color: C.plum } } }, { text: "Zone", options: { bold: true, color: C.white, fill: { color: C.plum } } }, { text: "Why it works", options: { bold: true, color: C.white, fill: { color: C.plum } } }, { text: "Role", options: { bold: true, color: C.white, fill: { color: C.plum } } }]];
    rows.forEach((r, i) => tbl.push(r.map(t => ({ text: t, options: { fill: { color: i % 2 ? C.white : C.blush } } }))));
    s.addTable(tbl, { x: M, y: 1.4, w: 5.6, colW: [1.6, 1.2, 2.0, 0.8], fontFace: FONT_B, fontSize: 10.5, color: C.ink, border: { type: "solid", color: C.line, pt: 0.5 }, rowH: 0.46, valign: "middle" });
    card(s, 6.5, 1.4, 3.0, 3.1);
    s.addText("Selection criteria", { x: 6.7, y: 1.55, w: 2.6, h: 0.3, fontFace: FONT_B, fontSize: 14, bold: true, color: C.plum, margin: 0, isTextBox: true });
    bullets(s, ["Lunch-hour footfall of 3,000+ in a single plaza", "Park management open to tenant engagement events", "Power, security and stage-able open area", "Mia or Tanishq store within 15 minutes", "Willingness to co-promote on internal channels"], 6.7, 1.95, 2.6, 2.5, { fontSize: 11 });
    s.addText("Fallback options: Prestige Tech Park, Cessna Business Park, Global Village Tech Park.", { x: M, y: 4.5, w: 6, h: 0.3, fontFace: FONT_B, fontSize: 9, italic: true, color: C.muted, margin: 0, isTextBox: true });
  }

  // 8. Timeline
  {
    const s = lightSlide("Eight-week season plan", "Timeline"); pageNo(s, 8);
    const weeks = 8, gx = 2.4, gw = 7.1, cw = gw / weeks, gy = 1.45;
    for (let w = 0; w < weeks; w++) s.addText(`W${w + 1}`, { x: gx + w * cw, y: gy, w: cw, h: 0.25, fontFace: FONT_B, fontSize: 10, bold: true, color: C.muted, align: "center", margin: 0, isTextBox: true });
    const bars = [["Venue tie-ups & permissions", 0, 2, C.muted], ["Influencer onboarding", 0, 2, C.muted], ["Registration drive", 1, 3, C.rose], ["Round 1 across 4 parks", 3, 2, C.plum], ["Mentoring & styling", 5, 2, C.rose], ["Grand finale", 7, 1, C.plum], ["Content & PR amplification", 3, 5, C.gold]];
    bars.forEach((b, i) => {
      const y = gy + 0.4 + i * 0.4;
      s.addText(b[0], { x: M, y, w: 1.85, h: 0.3, fontFace: FONT_B, fontSize: 10.5, color: C.ink, valign: "middle", margin: 0, isTextBox: true });
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: gx + b[1] * cw + 0.03, y: y + 0.03, w: b[2] * cw - 0.06, h: 0.24, fill: { color: b[3] }, line: { color: b[3] }, rectRadius: 0.05 });
    });
    for (let w = 0; w <= weeks; w++) s.addShape(pres.shapes.LINE, { x: gx + w * cw, y: gy + 0.3, w: 0, h: 2.9, line: { color: C.line, width: 0.5 } });
    s.addText("Key dates: Round 1 on Thursdays and Fridays of weeks 4 and 5 at lunch. Finale on a Friday evening of week 8.", { x: M, y: 4.8, w: 9, h: 0.3, fontFace: FONT_B, fontSize: 10, color: C.muted, margin: 0, isTextBox: true });
  }

  // 9. Marketing plan - pre event
  {
    const s = lightSlide("Marketing plan: filling the funnel", "Pre-event, weeks 2 to 4"); pageNo(s, 9);
    const cols = [
      ["FiSmartphone", "Digital", ["Geo-targeted Instagram and Meta ads within a 3 km radius of each park", "Influencer jury announcement reels with a registration call to action", "Landing page with 60-second registration and a photo upload"]],
      ["FiHome", "Inside the park", ["Standees and elevator branding at food courts and lobbies", "Park management emailers and tenant Slack or Teams posts", "Lunch-hour 'Mia styling desk' teasers one week before each round"]],
      ["FiUsers", "Community", ["HR and women's ERG partnerships in anchor tenants", "Referral mechanic: register with a colleague, both get a Mia voucher", "WhatsApp broadcast for registrants with styling tips"]],
    ];
    for (let i = 0; i < 3; i++) {
      const x = M + i * 3.05;
      card(s, x, 1.4, 2.9, 3.1);
      await iconCircle(s, cols[i][0], x + 0.2, 1.55, 0.5, C.white, C.rose);
      s.addText(cols[i][1], { x: x + 0.8, y: 1.62, w: 2.0, h: 0.35, fontFace: FONT_B, fontSize: 15, bold: true, color: C.plum, margin: 0, isTextBox: true });
      bullets(s, cols[i][2], x + 0.2, 2.2, 2.55, 2.2, { fontSize: 11 });
    }
    s.addText("Target: 1,200 registrations across four parks, 300 per park, to shortlist 40 per park for the on-ground round.", { x: M, y: 4.6, w: 9, h: 0.3, fontFace: FONT_B, fontSize: 10.5, bold: true, color: C.plum, margin: 0, isTextBox: true });
  }

  // 10. Influencer strategy
  {
    const s = lightSlide("Influencers as judges and mentors", "Influencers"); pageNo(s, 10);
    const tiers = [["Jury lead", "1 macro fashion creator, 500K+", "Head judge at all rounds and the finale. Announces the winner. 3 reels, 2 stories per round.", C.plum, C.white], ["Park judges", "3 mid-tier workwear and styling creators, 100K to 300K", "One rotates per park round. Mentors five finalists each. Judging reels and mentoring vlogs.", C.rose, C.white], ["Amplifiers", "8 micro creators, 20K to 80K, Bengaluru based", "Attend rounds, create try-on and 'office fit check' content, drive registrations in their circles.", C.blush, C.plum]];
    for (let i = 0; i < 3; i++) {
      const y = 1.4 + i * 1.0;
      card(s, M, y, 9, 0.88, tiers[i][3]);
      s.addText(tiers[i][0], { x: M + 0.25, y: y + 0.1, w: 1.8, h: 0.3, fontFace: FONT_B, fontSize: 15, bold: true, color: tiers[i][4], margin: 0, isTextBox: true });
      s.addText(tiers[i][1], { x: M + 0.25, y: y + 0.42, w: 2.3, h: 0.4, fontFace: FONT_B, fontSize: 10.5, color: tiers[i][4], margin: 0, isTextBox: true });
      s.addText(tiers[i][2], { x: M + 2.9, y: y + 0.12, w: 5.9, h: 0.65, fontFace: FONT_B, fontSize: 12, color: tiers[i][4], valign: "middle", margin: 0, isTextBox: true });
    }
    s.addText("Selection filter: creators whose audience is 60%+ women aged 24 to 38 in Bengaluru, with prior workwear or jewellery content. Shortlist shared with Mia for approval in week 1.", { x: M, y: 4.45, w: 9, h: 0.45, fontFace: FONT_B, fontSize: 10.5, color: C.muted, margin: 0, isTextBox: true });
  }

  // 11. Content & amplification
  {
    const s = lightSlide("Content: three waves in one season", "During and post-event"); pageNo(s, 11);
    const waves = [["Wave 1  ·  Weeks 2-4", "Build", ["Jury reveal and registration reels", "'What does fashion at work mean to you' UGC prompt", "Park teasers and countdowns"]], ["Wave 2  ·  Weeks 4-7", "Journey", ["Round 1 highlights per park, 48-hour turnaround", "Finalist introduction cards, 20 stories", "Mentoring and Mia styling transformation reels"]], ["Wave 3  ·  Weeks 8-9", "Crown", ["Finale live stories and after-movie", "Winner announcement and 'Face of Mia at Work' campaign", "PR pitch to city lifestyle and business media"]]];
    for (let i = 0; i < 3; i++) {
      const x = M + i * 3.05;
      s.addShape(pres.shapes.OVAL, { x: x + 1.15, y: 1.35, w: 0.6, h: 0.6, fill: { color: i === 1 ? C.rose : C.plum }, line: { color: i === 1 ? C.rose : C.plum } });
      s.addText(String(i + 1), { x: x + 1.15, y: 1.35, w: 0.6, h: 0.6, fontFace: FONT_H, fontSize: 20, bold: true, color: C.white, align: "center", valign: "middle", margin: 0, isTextBox: true });
      s.addText(waves[i][0], { x, y: 2.05, w: 2.9, h: 0.25, fontFace: FONT_B, fontSize: 10, color: C.rose, bold: true, align: "center", margin: 0, isTextBox: true });
      s.addText(waves[i][1], { x, y: 2.3, w: 2.9, h: 0.4, fontFace: FONT_H, fontSize: 20, bold: true, color: C.plum, align: "center", margin: 0, isTextBox: true });
      bullets(s, waves[i][2], x + 0.2, 2.8, 2.6, 1.6, { fontSize: 11 });
    }
    s.addText("All content is shot by our crew and shared with Mia with full usage rights for the season plus 6 months.", { x: M, y: 4.55, w: 9, h: 0.3, fontFace: FONT_B, fontSize: 10.5, color: C.muted, margin: 0, isTextBox: true });
  }

  // 12. Round 1 flow
  {
    const s = lightSlide("Round 1 flow: a lunch-hour takeover", "Execution · Round 1, per park"); pageNo(s, 12);
    const flow = [["11:00", "Setup complete", "Stage, Mia styling zone, photo booth, registration desk live"], ["12:15", "Zone opens", "Walk-in try-ons, styling desk, micro creators go live"], ["12:45", "Emcee kicks off", "Jury introduction, format explained, crowd energizer"], ["13:00", "Shortlist walk", "40 pre-shortlisted participants walk in groups of 8, jury scores"], ["13:45", "Model showcase", "3 pro models present the Mia workwear edit, hosted by the park judge"], ["14:00", "Top 5 announced", "Finalists receive a Mia piece on stage, photo moment"], ["14:15", "Wrap and content", "Finalist interviews, crowd try-ons continue till 15:00"]];
    flow.forEach((f, i) => {
      const y = 1.4 + i * 0.44;
      s.addText(f[0], { x: M, y, w: 0.7, h: 0.38, fontFace: FONT_B, fontSize: 12, bold: true, color: C.rose, valign: "middle", margin: 0, isTextBox: true });
      s.addShape(pres.shapes.OVAL, { x: 1.3, y: y + 0.12, w: 0.14, h: 0.14, fill: { color: C.plum }, line: { color: C.plum } });
      if (i < flow.length - 1) s.addShape(pres.shapes.LINE, { x: 1.37, y: y + 0.26, w: 0, h: 0.32, line: { color: C.line, width: 1 } });
      s.addText(f[1], { x: 1.65, y, w: 1.9, h: 0.38, fontFace: FONT_B, fontSize: 12, bold: true, color: C.plum, valign: "middle", margin: 0, isTextBox: true });
      s.addText(f[2], { x: 3.6, y, w: 5.9, h: 0.38, fontFace: FONT_B, fontSize: 11, color: C.ink, valign: "middle", margin: 0, isTextBox: true });
    });
    s.addText("Judging criteria: confidence, styling sense, how the Mia piece is worn, and audience response. Scored 1 to 10 on each.", { x: M, y: 4.6, w: 9, h: 0.3, fontFace: FONT_B, fontSize: 10, italic: true, color: C.muted, margin: 0, isTextBox: true });
  }

  // 13. Finale flow
  {
    const s = darkSlide(); pageNo(s, 13);
    s.addText("EXECUTION · GRAND FINALE, WEEK 8", { x: M, y: 0.32, w: 6, h: 0.25, fontFace: FONT_B, fontSize: 10, color: C.gold, bold: true, charSpacing: 2, margin: 0, isTextBox: true });
    s.addText("Finale flow: a Friday evening ramp show", { x: M, y: 0.55, w: 9, h: 0.6, fontFace: FONT_H, fontSize: 28, color: C.white, bold: true, valign: "top", margin: 0, isTextBox: true });
    const flow = [["17:30", "Doors open", "Mia try-on lounge, photo wall, welcome drinks, DJ"], ["18:30", "Opening act", "Pro models open with the Mia signature edit, jury lead hosts"], ["18:50", "Segment 1: Boardroom", "10 finalists, formal workwear styled with Mia"], ["19:10", "Segment 2: Desk to Dinner", "10 finalists, transition looks, mentors introduce each walk"], ["19:30", "Jury deliberation", "Live audience vote via QR adds 20% weight, micro creators do crowd bits"], ["19:45", "Crowning", "Face of Fashion in Corporate announced, Mia collection gifted, sash and trophy"], ["20:00", "Closing walk", "All 20 finalists and models, confetti, press and content moment"], ["20:15", "After-party", "Networking, try-ons and vouchers till 21:00"]];
    flow.forEach((f, i) => {
      const col = i < 4 ? 0 : 1, row = i % 4;
      const x = M + col * 4.6, y = 1.4 + row * 0.8;
      card(s, x, y, 4.4, 0.7, "4E2E4D");
      s.addText(f[0], { x: x + 0.15, y: y + 0.08, w: 0.7, h: 0.55, fontFace: FONT_B, fontSize: 13, bold: true, color: C.gold, valign: "middle", margin: 0, isTextBox: true });
      s.addText(f[1], { x: x + 0.9, y: y + 0.07, w: 3.4, h: 0.28, fontFace: FONT_B, fontSize: 12.5, bold: true, color: C.white, margin: 0, isTextBox: true });
      s.addText(f[2], { x: x + 0.9, y: y + 0.35, w: 3.4, h: 0.3, fontFace: FONT_B, fontSize: 10, color: "E8DDE3", margin: 0, isTextBox: true });
    });
    s.addText("Venue: amphitheatre or central lawn at the anchor park. Capacity 600 seated plus standing.", { x: M, y: 4.7, w: 9, h: 0.3, fontFace: FONT_B, fontSize: 10, color: "C9B8C4", margin: 0, isTextBox: true });
  }

  // 14. Brand zones
  {
    const s = lightSlide("Brand zones on the ground", "Brand experience"); pageNo(s, 14);
    const zones = [["FiEye", "Mia Styling Studio", "Two stylists pair jewellery with what attendees are already wearing. Every look gets a photo with a Mia frame."], ["FiCamera", "Face of Fashion Booth", "Ring-light photo wall with the season branding. Instant print plus a shareable digital copy with a Mia voucher."], ["FiGift", "Try and Take", "Curated 25-piece workwear edit on display. Attendees scan to reserve a piece at the nearest store with a season offer."], ["FiEdit3", "Registration and lead desk", "On-the-spot registrations for the next round, consented lead capture for Mia CRM."]];
    for (let i = 0; i < 4; i++) {
      const col = i % 2, row = Math.floor(i / 2);
      const x = M + col * 4.6, y = 1.4 + row * 1.6;
      card(s, x, y, 4.4, 1.4);
      await iconCircle(s, zones[i][0], x + 0.2, y + 0.2, 0.55, C.white, C.rose);
      s.addText(zones[i][1], { x: x + 0.95, y: y + 0.18, w: 3.3, h: 0.3, fontFace: FONT_B, fontSize: 14, bold: true, color: C.plum, margin: 0, isTextBox: true });
      s.addText(zones[i][2], { x: x + 0.95, y: y + 0.5, w: 3.3, h: 0.85, fontFace: FONT_B, fontSize: 11, color: C.ink, valign: "top", margin: 0, isTextBox: true });
    }
  }

  // 15. Execution workstreams
  {
    const s = lightSlide("Execution: workstreams and ownership", "Execution"); pageNo(s, 15);
    const hdr = ["Workstream", "Agency owns", "Mia owns", "Ready by"];
    const rows = [["Venue and permissions", "Park scouting, contracts, permissions, security, insurance", "Sign-off on final park list", "Week 2"], ["Influencers and jury", "Shortlist, contracts, briefs, content calendar", "Approval of jury and brand brief", "Week 2"], ["Registrations", "Landing page, ads, park promotion, shortlisting", "Assets and brand guidelines", "Week 4"], ["Production", "Stage, ramp, AV, branding, zones, crew", "Jewellery for styling and gifting, store offers", "Week 4, Week 8"], ["Models and styling", "Choreographer, pro models, stylists, hair and makeup", "Approval of looks and collection edit", "Week 3, Week 7"], ["Content and PR", "Crew, editing, 48-hour delivery, media pitching", "Posting on Mia handles, press approvals", "Rolling"], ["Measurement", "Dashboard, weekly report, post-season review", "Store sales data for the lift analysis", "Weekly"]];
    const tbl = [hdr.map(h => ({ text: h, options: { bold: true, color: C.white, fill: { color: C.plum } } }))];
    rows.forEach((r, i) => tbl.push(r.map((t, j) => ({ text: t, options: { bold: j === 0, fill: { color: i % 2 ? C.white : C.blush } } }))));
    s.addTable(tbl, { x: M, y: 1.35, w: 9, colW: [1.7, 3.4, 2.7, 1.2], fontFace: FONT_B, fontSize: 10, color: C.ink, border: { type: "solid", color: C.line, pt: 0.5 }, rowH: 0.42, valign: "middle" });
  }

  // 16. Budget
  {
    const s = lightSlide("Budget: a lean season under 25 lakh", "Investment"); pageNo(s, 16);
    const labels = ["Stage, ramp, AV and lighting (5 events)", "Influencer jury and amplifiers", "Venue fees and permissions", "Models, choreography, styling, hair and makeup", "Branding, zones and production", "Agency fee and contingency", "Digital ads and registration tech", "Content crew and editing"];
    const vals = [6.0, 4.5, 3.0, 2.5, 2.0, 2.0, 1.5, 1.5];
    s.addChart(pres.charts.BAR, [{ name: "INR lakh", labels, values: vals }], { x: M, y: 1.3, w: 5.8, h: 3.4, barDir: "bar", chartColors: [C.plum], showValue: true, dataLabelPosition: "outEnd", dataLabelFontSize: 10, dataLabelColor: C.ink, dataLabelFormatCode: "0.0", showLegend: false, showTitle: false, catAxisLabelFontSize: 9.5, catAxisLabelColor: C.ink, valAxisHidden: true, valGridLine: { style: "none" }, catGridLine: { style: "none" }, catAxisOrientation: "maxMin", valAxisMaxVal: 7.5 });
    card(s, 6.6, 1.3, 2.9, 3.4, C.plum);
    s.addText("Total", { x: 6.8, y: 1.5, w: 2.5, h: 0.3, fontFace: FONT_B, fontSize: 12, color: C.gold, bold: true, margin: 0, isTextBox: true });
    s.addText("₹23 lakh", { x: 6.8, y: 1.8, w: 2.5, h: 0.6, fontFace: FONT_H, fontSize: 32, bold: true, color: C.white, margin: 0, isTextBox: true });
    s.addText("plus GST", { x: 6.8, y: 2.4, w: 2.5, h: 0.25, fontFace: FONT_B, fontSize: 10, color: "E8DDE3", margin: 0, isTextBox: true });
    bullets(s, ["Jewellery for styling and gifting is in kind from Mia, not in this budget", "Park fees can drop to zero where management co-hosts as a tenant engagement event", "Beauty and beverage co-sponsors can offset up to 3 lakh"], 6.8, 2.8, 2.5, 1.85, { color: C.white, fontSize: 9.5 });
  }

  // 17. KPIs
  {
    const s = lightSlide("What success looks like", "Measurement"); pageNo(s, 17);
    const kp = [["1,200+", "registrations", "FiEdit3"], ["15,000+", "on-ground footfall across 5 events", "FiUsers"], ["3M+", "organic reach via jury and creators", "FiTrendingUp"], ["150+", "branded content assets delivered", "FiFilm"], ["2,500+", "consented leads for Mia CRM", "FiDatabase"], ["+15%", "brand recall lift in a pre and post survey", "FiBarChart2"]];
    for (let i = 0; i < 6; i++) {
      const col = i % 3, row = Math.floor(i / 3);
      const x = M + col * 3.05, y = 1.4 + row * 1.6;
      card(s, x, y, 2.9, 1.4);
      await iconCircle(s, kp[i][2], x + 0.2, y + 0.2, 0.5, C.white, C.rose);
      s.addText(kp[i][0], { x: x + 0.85, y: y + 0.15, w: 2.0, h: 0.55, fontFace: FONT_H, fontSize: 26, bold: true, color: C.plum, margin: 0, isTextBox: true });
      s.addText(kp[i][1], { x: x + 0.85, y: y + 0.72, w: 1.95, h: 0.6, fontFace: FONT_B, fontSize: 11, color: C.ink, valign: "top", margin: 0, isTextBox: true });
    }
    s.addText("Reported weekly on a shared dashboard. Brand lift measured with a 300-respondent survey inside the parks before and after the season.", { x: M, y: 4.65, w: 9, h: 0.3, fontFace: FONT_B, fontSize: 10, color: C.muted, margin: 0, isTextBox: true });
  }

  // 18. Sponsor deliverables
  {
    const s = lightSlide("What Mia gets as title sponsor", "The partnership"); pageNo(s, 18);
    const left = ["Title naming: 'Mia at Work: Face of Fashion in Corporate'", "Logo lock-up on every asset, stage, ramp and creator post", "Exclusive jewellery category, no competing brand on ground", "Ownership of the winner's title and campaign rights for 6 months", "All content with usage rights across Mia's channels and stores"];
    const right = ["Styling and try-on zones at all 5 events", "Consented lead data and season offer redemption tracking", "Store activation kit for 4 nearby Mia stores", "Quarterly option to renew for Hyderabad and Pune seasons", "Right of first refusal on Season 2"];
    card(s, M, 1.4, 4.4, 3.2, C.plum);
    s.addText("Brand and content", { x: M + 0.25, y: 1.55, w: 3.9, h: 0.3, fontFace: FONT_B, fontSize: 14, bold: true, color: C.gold, margin: 0, isTextBox: true });
    bullets(s, left, M + 0.25, 1.95, 3.9, 2.6, { color: C.white, fontSize: 11.5 });
    card(s, 5.1, 1.4, 4.4, 3.2);
    s.addText("Commerce and future", { x: 5.35, y: 1.55, w: 3.9, h: 0.3, fontFace: FONT_B, fontSize: 14, bold: true, color: C.plum, margin: 0, isTextBox: true });
    bullets(s, right, 5.35, 1.95, 3.9, 2.6, { fontSize: 11.5 });
  }

  // 19. Risks
  {
    const s = lightSlide("Risks and how we handle them", "Risks"); pageNo(s, 19);
    const rows = [["Park refuses stage or crowd events", "Two backup parks per zone kept warm in week 1. Lobby-scale 'styling desk' format as fallback."], ["Low registrations at a park", "Ad budget reallocated by week 3 data. HR and ERG referrals switched on early. Walk-in registration on the day."], ["Rain or weather on event day", "Round 1 held under food court cover. Finale has a covered contingency and a 48-hour reschedule window."], ["Influencer drops out", "Contracts with replacement clauses. Bench of 2 alternates per tier briefed and signed."], ["Brand safety on stage", "Judging rubric, emcee script and content guidelines approved by Mia. No body-size or appearance commentary."]];
    rows.forEach((r, i) => {
      const y = 1.4 + i * 0.64;
      card(s, M, y, 9, 0.56, i % 2 ? C.white : C.blush);
      s.addText(r[0], { x: M + 0.2, y: y + 0.05, w: 2.8, h: 0.46, fontFace: FONT_B, fontSize: 11.5, bold: true, color: C.plum, valign: "middle", margin: 0, isTextBox: true });
      s.addText(r[1], { x: 3.5, y: y + 0.05, w: 5.8, h: 0.46, fontFace: FONT_B, fontSize: 10.5, color: C.ink, valign: "middle", margin: 0, isTextBox: true });
    });
  }

  // 20. Next steps
  {
    const s = darkSlide(); pageNo(s, 20);
    s.addText("NEXT STEPS", { x: M, y: 0.6, w: 4, h: 0.3, fontFace: FONT_B, fontSize: 10, color: C.gold, bold: true, charSpacing: 2, margin: 0, isTextBox: true });
    s.addText("Let's make Mia the face of fashion at work", { x: M, y: 0.95, w: 6, h: 1.2, fontFace: FONT_H, fontSize: 32, bold: true, color: C.white, margin: 0, isTextBox: true });
    const steps = [["1", "Alignment call", "Agree on scope, parks and jury direction"], ["2", "Sign-off", "Budget approval and title sponsorship agreement"], ["3", "Kick-off", "Week 1 begins: venue and influencer lock"], ["4", "Season launch", "Registration goes live in week 2"]];
    steps.forEach((st, i) => {
      const y = 2.3 + i * 0.6;
      s.addShape(pres.shapes.OVAL, { x: M, y: y + 0.05, w: 0.4, h: 0.4, fill: { color: C.rose }, line: { color: C.rose } });
      s.addText(st[0], { x: M, y: y + 0.05, w: 0.4, h: 0.4, fontFace: FONT_B, fontSize: 13, bold: true, color: C.white, align: "center", valign: "middle", margin: 0, isTextBox: true });
      s.addText(st[1], { x: 1.1, y, w: 2.0, h: 0.5, fontFace: FONT_B, fontSize: 14, bold: true, color: C.white, valign: "middle", margin: 0, isTextBox: true });
      s.addText(st[2], { x: 3.1, y, w: 3.5, h: 0.5, fontFace: FONT_B, fontSize: 12, color: "E8DDE3", valign: "middle", margin: 0, isTextBox: true });
    });
    card(s, 6.9, 2.3, 2.6, 2.3, "4E2E4D");
    s.addText("The ask", { x: 7.1, y: 2.45, w: 2.2, h: 0.3, fontFace: FONT_B, fontSize: 12, bold: true, color: C.gold, margin: 0, isTextBox: true });
    s.addText("Title sponsorship of Season 1, Bengaluru", { x: 7.1, y: 2.8, w: 2.2, h: 0.7, fontFace: FONT_H, fontSize: 16, bold: true, color: C.white, margin: 0, isTextBox: true });
    s.addText("₹23 lakh plus GST, plus jewellery in kind", { x: 7.1, y: 3.6, w: 2.2, h: 0.6, fontFace: FONT_B, fontSize: 11, color: "E8DDE3", margin: 0, isTextBox: true });
  }

  await pres.writeFile({ fileName: "Mia-at-Work-Corporate-Fashion-IP.pptx" });
  console.log("written");
})();
