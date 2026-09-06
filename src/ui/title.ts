import "./title.css";

export type MenuView = "home" | "play" | "options" | "help";

export function titleScreenMarkup(arrow: string): string {
  return `<main id="title-screen" class="title-screen" aria-label="Main menu">
    <header class="menu-header"><span class="menu-edition">BURROW BRAWL <i></i> SKIRMISH 07</span><button id="menu-back" class="menu-back" hidden>${arrow} Main menu</button></header>
    <section id="menu-home" class="menu-view menu-home" aria-labelledby="title-heading">
      <div class="title-lockup"><img id="title-worm" class="title-worm" alt="" /><h1 id="title-heading"><span>BURROW</span><span>BRAWL</span></h1><p>Little worms. Big grudges.</p></div>
      <nav class="title-actions" aria-label="Main menu choices">
        <button id="play-button" class="title-play">Play ${arrow}</button>
        <button id="continue-button" class="title-choice" hidden><span>Continue</span><small id="continue-meta"></small></button>
        <button id="options-button" class="title-choice">Options</button>
        <button id="start-help" class="title-choice">How to play</button>
      </nav>
      <p id="save-status" class="menu-notice" role="status"></p>
    </section>
    <section id="menu-play" class="menu-view menu-page" aria-labelledby="menu-play-title" hidden>
      <div class="menu-page-heading"><span class="menu-kicker">PICK YOUR BATTLE</span><h2 id="menu-play-title" tabindex="-1">Let's make a mess.</h2><p>Three of yours against three of theirs. One field to settle it.</p></div>
      <form id="match-form" class="menu-setup">
        <div class="setup-fields"><label for="theme-input">Scenery<select id="theme-input"><option value="garden">Moonlit garden</option><option value="canyon">Copper canyon</option><option value="frost">Frost hollow</option></select></label><div><label for="seed-input">Battlefield seed</label><div class="seed-control"><input id="seed-input" inputmode="numeric" type="number" min="1" max="999999" step="1" required value="41823" /><button type="button" id="shuffle-seed" class="shuffle-button" aria-label="Shuffle battlefield seed">Shuffle ↻</button></div></div></div>
        <p class="setup-note">A new seed makes a new battlefield. Keep it to play the same map again.</p>
        <details class="crew-customization"><summary>Name your crews <span>Optional</span></summary><div class="crew-fields"><fieldset><legend>The Root Crew</legend><div class="name-grid" id="crew-names"></div></fieldset><fieldset><legend>The Night Shift</legend><div class="name-grid" id="rival-names"></div></fieldset></div></details>
        <div class="setup-actions"><button type="submit" class="title-play" id="start-button">Start skirmish ${arrow}</button><button type="button" class="practice-choice" id="practice-button"><span>Practice range</span><small>No timer. Unlimited kit. Take your time.</small></button></div>
        <p id="new-match-note" class="setup-note">Skirmishes save at the start of your turn. Practice keeps your saved match.</p>
      </form>
    </section>
    <section id="menu-options" class="menu-view menu-page menu-options" aria-labelledby="menu-options-title" hidden><div class="menu-page-heading"><span class="menu-kicker">MAKE YOURSELF COMFORTABLE</span><h2 id="menu-options-title" tabindex="-1">Options</h2><p>Sound, motion and keyboard controls.</p></div><div id="menu-options-body"></div><p class="setup-note options-saved">Changes save automatically on this browser.</p></section>
    <section id="menu-help" class="menu-view menu-page menu-help" aria-labelledby="help-title" hidden><div id="menu-help-body"></div></section>
    <footer class="menu-footer"><span>3 VS 3 <i></i> SINGLE PLAYER</span><a href="/credits.html" target="_blank" rel="noopener">Credits & acknowledgements ${arrow}</a></footer>
  </main>`;
}
