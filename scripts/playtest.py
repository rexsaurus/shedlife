"""Headless playthrough with screenshots. Usage: npm run dev (background), then python3 scripts/playtest.py [outdir]"""
import sys, time, os
from playwright.sync_api import sync_playwright
out = sys.argv[1] if len(sys.argv) > 1 else "out"; os.makedirs(out, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 1600, "height": 950})
    errors = []; pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(os.environ.get("URL", "http://127.0.0.1:5173/")); pg.wait_for_selector("#go", timeout=30000)
    pg.screenshot(path=f"{out}/0-intro.png"); pg.click("#go")
    pg.evaluate("""() => { const s = window.__shedlife; s.placeItem('tiny', -60, 0, 0); s.placeItem('septic', 0, 0, 0); s.placeItem('well', 55, 20, 0); s.placeItem('shed10x12', -60, 25, 0); }""")
    for q in ["zoning", "cad"]:
        pg.click(f".q[data-q={q}]"); pg.click("#send"); time.sleep(0.3); pg.click("#skip"); time.sleep(5)
    pg.click(".th[data-npc=permitting]"); time.sleep(1)
    pg.screenshot(path=f"{out}/1-play.png")
    state = pg.evaluate("() => ({ day: __shedlife.g.day, budget: __shedlife.g.budget, done: Object.entries(__shedlife.g.quests).filter(([k, v]) => v === 'done').map(([k]) => k), violations: __shedlife.g.plan.eval.violations.length })")
    print(state); b.close()
    if errors: print("PAGE ERRORS:", errors); sys.exit(1)
    assert set(["zoning", "cad"]) <= set(state["done"]), state
