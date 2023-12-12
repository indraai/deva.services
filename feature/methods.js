function buildProfile(profile) {
  const _profile = [];
  _profile.push(`::begin:profile`);
  for (let x in profile) {
    _profile.push(`${x}: ${profile[x]}`);
  }
  _profile.push(`::end:profile\n`);
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
  live(packet) {
    return new Promise((resolve, reject) => {
      if (!this.vars.live) return resolve('NO LIVE');
      const agent = this.agent();
      const client = this.client();
      const profile = buildProfile(agent.profile);
      const data = {};
      const text = [];

      const msg = [
        packet.q.text,
        `important: Respond in ${this.vars.live.words} words or less.`,
      ].join('\n');

      this.question(`${this.askChr}docs view devas/${agent.key}:corpus`).then(corpus => {
        data.corpus = corpus.a.data;

        return this.question(`${this.askChr}open relay ${msg}`, {
          model: agent.model || false,
          profile,
          corpus: corpus.a.text,
          max_tokens: this.vars.ask.max_tokens,
          history: this.vars.live.history.slice(-10),
        });
      }).then(chat => {
        data.chat = chat.a.data.chat;

        // memory event
        this.talk('data:memory', {
          id: chat.a.data.chat.id,
          client,
          agent,
          q: packet.q.text,
          a: chat.a.data.chat.text,
          created: Date.now(),
        });

        this.vars.live.history.push({
          role: chat.a.data.chat.role,
          content: chat.a.data.chat.text,
        });
        text.push(chat.a.data.parsed);
        return this.question(`${this.askChr}youtube chat:${this.vars.live.profile} ${chat.a.text.substr(0, 199)}`);
      }).then(youtube => {
        data.youtube = youtube.a.data;
        return this.question(`${this.askChr}feecting parse ${text.join('\n')}`);
      }).then(feecting => {
        return resolve({
          text: feecting.a.text,
          html: feecting.a.html,
          data,
        });
      }).catch(err => {
        return this.error(packet, err, reject);
      });
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
  ask(packet) {
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
          corpus: doc.a.text,
          max_tokens: this.vars.ask.max_tokens,
          history: this.vars.ask.history.slice(-10),
          memory: agent.key,
          askAgent,
        });
      }).then(chat => {
        text.push(chat.a.data.parsed);

        // memory event
        this.talk('data:memory', {
          id: chat.a.data.chat.id,
          client,
          agent,
          q: packet.q.text,
          a: chat.a.data.chat.text,
          created: Date.now(),
        });

        if (chat.a.text) {
          text.push('::begin:buttons');
          text.push(`button[🗣️ Speak]:${this.askChr}${agent.key} speak ${encodeURI(chat.a.text)}`);
          text.push(`button[🎨 Art]:${this.askChr}${agent.key} art ${encodeURI(chat.a.text)}`);
          text.push('::end:buttons');
        }

        data.chat = chat.a.data.chat;

        this.state('set', 'ask:history');
        this.vars.ask.history.push({
          role: chat.a.data.chat.role,
          content: chat.a.data.chat.text,
        });

        this.state('parse', 'ask:chat');
        return this.question(`${this.askChr}feecting parse ${text.join('\n')}`);
      }).then(feecting => {
        data.feecting = feecting.a.data;
        this.state('resolve', 'ask');
        return resolve({
          text: feecting.a.text,
          html: feecting.a.html,
          data,
        });
      }).catch(err => {
        this.state('reject', 'ask');
        console.log('ASK ERROR', err);
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
      const client = this.client();
      const info = this.info();
      let corpus = false;

      this.state('set', 'docs:text');
      const text = [
        `::begin:user:${client.id}`,
        `id: ${client.id}`,
        `name: ${client.profile.nickname}`,
        `fullname: ${client.profile.name}`,
        `date: ${this.formatDate(Date.now(), 'long', true)}`,
        `::end:user`,
      ];

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
  method: livechat
  params: packet
  describe: this method provides a global ask method to all agents to respond to Youtube live streams.
  ***************/
  livechat(packet) {
    this.action('feature', 'ask');
    return new Promise((resolve, reject) => {
      if (!this.vars.ask) return resolve('NO ASK');
      const text = [];
      const data = {};
      const agent = this.agent();
      const client = this.client();
      const info = this.info();
      const {admin} = this.services().global;

      this.state('set', 'message');
      const msg = [
        `info: We are reviewing the latest chats from our live stream.`,
      ];

      // get the agent main help file for teir corpus.
      this.state('get', 'livechat:chats');
      this.question(`${this.askChar}youtube chats:10`).then(chats => {
        data.youtube = chats.a.data;
        console.log('CHATS LIVE', chats.a.data);
        msg.push(chats.a.text);
        return this.help('main', info.dir);
      }).then(corpus => {
        this.action('parse', 'livechat:help');
        return this.question(`${this.askChr}feecting parse ${corpus}`);
      }).then(doc => {
        data.corpus = doc.a.data;
        this.state('get', 'livechat:chat');
        return this.question(`${this.askChr}open relay ${msg}`, {
          model: agent.model || false,
          corpus: doc.a.text,
          max_tokens: this.vars.ask.max_tokens,
          history: this.vars.ask.history.slice(-5),
        });
      }).then(chat => {
        text.push(chat.a.data.parsed);
        if (chat.a.text) {
          text.push('::begin:buttons');
          text.push(`button[🗣️ Speak]:${this.askChr}${agent.key} speak ${encodeURI(chat.a.text)}`);
          text.push(`button[🎨 Art]:${this.askChr}${agent.key} art ${encodeURI(chat.a.text)}`);
          text.push('::end:buttons');
        }

        data.chat = chat.a.data.chat;

        this.state('set', 'ask:history');
        this.vars.ask.history.push({
          role: chat.a.data.chat.role,
          content: chat.a.data.chat.text,
        });

        this.state('parse', 'ask:chat');
        return this.question(`${this.askChr}feecting parse ${text.join('\n')}`);
      }).then(feecting => {
        data.feecting = feecting.a.data;
        this.state('resolve', 'ask');
        return resolve({
          text: feecting.a.text,
          html: feecting.a.html,
          data,
        });
      }).catch(err => {
        this.state('reject', 'ask');
        console.log('ASK ERROR', err);
        return this.error(packet, err, reject);
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
