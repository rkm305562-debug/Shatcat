/* ================================================
   ChatCat — Friends (friends.js)
   ================================================ */

'use strict';

const Friends = {
  currentUser: null, suggestions: [], currentIndex: 0,

  init() {
    this.currentUser = CC.requireAuth();
    if (!this.currentUser) return;
    this.loadSuggestions();
    this.renderStack();
  },

  loadSuggestions() { this.suggestions = Auth.getFriendSuggestions(); this.currentIndex = 0; },

  renderStack() {
    const container = CC.$('#friends-stack');
    if (!container) return;
    const remaining = this.suggestions.slice(this.currentIndex);

    if (remaining.length === 0) {
      container.innerHTML = `
        <div class="friends-done">
          <div class="done-emoji">🎉</div>
          <h3>انتهيت من الجميع!</h3>
          <p style="margin-top:8px;">لا توجد اقتراحات حالياً. تحقق لاحقاً!</p>
          <button class="btn btn-ghost mt-16" id="reset-suggestions-btn">🔄 ابدأ من جديد</button>
        </div>`;
      CC.$('#reset-suggestions-btn')?.addEventListener('click', () => this.resetSuggestions());
      return;
    }

    container.innerHTML = '';
    const toShow = remaining.slice(0, 3);
    for (let i = Math.min(toShow.length - 1, 2); i >= 1; i--) {
      container.appendChild(this.buildCard(toShow[i], false));
    }
    if (toShow.length > 0) container.appendChild(this.buildCard(toShow[0], true));
  },

  buildCard(user, isTop) {
    const online = CC.isOnline(user.id);
    const card = CC.el('div', { className:'friend-card' });

    const avWrap = CC.el('div', { className:'avatar-wrapper fc-avatar' });
    avWrap.appendChild(CC.el('div', { className:`avatar avatar-xl${online?' online':''}`, textContent:user.avatar }));
    avWrap.appendChild(CC.el('div', { className:`online-dot${online?'':' offline'}` }));

    const name = CC.el('h3', { textContent:user.username });
    const ageEl = CC.el('div', { className:'fc-age', textContent:`العمر ${user.age}` });
    const status = CC.el('div', { className:'badge badge-'+(online?'success':'muted'), style:'margin-top:4px;', textContent: online?'🟢 متصل':'⚫ غير متصل' });
    const bio = CC.el('p', { style:'font-size:0.88rem;color:var(--text-muted);text-align:center;line-height:1.5;', textContent: user.bio || 'لا توجد نبذة.' });

    card.appendChild(avWrap);
    card.appendChild(name);
    card.appendChild(ageEl);
    card.appendChild(status);
    card.appendChild(bio);

    if (isTop) {
      const actions = CC.el('div', { className:'friend-card-actions' });
      const skipBtn = CC.el('button', { className:'fc-action-btn skip', innerHTML:'✕', title:'تخطي' });
      skipBtn.addEventListener('click', (e) => { e.stopPropagation(); this.doSkip(user.id, card); });
      const addBtn = CC.el('button', { className:'fc-action-btn add', innerHTML:'✓', title:'إضافة صديق' });
      addBtn.addEventListener('click', (e) => { e.stopPropagation(); this.doAdd(user.id, card); });
      actions.appendChild(skipBtn);
      actions.appendChild(addBtn);
      card.appendChild(actions);
    }
    return card;
  },

  doAdd(userId, cardEl) {
    Auth.addFriend(userId);
    CC.showToast('تمت إضافة الصديق! 🎉', 'success');
    this.animateCard(cardEl, 'right', () => { this.currentIndex++; this.renderStack(); });
  },

  doSkip(userId, cardEl) {
    Auth.skipUser(userId);
    this.animateCard(cardEl, 'left', () => { this.currentIndex++; this.renderStack(); });
  },

  animateCard(cardEl, direction, cb) {
    cardEl.classList.add(direction === 'right' ? 'swipe-right' : 'swipe-left');
    setTimeout(cb, 380);
  },

  resetSuggestions() {
    const skipped = CC.Storage.get(CC.KEYS.SKIPPED, {});
    if (this.currentUser) delete skipped[this.currentUser.id];
    CC.Storage.set(CC.KEYS.SKIPPED, skipped);
    this.loadSuggestions();
    this.renderStack();
  },
};

if (document.getElementById('friends-page')) {
  document.addEventListener('DOMContentLoaded', () => Friends.init());
}
window.Friends = Friends;
