import base64, segno, io, pathlib

HERE = pathlib.Path(__file__).resolve().parent
BUILD = HERE / ".build"
BUILD.mkdir(exist_ok=True)
URL = "https://humanloop.dciworkforce.com"
SHOW_URL = "humanloop.dciworkforce.com"

def data_uri(path, mime):
    return f"data:{mime};base64," + base64.b64encode(pathlib.Path(path).read_bytes()).decode()

logo = data_uri(HERE / "logo-q.png", "image/png")
ollie = data_uri(HERE / "ollie-q.png", "image/png")

qr = segno.make(URL, error="m")
buf = io.BytesIO()
qr.save(buf, kind="svg", scale=8, border=1, dark="#111418", light="#ffffff", xmldecl=False, svgns=True, nl=False)
qr_uri = "data:image/svg+xml;base64," + base64.b64encode(buf.getvalue()).decode()

HTML = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Human Loop demo kit</title>
<style>
  @page {{ size: Letter; margin: 0; }}
  :root {{
    --teal:#0f6a61; --teal-dark:#0a4c45; --teal-tint:#e7f1ef; --ink:#111418; --ink-soft:#3a4149;
    --muted:#5f6b76; --line:#e3e7ea; --orange:#f26b1d; --orange-text:#c2410c; --orange-tint:#fff1e8;
  }}
  * {{ box-sizing:border-box; }}
  html,body {{ margin:0; padding:0; }}
  body {{ font-family:"Liberation Sans", Arial, Helvetica, sans-serif; color:var(--ink); font-size:11.5pt; line-height:1.4; -webkit-print-color-adjust:exact; print-color-adjust:exact; }}
  .page {{ width:8.5in; height:11in; padding:.42in .6in .38in; position:relative; overflow:hidden; page-break-after:always; display:flex; flex-direction:column; }}
  .page:last-child {{ page-break-after:auto; }}
  .top {{ display:flex; align-items:center; justify-content:space-between; padding-bottom:10pt; border-bottom:1.5pt solid var(--line); }}
  .top img {{ height:.5in; }}
  .top .name {{ font-weight:700; color:var(--teal); font-size:15pt; letter-spacing:.2pt; }}
  .foot {{ margin-top:auto; padding-top:8pt; border-top:1pt solid var(--line); display:flex; justify-content:space-between; font-size:8.5pt; color:var(--muted); }}
  h1 {{ font-size:26pt; line-height:1.08; margin:12pt 0 6pt; letter-spacing:-.4pt; }}
  h1 .mark {{ background:linear-gradient(transparent 62%, #ffd8bf 62%); }}
  h2 {{ font-size:13.5pt; margin:0 0 5pt; color:var(--teal-dark); }}
  .lead {{ font-size:11.5pt; color:var(--ink-soft); margin:0; max-width:5.2in; }}
  .hero {{ display:flex; align-items:center; gap:.2in; }}
  .hero .txt {{ flex:1; }}
  .hero img {{ width:1.5in; height:1.5in; }}
  .play {{ display:flex; gap:.22in; align-items:center; background:var(--teal); color:#fff; border-radius:12pt; padding:.13in .2in; margin:10pt 0 9pt; }}
  .play .qr {{ background:#fff; border-radius:8pt; padding:5pt; width:1.5in; height:1.5in; flex:none; }}
  .play .qr img {{ width:100%; height:100%; display:block; }}
  .play .big {{ font-size:20pt; font-weight:700; line-height:1.1; }}
  .play .url {{ font-size:15pt; font-weight:700; color:#ffd8bf; margin:3pt 0 6pt; }}
  .play p {{ margin:1.5pt 0; font-size:10.8pt; color:#e7f1ef; }}
  .three {{ display:grid; grid-template-columns:repeat(3,1fr); gap:8pt; margin-bottom:9pt; }}
  .card {{ border:1.2pt solid var(--line); border-radius:9pt; padding:7pt 9pt; background:#fff; }}
  .card .n {{ display:inline-flex; width:20pt; height:20pt; border-radius:50%; background:var(--orange); color:#fff; font-weight:700; align-items:center; justify-content:center; margin-bottom:4pt; }}
  .card b {{ display:block; font-size:12pt; margin-bottom:2pt; }}
  .card span {{ font-size:10pt; color:var(--ink-soft); }}
  .pills {{ display:flex; flex-wrap:wrap; gap:5pt; margin:0 0 9pt; }}
  .pill {{ background:var(--teal-tint); color:var(--teal-dark); border-radius:99pt; padding:3pt 9pt; font-size:10pt; font-weight:700; }}
  .pill i {{ font-style:normal; font-weight:400; color:var(--ink-soft); }}
  .sub {{ font-size:10.5pt; color:var(--ink-soft); margin:0 0 10pt; }}
  .good {{ display:grid; grid-template-columns:1fr 1fr; gap:3pt 16pt; margin:0 0 9pt; padding:0; list-style:none; font-size:10pt; }}
  .good li {{ padding-left:14pt; position:relative; color:var(--ink-soft); }}
  .good li::before {{ content:""; position:absolute; left:0; top:5pt; width:7pt; height:7pt; border-radius:50%; background:var(--orange); }}
  .why {{ background:var(--teal-dark); color:#fff; border-radius:10pt; padding:8pt 12pt; font-size:10pt; }}
  .why b {{ display:block; font-size:11pt; margin-top:2pt; color:#ffd8bf; }}
  /* page 2 */
  .title {{ font-size:24pt; margin:14pt 0 2pt; letter-spacing:-.3pt; }}
  .note {{ color:var(--muted); font-size:10.5pt; margin:0 0 9pt; }}
  .check {{ background:var(--teal-tint); border-radius:9pt; padding:9pt 12pt; margin-bottom:10pt; }}
  .check h2 {{ font-size:12.5pt; margin-bottom:4pt; }}
  .check ul {{ list-style:none; margin:0; padding:0; font-size:10.5pt; }}
  .check li {{ padding-left:17pt; position:relative; margin:2pt 0; }}
  .check li::before {{ content:""; position:absolute; left:0; top:2.5pt; width:9pt; height:9pt; border:1.4pt solid var(--teal); border-radius:2pt; background:#fff; }}
  table {{ width:100%; border-collapse:separate; border-spacing:0; font-size:10.4pt; }}
  th {{ background:var(--teal); color:#fff; text-align:left; padding:5pt 8pt; font-size:10pt; }}
  th:first-child {{ border-radius:7pt 0 0 0; }} th:last-child {{ border-radius:0 7pt 0 0; }}
  td {{ vertical-align:top; padding:7pt 8pt; border-bottom:1pt solid var(--line); }}
  td.t {{ width:.85in; font-weight:700; color:var(--orange-text); white-space:nowrap; }}
  td.do {{ width:2.85in; }}
  td.say {{ color:var(--ink-soft); }}
  td.say em {{ font-style:normal; color:var(--ink); }}
  .tip {{ margin-top:10pt; border-left:3.5pt solid var(--orange); background:var(--orange-tint); padding:7pt 10pt; font-size:10.5pt; border-radius:0 7pt 7pt 0; }}
  /* page 3 */
  .qa {{ display:grid; grid-template-columns:1fr 1fr; gap:8pt 12pt; margin-bottom:12pt; }}
  .qa div {{ border:1.2pt solid var(--line); border-radius:9pt; padding:8pt 10pt; }}
  .qa b {{ display:block; color:var(--teal-dark); font-size:11pt; margin-bottom:2pt; }}
  .qa span {{ font-size:10.3pt; color:var(--ink-soft); }}
  .wrong li {{ margin:4pt 0; font-size:10.5pt; }}
  .wrong {{ margin:0 0 10pt; padding-left:16pt; }}
  .after {{ background:var(--teal-tint); border-radius:9pt; padding:9pt 12pt; font-size:10.5pt; }}
</style></head><body>

<!-- PAGE 1: handout -->
<section class="page">
  <div class="top"><img src="{logo}" alt="DCI Resources"><div class="name">Human Loop</div></div>
  <div class="hero">
    <div class="txt">
      <h1>AI agents are your new coworkers. Learn to <span class="mark">supervise them.</span></h1>
      <p class="lead">Human Loop is a free card game about keeping AI in check at work. Read the agent&rsquo;s plan, check the evidence, and make the call before it resets the wrong thing.</p>
    </div>
    <img src="{ollie}" alt="">
  </div>
  <div class="play">
    <div class="qr"><img src="{qr_uri}" alt="QR code for {SHOW_URL}"></div>
    <div>
      <div class="big">Play free</div>
      <div class="url">{SHOW_URL}</div>
      <p>Scan the code or type the address.</p>
      <p>No download. Plays in your browser on a phone or laptop.</p>
      <p>No sign-up needed: tap <b>Play now</b>.</p>
    </div>
  </div>
  <h2>How a shift works</h2>
  <div class="three">
    <div class="card"><span class="n">1</span><b>Read the plan</b><span>Your AI coworker shows you what it wants to do. Most plans are fine. Some are not.</span></div>
    <div class="card"><span class="n">2</span><b>Check the evidence</b><span>Tap Inspect. Mark the line that looks wrong.</span></div>
    <div class="card"><span class="n">3</span><b>Decide</b><span>Good plan? Let it run. Bad plan? Block it. Not sure? Ask your team lead.</span></div>
  </div>
  <h2>Five career pathways. Each has its own overeager AI coworker.</h2>
  <div class="pills">
    <span class="pill">Help Desk <i>&middot; Ollie</i></span>
    <span class="pill">Cybersecurity <i>&middot; Patch</i></span>
    <span class="pill">Cloud &amp; Network <i>&middot; Nimbus</i></span>
    <span class="pill">Full-Stack Development <i>&middot; Piper</i></span>
    <span class="pill">Business Analyst <i>&middot; Quill</i></span>
  </div>
  <h2>Good to know</h2>
  <ul class="good">
    <li>Free. No download.</li>
    <li>Every company and person in the game is made up.</li>
    <li>Guest play needs no sign-up, any age. Progress stays on your device.</li>
    <li>Optional sign-up (13 or older) saves progress. DCI emails only if you say yes.</li>
  </ul>
  <div class="why">Employers are adding AI agents to help desks, security, cloud, dev, and analytics teams. These agents can take real actions, fast. Someone has to check their work.<b>Human Loop lets you practice being that someone.</b></div>
  <div class="foot"><span>A free game by DCI Resources LLC</span><span>1 of 3</span></div>
</section>

<!-- PAGE 2: demo script -->
<section class="page">
  <div class="top"><img src="{logo}" alt="DCI Resources"><div class="name">Human Loop demo kit</div></div>
  <div class="title">Demo script: 5 minutes</div>
  <p class="note">For the person presenting. Use your phone, or a laptop on a screen.</p>
  <div class="check">
    <h2>Before you start</h2>
    <ul>
      <li>Open <b>{SHOW_URL}</b> on the device and the network you will use. Do this once before the meeting.</li>
      <li>Music is off unless you turn it on. Decide if you want sound.</li>
      <li>Use the guest path (<b>Play now</b>). No sign-up.</li>
      <li>Start with <b>Help Desk</b>. It is the easiest one to follow.</li>
    </ul>
  </div>
  <table>
    <tr><th>Time</th><th>You do</th><th>You say</th></tr>
    <tr><td class="t">0:00 &ndash; 0:30</td>
        <td class="do">Open the address. Tap <b>Play free</b>, then <b>Play now</b>, then the <b>Help Desk</b> card.</td>
        <td class="say">&ldquo;This is a card game that teaches a real job skill: supervising AI. An AI coworker makes plans. You check the evidence before it acts.&rdquo;</td></tr>
    <tr><td class="t">0:30 &ndash; 2:00</td>
        <td class="do"><b>Practice</b> (4 tickets, about 90 seconds). Tap <b>Inspect</b>, then the plan. Read the evidence. Tap the line that looks wrong. Choose <b>Block</b> or <b>Let it run</b>.</td>
        <td class="say">&ldquo;Dana is the coach. She tells you the skill: check the plan. After each plan, the game shows what the AI did not check.&rdquo; <em>If the room hesitates, tap Where do I look?</em></td></tr>
    <tr><td class="t">2:00 &ndash; 4:00</td>
        <td class="do">Tap <b>Start the real shift</b>, then <b>Start shift</b>. Play turns 1 and 2, then stop.</td>
        <td class="say">&ldquo;Now it is real. You start with two cards, Inspect and Block. Each turn adds a new card. Energy is limited, so you cannot check everything. Risky plans that run fill the risk bar.&rdquo;</td></tr>
    <tr><td class="t">4:00 &ndash; 5:00</td>
        <td class="do">If a plan was missed, tap <b>Show me</b>. Then open <b>Menu</b> and point at <b>Send feedback</b>.</td>
        <td class="say">&ldquo;It circles the clue you missed. There are five pathways, each with its own AI coworker. Tell us what you think: Menu, then Send feedback.&rdquo;</td></tr>
  </table>
  <div class="tip"><b>Good to know:</b> A full shift is 6 turns, so you will not finish one in 5 minutes. That is fine. Practice cannot end in a breach, so it is safe to make mistakes there.</div>
  <div class="foot"><span>Human Loop &middot; DCI Resources LLC &middot; {SHOW_URL}</span><span>2 of 3</span></div>
</section>

<!-- PAGE 3: Q&A -->
<section class="page">
  <div class="top"><img src="{logo}" alt="DCI Resources"><div class="name">Human Loop demo kit</div></div>
  <div class="title">Questions you may get</div>
  <p class="note">Short answers you can say out loud.</p>
  <div class="qa">
    <div><b>Is it real AI?</b><span>The AI coworkers are scripted game characters, not a live chatbot. They cannot say anything unexpected.</span></div>
    <div><b>Who is it for?</b><span>Adult learners in DCI&rsquo;s career pathways. It uses short, plain sentences and works on a phone. Sign-up needs age 13 or older. Guest play has no age limit.</span></div>
    <div><b>What does it cost?</b><span>It is free to play.</span></div>
    <div><b>Are the companies real?</b><span>No. Every company and person in the game is made up.</span></div>
    <div><b>What data do you keep?</b><span>Guest play keeps progress on the device. If a player signs up, their name, email and progress are stored in DCI&rsquo;s Airtable. DCI sends program emails only to people who say yes. Players can delete their data in the game.</span></div>
    <div><b>What can DCI measure?</b><span>For signed-up players: shifts played and won, stars, and how many risky plans they caught, wrongly blocked, or missed, by pathway.</span></div>
    <div><b>Is it finished?</b><span>It is in testing. All five pathways are playable, and we are collecting feedback.</span></div>
    <div><b>Can I try it now?</b><span>Yes. Scan the code on page 1, or type {SHOW_URL}.</span></div>
  </div>
  <h2>If something goes wrong</h2>
  <ul class="wrong">
    <li><b>The page does not load.</b> Refresh. Switch between Wi-Fi and mobile data. Or use another device.</li>
    <li><b>A login page appears instead of the game.</b> Do not sign in. It means the address is not open to the public yet. Stop and check before you present.</li>
    <li><b>You are short on time.</b> Tap <b>Menu</b>, then <b>Skip practice</b>, to go straight to the real shift.</li>
    <li><b>You want to replay the opening.</b> Tap <b>Menu</b>, then <b>Replay intro</b>.</li>
  </ul>
  <div class="after"><b>After the demo:</b> Ask people to try it on their own phone. Their notes come to DCI through <b>Menu</b>, then <b>Send feedback</b>. No name or email is asked for.</div>
  <div class="foot"><span>Human Loop &middot; DCI Resources LLC &middot; {SHOW_URL}</span><span>3 of 3</span></div>
</section>
</body></html>"""
(BUILD / "kit.html").write_text(HTML, encoding="utf-8")
print("wrote", BUILD / "kit.html", len(HTML), "bytes")
