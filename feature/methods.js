function buildProfile(profile, type='assistant') {
  const _profile = [];
  _profile.push(`::begin:${type}`);
  for (let x in profile) {
    _profile.push(`${x}: ${profile[x]}`);
  }
  _profile.push(`::end:${type}\n`);
  return _profile.join('\n');
}
export default {
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
};
