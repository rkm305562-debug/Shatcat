/* ================================================
   ChatCat — Chat (chat.js)
   ================================================ */

'use strict';

const Chat = {
  currentUser: null, replyingTo: null, editingId: null,
  typingTimer: null, refreshTimer: null, lastMessageCount: 0, searchQuery: '',

  init() {
    this.currentUser = CC.requireAuth();
    if (!this.currentUser) return;
    this.renderMessages();
    this.setupInput();
    this.setupSearch();
    this.startPolling();
    this.scrollToBottom();

    if (this.currentUser.isMuted) {
      const b = CC.$('#status-banner');
      if (b) { b.className='status-banner muted'; b.innerHTML='🔇 أنت مكتوم. لا يمكنك إرسال رسائل.'; b.style.display='flex'; }
    }
    if (this.currentUser.isBanned) {
      const b = CC.$('#status-banner');
      if (b) { b.className='status-banner banned'; b.innerHTML='🚫 تم حظر حسابك.'; b.style.display='flex'; }
      CC.$('#chat-input-area')?.classList.add('hidden');
    }
  },

  getMessages() { return CC.Storage.get(CC.KEYS.MESSAGES, []); },

  getFilteredMessages() {
    const msgs = this.getMessages();
    if (!this.searchQuery) return msgs;
    const q = this.searchQuery.toLowerCase();
    return msgs.filter(m => !m.isDeleted && m.text.toLowerCase().includes(q));
  },

  renderMessages(preserve = false) {
    const container = CC.$('#chat-messages');
    if (!container) return;
    const messages = this.getFilteredMessages();
    const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 80;
    if (preserve && messages.length === this.lastMessageCount) return;
    this.lastMessageCount = messages.length;
    container.innerHTML = '';

    if (messages.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">💬</div><h3>لا توجد رسائل بعد</h3><p>كن أول من يتحدث!</p></div>';
      return;
    }

    let lastDate = '';
    messages.forEach(msg => {
      const ds = CC.formatDate(msg.timestamp);
      if (ds !== lastDate) {
        lastDate = ds;
        container.appendChild(CC.el('div', { className:'date-separator' }, CC.el('span', { textContent:ds })));
      }
      container.appendChild(this.buildMessageEl(msg));
    });

    if (!preserve || atBottom) setTimeout(() => this.scrollToBottom(), 50);
    this.renderTyping();
  },

  buildMessageEl(msg) {
    const user = Auth.getUser(msg.userId) || { username:'محذوف', avatar:'👤', id:'' };
    const isOwn = this.currentUser && msg.userId === this.currentUser.id;
    const online = CC.isOnline(user.id);
    const item = CC.el('div', { className:`message-item${isOwn?' own':''}`, id:`msg-${msg.id}` });

    const avWrap = CC.el('div', { className:'avatar-wrapper' });
    avWrap.appendChild(CC.el('div', { className:`avatar avatar-sm${online?' online':''}`, textContent:user.avatar }));
    item.appendChild(avWrap);

    const wrap = CC.el('div', { className:'message-content-wrap' });
    const header = CC.el('div', { className:'message-header' });
    header.appendChild(CC.el('span', { className:'msg-username', textContent:user.username }));
    header.appendChild(CC.el('span', { className:'msg-time', textContent:CC.formatTime(msg.timestamp) }));
    wrap.appendChild(header);

    if (msg.replyTo) {
      const quoted = this.getMessages().find(m => m.id === msg.replyTo);
      if (quoted) {
        const qUser = Auth.getUser(quoted.userId);
        const rq = CC.el('div', { className:'reply-quote' });
        rq.innerHTML = `<span class="reply-username">↩ ${qUser?.username||'مستخدم'}</span>${quoted.isDeleted?'<i>تم حذف الرسالة</i>':this.escapeHtml(quoted.text.slice(0,80))}`;
        rq.addEventListener('click', () => {
          const t = CC.$(`#msg-${msg.replyTo}`);
          t?.scrollIntoView({ behavior:'smooth', block:'center' });
          t?.classList.add('highlight');
          setTimeout(() => t?.classList.remove('highlight'), 1500);
        });
        wrap.appendChild(rq);
      }
    }

    const bubble = CC.el('div', { className:'message-bubble' });
    if (msg.isDeleted) {
      bubble.innerHTML = '<span class="msg-deleted">🗑 تم حذف الرسالة</span>';
    } else {
      bubble.innerHTML = this.formatMessageText(msg.text);
      if (msg.isEdited) bubble.innerHTML += ' <span class="edited-tag">(معدّلة)</span>';
    }
    bubble.addEventListener('contextmenu', (e) => { e.preventDefault(); this.showContextMenu(e, msg, isOwn); });
    wrap.appendChild(bubble);

    if (!msg.isDeleted) {
      const actions = CC.el('div', { className:'message-actions' });
      actions.appendChild(CC.el('button', { className:'msg-action-btn', innerHTML:'↩ رد', onClick:()=>this.setReply(msg) }));
      const isLiked = this.currentUser && (msg.likes||[]).includes(this.currentUser.id);
      actions.appendChild(CC.el('button', { className:`msg-action-btn${isLiked?' liked':''}`, innerHTML:`❤ ${msg.likes?.length||0}`, onClick:()=>this.toggleLike(msg.id) }));
      if (isOwn) {
        actions.appendChild(CC.el('button', { className:'msg-action-btn', innerHTML:'✏', onClick:()=>this.startEdit(msg) }));
        actions.appendChild(CC.el('button', { className:'msg-action-btn', innerHTML:'🗑', onClick:()=>this.deleteMessage(msg.id) }));
      }
      wrap.appendChild(actions);
    }

    item.appendChild(wrap);
    return item;
  },

  formatMessageText(text) {
    return this.escapeHtml(text).replace(/\n/g,'<br>').replace(/(https?:\/\/[^\s<>"]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>');
  },
  escapeHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); },

  sendMessage(text) {
    text = text.trim();
    if (!text) return;
    if (this.currentUser.isMuted || this.currentUser.isBanned) { CC.showToast('لا يمكنك إرسال رسائل.','error'); return; }

    if (this.editingId) {
      const msgs = this.getMessages();
      const idx = msgs.findIndex(m => m.id === this.editingId);
      if (idx !== -1) { msgs[idx].text = text; msgs[idx].isEdited = true; CC.Storage.set(CC.KEYS.MESSAGES, msgs); }
      this.editingId = null;
      CC.$('#chat-input').value = '';
      const sb = CC.$('#send-btn'); if (sb) sb.innerHTML = '➤';
      this.cancelReply();
      this.renderMessages();
      return;
    }

    const msg = {
      id: CC.generateId(), userId: this.currentUser.id, text,
      timestamp: Date.now(), likes: [], replyTo: this.replyingTo ? this.replyingTo.id : null,
      isEdited: false, isDeleted: false,
    };
    const msgs = this.getMessages();
    msgs.push(msg);
    CC.Storage.set(CC.KEYS.MESSAGES, msgs);
    CC.$('#chat-input').value = '';
    this.cancelReply();
    this.clearTyping();
    this.renderMessages();
    this.scrollToBottom();
  },

  deleteMessage(id) {
    if (!confirm('حذف هذه الرسالة؟')) return;
    const msgs = this.getMessages();
    const idx = msgs.findIndex(m => m.id === id);
    if (idx !== -1) { msgs[idx].isDeleted = true; msgs[idx].text = ''; CC.Storage.set(CC.KEYS.MESSAGES, msgs); this.renderMessages(); }
  },

  adminDeleteMessage(id) {
    const msgs = this.getMessages();
    const idx = msgs.findIndex(m => m.id === id);
    if (idx !== -1) { msgs[idx].isDeleted = true; msgs[idx].text = ''; CC.Storage.set(CC.KEYS.MESSAGES, msgs); this.renderMessages(); }
  },

  toggleLike(id) {
    if (!this.currentUser) return;
    const msgs = this.getMessages();
    const idx = msgs.findIndex(m => m.id === id);
    if (idx === -1) return;
    const likes = msgs[idx].likes || [];
    const mi = likes.indexOf(this.currentUser.id);
    if (mi === -1) likes.push(this.currentUser.id); else likes.splice(mi, 1);
    msgs[idx].likes = likes;
    CC.Storage.set(CC.KEYS.MESSAGES, msgs);
    this.renderMessages(false);
  },

  setReply(msg) {
    this.replyingTo = msg;
    const user = Auth.getUser(msg.userId);
    const banner = CC.$('#reply-banner');
    if (banner) {
      banner.classList.add('visible');
      const info = CC.$('#reply-banner-info');
      if (info) info.innerHTML = `الرد على <strong>${user?.username||'مستخدم'}</strong>: ${this.escapeHtml(msg.text.slice(0,60))}`;
    }
    CC.$('#chat-input')?.focus();
  },

  cancelReply() {
    this.replyingTo = null;
    const banner = CC.$('#reply-banner');
    if (banner) banner.classList.remove('visible');
  },

  startEdit(msg) {
    this.editingId = msg.id;
    this.cancelReply();
    const input = CC.$('#chat-input');
    if (input) { input.value = msg.text; input.focus(); }
    const sb = CC.$('#send-btn'); if (sb) sb.innerHTML = '✓';
    const banner = CC.$('#reply-banner');
    if (banner) { banner.classList.add('visible'); const info = CC.$('#reply-banner-info'); if (info) info.innerHTML = '<strong>تعديل الرسالة</strong>'; }
  },

  showContextMenu(e, msg, isOwn) {
    CC.$$('.context-menu').forEach(m => m.remove());
    const menu = CC.el('div', { className:'context-menu' });
    const items = [
      { label:'↩ رد', action:()=>this.setReply(msg) },
      { label:'❤ إعجاب', action:()=>this.toggleLike(msg.id) },
    ];
    if (isOwn && !msg.isDeleted) {
      items.push({ label:'✏ تعديل', action:()=>this.startEdit(msg) });
      items.push({ label:'🗑 حذف', action:()=>this.deleteMessage(msg.id), danger:true });
    }
    if (this.currentUser?.isAdmin && !msg.isDeleted) {
      items.push({ label:'⚡ حذف إداري', action:()=>this.adminDeleteMessage(msg.id), danger:true });
    }
    items.forEach(item => {
      menu.appendChild(CC.el('div', { className:`context-menu-item${item.danger?' danger':''}`, textContent:item.label, onClick:()=>{ item.action(); menu.remove(); } }));
    });
    menu.style.left = Math.min(e.clientX, window.innerWidth-180)+'px';
    menu.style.top = Math.min(e.clientY, window.innerHeight-200)+'px';
    document.body.appendChild(menu);
    e.stopPropagation();
  },

  setTyping() {
    if (!this.currentUser) return;
    const typing = CC.Storage.get(CC.KEYS.TYPING, {});
    typing[this.currentUser.id] = { name: this.currentUser.username, ts: Date.now() };
    CC.Storage.set(CC.KEYS.TYPING, typing);
    clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => this.clearTyping(), 3000);
  },
  clearTyping() {
    if (!this.currentUser) return;
    const typing = CC.Storage.get(CC.KEYS.TYPING, {});
    delete typing[this.currentUser.id];
    CC.Storage.set(CC.KEYS.TYPING, typing);
  },
  renderTyping() {
    const el = CC.$('#typing-indicator');
    if (!el) return;
    const typing = CC.Storage.get(CC.KEYS.TYPING, {});
    const cutoff = Date.now() - 4000;
    const typers = Object.entries(typing).filter(([id,v]) => v.ts > cutoff && id !== this.currentUser?.id).map(([,v]) => v.name);
    if (typers.length === 0) { el.innerHTML = ''; return; }
    const text = typers.length === 1 ? `${typers[0]} يكتب الآن` : `${typers.slice(0,-1).join('، ')} و${typers.at(-1)} يكتبون الآن`;
    el.innerHTML = `<div class="typing-dots"><span></span><span></span><span></span></div><span>${text}…</span>`;
  },

  setupInput() {
    const input = CC.$('#chat-input');
    const sendBtn = CC.$('#send-btn');
    const emojiBtn = CC.$('#emoji-btn');
    const cancelReplyBtn = CC.$('#cancel-reply');
    if (!input) return;

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendMessage(input.value); }
      else { this.setTyping(); }
    });
    sendBtn?.addEventListener('click', () => this.sendMessage(input.value));
    cancelReplyBtn?.addEventListener('click', () => {
      this.cancelReply();
      this.editingId = null;
      input.value = '';
      const sb = CC.$('#send-btn'); if (sb) sb.innerHTML = '➤';
    });

    emojiBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      CC.$('#emoji-picker')?.classList.toggle('visible');
    });

    const picker = CC.$('#emoji-picker');
    if (picker) {
      const grid = CC.el('div', { className:'emoji-grid' });
      CC.EMOJI_LIST.forEach(emoji => {
        const span = CC.el('span', { textContent:emoji });
        span.addEventListener('click', (e) => {
          e.stopPropagation();
          input.value += emoji;
          input.focus();
          picker.classList.remove('visible');
        });
        grid.appendChild(span);
      });
      picker.appendChild(grid);
    }
  },

  setupSearch() {
    const input = CC.$('#chat-search');
    if (!input) return;
    let timer;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => { this.searchQuery = input.value.trim(); this.renderMessages(); }, 300);
    });
  },

  startPolling() {
    this.refreshTimer = setInterval(() => {
      this.renderMessages(true);
      this.renderTyping();
      const c = CC.getOnlineCount();
      const el = CC.$('#online-count'); if (el) el.textContent = c;
    }, 2000);
  },

  scrollToBottom() {
    const c = CC.$('#chat-messages');
    if (c) c.scrollTop = c.scrollHeight;
  },
};

if (document.getElementById('chat-page')) {
  document.addEventListener('DOMContentLoaded', () => Chat.init());
}
window.Chat = Chat;
