import moment from 'moment-timezone';

export default class App {
  constructor() {
    this.username = null;
    this.messageCount = 0;
  }

  init() {
    this.initListeners();
  }

  initListeners() {
    this.continueBtnOnclick();
    App.clipButtonListener();
    this.chatScrollListener();
  }

  continueBtnOnclick() {
    const continueBtn = document.getElementById('continue-btn');
    const input = document.getElementById('main-form-input');
    const mainContainer = document.querySelector('.main_container');
    continueBtn.addEventListener('click', async () => {
      this.username = input.value;
      if (await this.checkUsernameValidity()) {
        mainContainer.classList.remove('hidden');
        input.closest('.main_form').classList.add('hidden');
        this.connectWS();
        this.startRenderInterval();
      } else {
        App.showLoginError();
      }
    });
  }

  connectWS() {
    const ws = new WebSocket('wss://corpchat-be.herokuapp.com/chat');
    this.onMessageType(ws);
    this.imageUploadListener(ws);
    this.dragEventListener(ws);
    ws.addEventListener('message', (evt) => {
      this.renderMessage(evt.data);
      App.scrollChat();
    });
    ws.addEventListener('open', async () => {
      const msg = { username: this.username };
      ws.send(JSON.stringify(msg));
      await this.renderSomeMessages();
      App.scrollChat();
    });
  }

  renderUserList(users) {
    const list = document.querySelector('.user_list');
    list.innerHTML = '';
    users.forEach((e) => {
      if (e.username === this.username) {
        list.innerHTML += `
        <div class="user_self">
          <div class="avatar"></div>
          <span class="user_name">${e.username}</span>
        </div>
      `;
      } else {
        list.innerHTML += `
        <div class="user">
          <div class="avatar"></div>
          <span class="user_name">${e.username}</span>
        </div>
      `;
      }
    });
  }

  renderMessage(data) {
    const parsed = JSON.parse(data);
    const chat = document.querySelector('.chat');
    if (!parsed.message || !parsed.date) return;
    const message = document.createElement('div');
    const nameAndDate = document.createElement('span');
    if (this.username === parsed.username) {
      message.className = 'message_self';
    } else {
      message.className = 'message';
    }
    nameAndDate.className = 'name_and_date';
    nameAndDate.innerText = `${parsed.username}, ${parsed.date}`;
    message.append(nameAndDate);
    App.getMultimediaElement(message, parsed);
    chat.append(message);
    this.messageCount += 1;
  }

  static getMultimediaElement(message, parsed) {
    if (parsed.type === 'image') {
      const messageImage = document.createElement('img');
      messageImage.className = 'message_image';
      messageImage.src = parsed.message;
      message.append(messageImage);
    }
    if (parsed.type === 'text' && parsed.message.startsWith('http')) {
      const messageText = document.createElement('a');
      messageText.innerText = parsed.message;
      messageText.href = parsed.message;
      message.append(messageText);
    } else if (parsed.type === 'text') {
      const messageText = document.createElement('span');
      messageText.className = 'message_text';
      messageText.innerText = parsed.message;
      message.append(messageText);
    } else if (parsed.type === 'audio') {
      const audio = document.createElement('audio');
      audio.src = parsed.message;
      audio.controls = true;
      message.append(audio);
    }
    return null;
  }

  async renderSomeMessages() {
    const count = this.messageCount + 10;
    const rawData = await fetch(`https://corpchat-be.herokuapp.com/lazy/${count}`);
    const data = await rawData.json();
    if (this.messageCount >= data.length) return;
    this.clearChat();
    data.forEach((x) => {
      this.renderMessage(x);
    });
    App.scrollChat(1);
  }

  startRenderInterval() {
    setTimeout(async () => {
      const rawResponse = await fetch('https://corpchat-be.herokuapp.com/connections');
      const response = await rawResponse.json();
      if (response.length) this.renderUserList(response);
    }, 500);
    this.interval = setInterval(async () => {
      const rawResponse = await fetch('https://corpchat-be.herokuapp.com/connections');
      const response = await rawResponse.json();
      this.renderUserList(response);
    }, 2000);
  }

  async checkUsernameValidity() {
    const rawResponse = await fetch('https://corpchat-be.herokuapp.com/connections');
    this.clients = await rawResponse.json();
    if (this.clients.find((x) => x.username === this.username)) {
      return false;
    }
    return true;
  }

  onMessageType(ws) {
    const input = document.getElementById('send-message');
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const date = moment.tz('Europe/Moscow').format('kk:mm DD.MM.YYYY');
        const obj = {
          type: 'text',
          username: this.username,
          message: input.value,
          date,
        };
        ws.send(JSON.stringify(obj));
        input.value = '';
      }
    });
  }

  static showLoginError() {
    const errorMsg = document.querySelector('.error_message');
    if (errorMsg.classList.contains('shake')) {
      errorMsg.classList.remove('fade');
      errorMsg.style.animation = 'none';
      setTimeout(() => {
        errorMsg.style.animation = '';
      }, 10);
      this.errorTimeout = setTimeout(() => {
        errorMsg.classList.add('fade');
      }, 2000);
    } else {
      errorMsg.classList.remove('invisible');
      errorMsg.classList.add('shake');
      this.errorTimeout = setTimeout(() => {
        errorMsg.classList.add('fade');
      }, 2000);
    }
  }

  static clipButtonListener() {
    const fileManager = document.getElementById('file-manager');
    const blackout = document.getElementById('blackout');
    const clip = document.getElementById('clip');
    clip.addEventListener('click', () => {
      fileManager.classList.remove('hidden');
      blackout.classList.remove('hidden');
    });
    blackout.addEventListener('click', () => {
      fileManager.classList.add('hidden');
      blackout.classList.add('hidden');
    });
  }

  readFile(ws, file) {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      const fileType = App.getFileType(file.name);
      if (fileType === null) return;
      const date = moment.tz('Europe/Moscow').format('kk:mm DD.MM.YYYY');
      const msg = {
        type: fileType,
        message: reader.result,
        username: this.username,
        date,
      };
      ws.send(JSON.stringify(msg));
    });
    reader.readAsDataURL(file);
  }

  imageUploadListener(ws) {
    const input = document.getElementById('chat-file');
    const fileManager = document.getElementById('file-manager');
    const blackout = document.getElementById('blackout');
    input.addEventListener('input', () => {
      this.readFile(ws, input.files[0]);
      input.value = '';
      fileManager.classList.add('hidden');
      blackout.classList.add('hidden');
    });
  }

  dragEventListener(ws) {
    const droparea = document.getElementById('droparea');
    const fileManager = document.getElementById('file-manager');
    const blackout = document.getElementById('blackout');
    droparea.addEventListener('dragover', (evt) => {
      evt.preventDefault();
      droparea.style.borderColor = '#0f0';
    });
    droparea.addEventListener('dragleave', () => {
      droparea.style.borderColor = '#616161';
    });
    droparea.addEventListener('drop', (evt) => {
      evt.preventDefault();
      droparea.style.borderColor = '#616161';
      this.readFile(ws, evt.dataTransfer.files[0]);
      fileManager.classList.add('hidden');
      blackout.classList.add('hidden');
    });
  }

  chatScrollListener() {
    const chat = document.querySelector('.chat');
    chat.addEventListener('scroll', () => {
      const top = chat.scrollTop;
      const pos = chat.scrollHeight - chat.clientHeight;
      const curr = top / pos;
      if (curr === 0) {
        this.renderSomeMessages();
      }
    });
  }

  static scrollChat(num) {
    const chat = document.querySelector('.chat');
    chat.scrollBy(0, num || chat.scrollHeight);
  }

  clearChat() {
    const chat = document.querySelector('.chat');
    chat.innerHTML = '';
    this.messageCount = 0;
  }

  static getFileType(fileName) {
    if (fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) return 'image';
    if (fileName.endsWith('.mp3') || fileName.endsWith('.wav') || fileName.endsWith('.webm')) return 'audio';
    if (fileName.endsWith('.mp4')) return 'video';
    return null;
  }
}