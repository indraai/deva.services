function buildProfile(profile, type='assistant') {
  const _profile = [];
  _profile.push(`::begin:${type}`);
  for (let x in profile) {
    _profile.push(`${x}: ${profile[x]}`);
  }
  _profile.push(`::end:${type}\n`);
  return _profile.join('\n');
}
module.exports = {
  /**************
  method: service
  params: packet
  describe: The global service feature that installs with every agent
  ***************/
  services(packet) {
    this.context('feature');
    const services = this.services();
    const data = {};
    return new Promise((resolve, reject) => {
      this.question(`#docs raw feature/services`).then(doc => {
        data.doc = doc.a.data;
        const info = [
          `## Settings`,
          `::begin:services:${services.id}`,
          `client: ${services.client_name}`,
          `concerns: ${services.concerns.join(', ')}`,
          `::end:services:${this.hash(services)}`,
        ].join('\n');
        const text = doc.a.text.replace(/::info::/g, info)
        return this.question(`#feecting parse ${text}`)
      }).then(feecting => {
        return this.finish({
          text: feecting.a.text,
          html: feecting.a.html,
          data: services
        }, resolve);
      }).catch(err => {
        return this.error(err, packet, reject);
      })
    });
  },
  comment(packet) {
    return new Promise((resolve, reject) => {
      if (!this.vars.comment) return resolve('NO COMMENT');
      const agent = this.agent();
      const profile = buildProfile(agent.profile);
      const data = {};
      const text = [];

      const msg = [
        `${packet.q.text}`,
        `important: Respond in ${this.vars.comment.words} words or less.`,
      ].join('\n');

      this.question(`${this.askChr}docs view devas/${agent.key}:corpus`).then(corpus => {
        data.corpus = corpus.a.data;

        return this.question(`${this.askChr}open relay ${msg}`, {
          model: agent.model || false,
          profile,
          corpus: corpus.a.text,
          max_tokens: this.vars.comment.max_tokens,
          history: this.vars.comment.history.slice(-10),
        });
      }).then(chat => {
        data.chat = chat.a.data.chat;
        text.push(chat.a.data.parsed);
        this.vars.comment.history.push({
          role: chat.a.data.chat.role,
          content: chat.a.data.chat.text,
        });
        return this.question(`${this.askChr}youtube commentWrite:${this.vars.comment.profile} ${chat.a.text}`);
      }).then(youtube => {
        data.youtube = youtube.a.data;
        text.push(youtube.a.text);

        return this.question(`${this.askChr}feecting parse ${text.join('\n')}`);
      }).then(feecting => {
        return resolve({
          text: feecting.a.text,
          html: feecting.a.html,
          data,
        });
      }).catch(err => {
        console.log('THERE WAS AN ERROR', err);
        return this.error(packet, err, reject);
      });
    });
  },

  /**************
  method: ask
  params: packet
  describe: this method provides a global ask method to all agents.
  ***************/
  'ask'(packet) {
    this.context('ask', packet.q.agent.name);
    this.action('feature', 'ask');
    return new Promise((resolve, reject) => {
      if (!this.vars.ask) return resolve('NO ASK');
      const askAgent = packet.q.meta.params[1] ? false : true;
      const text = [];
      const data = {};
      const agent = this.agent();
      const client = this.client();
      const info = this.info();

      this.state('set', 'message');
      const msg = [
        `::begin:user:${client.id}`,
        `id: ${client.id}`,
        `name: ${client.profile.nickname}`,
        `fullname: ${client.profile.name}`,
        `date: ${this.formatDate(Date.now(), 'long', true)}`,
        `::end:user`,
        packet.q.text,
      ].join('\n');

      // get the agent main help file for teir corpus.
      this.state('get', 'ask:help');
      this.help('main', info.dir).then(corpus => {
        this.action('parse', 'ask:corpus');
        return this.question(`${this.askChr}feecting parse ${corpus}`);
      }).then(doc => {
        data.corpus = doc.a.data;
        this.state('get', 'ask:chat');
        return this.question(`${this.askChr}open relay ${msg}`, {
          model: agent.model || false,
          user: buildProfile(client.profile, 'user'),
          corpus: doc.a.text,
          max_tokens: this.vars.ask.max_tokens,
          history: this.vars.ask.history.slice(-10),
          memory: agent.key,
          askAgent,
        });
      }).then(chat => {

        text.push(`::begin:${agent.key}:${chat.id}`);
        text.push(chat.a.data.parsed);
        if (chat.a.text) {
          text.push('::begin:buttons');
          text.push(`button[🗣️ Speak]:${this.askChr}${agent.key} speak ${encodeURI(chat.a.text)}`);
          text.push(`button[🎨 Art]:${this.askChr}${agent.key} art ${encodeURI(chat.a.text)}`);
          text.push('::end:buttons');
        }
        text.push(`::end:${agent.key}:${chat.hash}`);

        // memory event
        this.talk('data:memory', {
          id: chat.a.data.chat.id,
          client,
          agent,
          q: packet.q.text,
          a: chat.a.data.chat.text,
          created: Date.now(),
        });


        data.chat = chat.a.data.chat;

        this.state('set', 'ask:history');

        this.vars.ask.history.push({
          role: 'user',
          content: this.trimWords(chat.q.text, 100),
        });

        this.vars.ask.history.push({
          role: chat.a.data.chat.role,
          content: this.trimWords(chat.a.data.chat.text, 100),
        });

        this.state('parse', 'ask:chat');
        return this.question(`${this.askChr}feecting parse ${text.join('\n')}`);
      }).then(feecting => {
        data.feecting = feecting.a.data;
        this.state('resolve', 'ask');
        return resolve({
          text: data.chat.text,
          html: feecting.a.html,
          data,
        });
      }).catch(err => {
        this.state('reject', 'ask');
        return this.error(packet, err, reject);
      });
    });
  },

  live(packet) {
    return new Promise((resolve, reject) => {
      if (!this.vars.live) return resolve('NO LIVE');

      const agent = this.agent();
      const client = this.client();
      const info = this.info();
      const profile = buildProfile(agent.profile);
      const data = {};
      let text, corpus;

      this.state('get', 'live:help');

      this.help('main', info.dir).then(help => {
        this.action('parse', 'ask:help');
        return this.question(`${this.askChr}feecting parse ${help}`);

      }).then(doc => {
        data.corpus = doc.a.data;
        corpus = doc.a.text;

        this.state('set', 'chat message');
        const msg = [
          packet.q.text,
          `important: Youtube chat has strict requirements, so please respond in ${this.vars.live.words} words or less.`,
        ].join('\n');

        this.action('get', 'open relay');

        return this.question(`${this.askChr}open relay ${msg}`, {
          model: agent.model || false,
          profile,
          corpus,
          max_tokens: this.vars.live.max_tokens,
          history: this.vars.live.history.slice(-10),
        });

      }).then(chat => {
        console.log('CHAT RESPONSE... ', JSON.stringify(chat, null, 2));
        this.state('set', 'chat data');
        data.chat = chat.a.data.chat;
        text = chat.a.data.parsed;

        this.action('talk', 'data:memory');
        // memory event
        this.talk('data:memory', {
          id: chat.a.data.chat.id,
          client,
          agent,
          q: packet.q.text,
          a: chat.a.data.chat.text,
          created: Date.now(),
        });

        this.state('set', 'history:user');
        this.vars.live.history.push({
          role: 'user',
          content: chat.q.text,
        });

        this.state('set', `history:${chat.a.data.chat.role}`);
        this.vars.live.history.push({
          role: chat.a.data.chat.role,
          content: chat.a.data.chat.text,
        });

        this.action('send', `chat:${this.vars.live.profile}`);
        return this.question(`${this.askChr}youtube chat:${this.vars.live.profile} ${chat.a.text.substr(0, 199)}`);

      }).then(youtube => {
        data.youtube = youtube.a.data;
        this.action('parse', 'Youtube response');
        return this.question(`${this.askChr}feecting parse ${text}`);

      }).then(feecting => {
        this.state('resolve', 'live');
        return resolve({
          text: feecting.a.text,
          html: feecting.a.html,
          data,
        });

      }).catch(err => {
        this.state('reject', 'live');
        console.log('LIVE ERROR', err);
        return this.error(packet, err, reject);
      });
    });
  },
  /**************
  method: livechat
  params: packet
  describe: Get the latest chats from a youtube stream and chat about it.
  ***************/
  livechat(packet) {
    return new Promise((resolve, reject) => {
      if (!this.vars.live) return resolve('NO LIVE');
      const data = {};
      this.action('get', 'Youtube chats');
      this.question(`${this.askChr}youtube chats:${this.vars.live.max_chats}:${this.vars.live.page_token}`).then(chats => {

        data.chats = chats.a.data;
        this.vars.live.page_token = chats.a.data.messages.nextPageToken;
        this.state('set', 'chat items');

        const hasItems = chats.a.data.messages.items.length ? true : false;
        const items = chats.a.data.messages.items.map(item => {
          return `@${item.authorDetails.displayName}: ${item.snippet.displayMessage}`;
        }).join('\n');

        this.state('set', 'chat message');
        const msg = ['::begin:chats'];
        if (hasItems) {
          msg.push(items);
        }
        msg.push(`${packet.q.client.profile.name}: ${packet.q.text}`);
        msg.push('::end:chats');

        this.action('get', 'open relay');

        return this.methods.live(packet);
      }).then(chat => {
        this.state('resolve', 'live');
        return resolve({
          text: chat.text,
          html: chat.html,
          data: chat.data,
        });
      }).catch(err => {
        this.state('reject', 'livechats');
        console.log('LIVEchats ERROR', err);
        return this.error(packet, err, reject);
      });
    });
  },

  /**************
  method: doc
  params: packet
  describe: send a doc to the deva.
  ***************/
  docs(packet) {
    this.action('feature', 'docs');
    return new Promise((resolve, reject) => {

      const data = {};
      const agent = this.agent();
      const profile = buildProfile(agent.profile, 'assistant');
      const client = this.client();
      const user = buildProfile(client.profile, 'user');
      const info = this.info();
      let corpus = false;

      this.state('set', 'docs:text');
      const text = [];

      this.state('get', 'docs:help');
      this.help('main', info.dir).then(corpus => {
        this.action('parse', 'docs:corpus');
        return this.question(`${this.askChr}feecting parse ${corpus}`);

      }).then(_corpus => {
        corpus = _corpus.a.text;
        data.corpus = _corpus.a.data;
        this.state('get', 'docs:document');
        return this.question(`${this.askChr}docs view ${packet.q.text}`);

      }).then(doc => {
        data.doc = doc.a.data;
        text.push(`::begin:document:${doc.id}`);
        text.push(doc.a.text);
        text.push(`::end:document:${this.hash(doc.a.text)}`);

        return this.question(`${this.askChr}open relay ${text.join('\n')}`, {
          model: agent.model || false,
          corpus,
          profile,
          user,
          max_tokens: this.vars.ask.max_tokens,
          history: this.vars.ask.history.slice(-10),
          memory: agent.key,
          askAgent: false,
        });

      }).then(chat => {
        data.chat = chat.a.data;
        this.state('parse', 'docs:chat');

        const msg = [
          chat.a.data.parsed,
          '::begin:buttons',
          `button[🗣️ Speak]:${this.askChr}${agent.key} speak ${encodeURI(chat.a.text)}`,
          `button[🎨 Art]:${this.askChr}${agent.key} art ${encodeURI(chat.a.text)}`,
          '::end:buttons',
        ].join('\n');

        return this.question(`${this.askChr}feecting parse ${msg}`);
      }).then(feecting => {
        data.feecting = feecting.a.data;
        this.state('resolve', 'docs');
        return resolve({
          text: feecting.a.text,
          html: feecting.a.html,
          data,
        });

      }).catch(err => {
        this.state('reject', 'docs');
        console.log('DOCS feature ERROR', err);
        return this.error(err, packet, reject);
      });
    });
  },

  /**************
  method: veda
  params: packet
  describe: send a veda hymn to the deva.
  ***************/
  veda(packet) {
    this.action('feature', 'hymn');
    return new Promise((resolve, reject) => {

      const data = {};
      const agent = this.agent();
      const profile = buildProfile(agent.profile, 'assistant');
      const client = this.client();
      const user = buildProfile(client.profile, 'user');
      const info = this.info();
      let corpus = false;

      this.state('get', 'agent:help');
      this.help('main', info.dir).then(corpus => {
        this.action('parse', 'docs:corpus');
        return this.question(`${this.askChr}feecting parse ${corpus}`);
      }).then(_corpus => {
        corpus = _corpus.a.text;
        data.corpus = _corpus.a.data;
        this.state('get', 'veda:hymn');
        return this.question(`${this.askChr}veda hymn ${packet.q.meta.params[1]}`);
      }).then(hymn => {
        data.hymn = hymn.a.data;
        const text = [
          hymn.a.text,
          `---`,
          `note: ${packet.q.text}`,
        ].join('\n');
        return this.question(`${this.askChr}open relay ${text}`, {
          model: agent.model || false,
          corpus,
          profile,
          user,
          max_tokens: this.vars.ask.max_tokens,
          history: this.vars.ask.history.slice(-10),
          memory: agent.key,
          askAgent: false,
        });
      }).then(chat => {
        data.chat = chat.a.data;
        this.state('parse', 'hymn:chat');
        const msg = [
          chat.a.data.parsed,
          '::begin:buttons',
          `button[🗣️ Speak]:${this.askChr}${agent.key} speak ${encodeURI(chat.a.text)}`,
          `button[🎨 Art]:${this.askChr}${agent.key} art ${encodeURI(chat.a.text)}`,
          '::end:buttons',
        ].join('\n');
        return this.question(`${this.askChr}feecting parse ${msg}`);
      }).then(feecting => {
        data.feecting = feecting.a.data;
        this.state('resolve', 'hymn');
        return resolve({
          text: feecting.a.text,
          html: feecting.a.html,
          data,
        });
      }).catch(err => {
        this.state('reject', 'hymn');
        console.log('HYMN feature ERROR', err);
        return this.error(err, packet, reject);
      });
    });
  },


  /**************
  method: speak
  params: packet
  describe: have the agent say a message
  ***************/
  speak(packet) {
    return new Promise((resolve, reject) => {
      if (!packet.q.text) return resolve(this._messages.notext);
      this.action('feature', 'speak');
      const agent = this.agent();

      this.state('get', 'speak:speech')
      this.question(`${this.askChr}open speech:${agent.profile.voice} ${decodeURI(packet.q.text)}`).then(speech => {
        this.state('resolve', 'speak');
        return resolve({
          text: speech.a.text,
          html: speech.a.html,
          data: speech.a.data,
        })
      }).catch(err => {
        this.state('reject', 'speak');
        return this.error(err, packet, reject);
      });
      //   this.state('get', 'speech');
      //   return
      // }).then(voice => {
      //   text.push(voice.a.text);
      //   data.voice = voice.a.data;

    });
  },

  /**************
  method: artist
  params: packet
  describe: this method provides a global artist method to all agents.
  ***************/
  art(packet) {
    return new Promise((resolve, reject) => {
      this.action('feature', 'services:art');

      const text = [];
      const data = {};
      const agent = this.agent();
      const client = this.client();
      const size = packet.q.meta.params[1] || 'square';
      if (!agent.profile.style) return resolve(this._messages.nostyle);
      this.state('get', 'image');
      const msg = [
        `style: ${agent.profile.style}`,
        `prompt: ${packet.q.text}`,
      ].join('\n');
      this.question(`${this.askChr}open image:${size} ${msg}`).then(painting => {
        data.patining = painting.a.data.image;

        this.state('set', 'history');
        this.vars.art.history.push(painting.a.text);

        return resolve({
          text: painting.a.text,
          html: painting.a.html,
          data,
        });
      }).catch(err => {
        console.log('ERROR', err);
        return this.error(packet, err, reject);
      });
    });
  },

  /**************
  method: reply
  params: packet
  describe: this method is a feature that allows each agent to reply to messages
  with their specific features.  if a header is supplied in the request then
  it will be added to the data.
  ***************/
  reply(packet) {
    return new Promise((resolve, reject) => {
      if (!this.vars.reply) return resolve('NO REPLY');
      this.context('reply')
      const agent = this.agent();
      const client = this.client();
      const {admin} = this.services().global;

      const {author} = packet.q.data;

      const profile = [
        `::begin:admin:${admin.id}`,
        `id: ${admin.id}`,
        `name: ${admin.name}`,
        `roles: ${admin.roles}`,
        `disclaimer: For Admin use only.`,
        `::end:admin`,
        `::begin:user:${client.id}`,
        `id: ${client.id}`,
        `name: ${client.profile.name}`,
        `nickname: ${client.profile.nickname}`,
        `describe: ${client.profile.describe}`,
        `::end:user`
      ];

      profile.push(`::begin:assistant`);
      for (let x in agent.profile) {
        profile.push(`${x}: ${agent.profile[x]}`);
      }
      profile.push(`::end:assistant`);

      this.question(`${this.askChr}docs view devas/${this.vars.reply.profile}:corpus`).then(doc => {
        const data = {
          model: agent.model || false,
          header: packet.q.data.header || false,
          profile: profile.join('\n'),
          corpus: doc.a.text,
          history: this.vars.reply.history.slice(-5),
        };
        const msg = [
          packet.q.text,
          `important: Respond in ${this.vars.reply.words} words or less.`,
        ].join('\n');

        return this.question(`${this.askChr}open relay ${msg}`, data);
      }).then(chat => {
        this.vars.reply.history.push({
          role: chat.a.data.chat.role,
          content: chat.a.data.chat.text,
        });
        return resolve({
          text: chat.a.text,
          html: chat.a.html,
          data: chat.a.data,
        });
      }).catch(err => {
        return this.error(packet, err, reject);
      });
    });
  },
};
