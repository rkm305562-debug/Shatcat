/* ================================================
   ChatCat — Members (members.js)
   ================================================ */

'use strict';

const Members = {
  currentUser: null, allUsers: [], searchQuery: '',

  init() {
    this.currentUser = CC.requireAuth();
    if (!this.currentUser) return;
    this.loadUsers();
    this.setupSearch();
    this.renderMembers();
    setInterval(() => this.renderMembers(), 10000);
  },

  loadUsers() { this.allUsers = Auth.getAllUsers().filter(u => !u.isAdmin); },

  getFilteredUsers() {
    const q = this.searchQuery.toLowerCase();
    let users = [...this.allUsers];
    if (q) {
      users = users.filter(u =>
        u.username.toLowerCase().includes(q) ||
        (u.bio||'').toLowerCase().includes(q) ||
        (u.country||'').toLowerCase().includes(q)
      );
    }
    users.sort((a,b) => {
      const ao = CC.isOnline(a.id), bo = CC.isOnline(b.id);
      if (ao && !bo) return -1;
      if (!ao && bo) return 1;
      return (b.lastSeen||0) - (a.lastSeen||0);
    });
    return users;
  },

  renderMembers() {
    this.loadUsers();
    const container = CC.$('#members-list');
    if (!container) return;
    const users = this.getFilteredUsers();
    const countEl = CC.$('#online-count');
    if (countEl) countEl.textContent = CC.getOnlineCount();

    if (users.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><h3>لا يوجد أعضاء</h3><p>جرّب بحثاً آخر</p></div>';
      return;
    }

    const scrollTop = container.scrollTop;
    container.innerHTML = '';
    let lastSection = '';

    users.forEach(user => {
      const online = CC.isOnline(user.id);
      const section = online ? 'متصل' : 'غير متصل';
      if (section !== lastSection) {
        lastSection = section;
        container.appendChild(CC.el('div', { className:'section-title', style:'padding:10px 16px 4px;', innerHTML:`${section==='متصل'?'🟢':'⚫'} ${section}` }));
      }
      container.appendChild(this.buildMemberItem(user, online));
    });
    container.scrollTop = scrollTop;
  },

  buildMemberItem(user, online) {
    const isMe = user.id === this.currentUser.id;
    const isFollowing = Auth.isFollowing(user.id);
    const item = CC.el('div', { className:'member-item' });

    const avWrap = CC.el('div', { className:'avatar-wrapper' });
    avWrap.appendChild(CC.el('div', { className:`avatar avatar-md${online?' online':''}`, textContent:user.avatar }));
    avWrap.appendChild(CC.el('div', { className:`online-dot sm${online?'':' offline'}` }));

    const info = CC.el('div', { className:'member-info' });
    const nameRow = CC.el('div', { style:'display:flex;align-items:center;gap:6px;' });
    nameRow.appendChild(CC.el('h4', { textContent:user.username }));
    if (isMe) nameRow.appendChild(CC.el('span', { className:'badge badge-primary', style:'font-size:0.65rem;padding:2px 6px;', textContent:'أنت' }));
    info.appendChild(nameRow);
    info.appendChild(CC.el('p', { textContent: online?'متصل':`آخر ظهور ${CC.timeAgo(user.lastSeen||user.joinDate)}` }));

    const actions = CC.el('div', { style:'display:flex;gap:6px;align-items:center;' });
    if (!isMe) {
      const fb = CC.el('button', { className:`follow-btn ${isFollowing?'following':'follow'}`, textContent: isFollowing?'يتابع':'متابعة' });
      fb.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isFollowing) Auth.unfollow(user.id); else Auth.follow(user.id);
        this.currentUser = Auth.getCurrentUser();
        this.renderMembers();
      });
      actions.appendChild(fb);
    }

    item.appendChild(avWrap);
    item.appendChild(info);
    item.appendChild(actions);
    item.addEventListener('click', () => {
      CC.Storage.set('cc_view_profile', user.id);
      CC.navigate('profile.html');
    });
    return item;
  },

  setupSearch() {
    const input = CC.$('#members-search');
    if (!input) return;
    let timer;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => { this.searchQuery = input.value.trim(); this.renderMembers(); }, 300);
    });
  },
};

if (document.getElementById('members-page')) {
  document.addEventListener('DOMContentLoaded', () => Members.init());
}
window.Members = Members;
