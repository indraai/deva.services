function buildProfile(entity, type='assistant') {
  const _profile = [];
  _profile.push(`::begin:${type}:${entity.id}`);
  for (let x in entity.profile) {
    _profile.push(`${x}: ${entity.profile[x]}`);
  }
  _profile.push(`::end:${type}:${entity.hash}\n`);
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
    return new Promise((resolve, reject) => {
      const services = this.services();
      const agent = this.agent();
      const global = [];
      services.global.forEach((item,index) => {
        global.push(`::begin:global:${item.key}:${item.id}`);
        for (let x in item) {
          global.push(`${x}: ${item[x]}`);
        }
        global.push(`::end:global:${item.key}:${this.lib.hash(item)}`);
      });
      const concerns = [];
      services.concerns.forEach((item, index) => {
        concerns.push(`${index + 1}. ${item}`);
      })
      
      const info = [
        '::BEGIN:SERVICES',
        '### Client',
        `::begin:client:${services.client_id}`,
        `id: ${services.client_id}`,
        `client: ${services.client_name}`,
        '**concerns**',
        concerns.join('\n'),
        `::end:client:${this.lib.hash(services)}`,
        '### Global',
        global.join('\n'),
        '::END:SERVICES'
      ].join('\n');
      this.question(`${this.askChr}feecting parse ${info}`).then(feecting => {
        return resolve({
          text: feecting.a.text,
          html: feecting.a.html,
          data: services.concerns,
        });
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
  async ask(packet) {
    this.context('chat', packet.q.agent.name);
    this.action('feature', 'chat');
    return new Promise((resolve, reject) => {
      if (!this.vars.ask) return resolve('Ask not configured.');
      const askAgent = packet.q.meta.params[1] ? false : true;
      const text = [];
      const data = {};
      const agent = this.agent();
      const client = this.client();
      const info = this.info();

      agent.hash = this.lib.hash(agent.profile);
      client.hash = this.lib.hash(client.profile);
  
        // get the agent main help file for teir corpus.
      this.state('get', 'chat:help');
      this.help('main', info.dir).then(corpus => {        
        data.corpus = corpus;
        this.state('get', 'ask:chat');
        return this.question(`${this.askChr}chat relay ${packet.q.text}`, {
          model: agent.model || false,
          client: buildProfile(client, 'client'),
          agent: buildProfile(agent, 'agent'),
          corpus,
          max_tokens: this.vars.ask.max_tokens,
          history: this.vars.ask.history.slice(-10),
          memory: agent.key,
          askAgent,
        });
      }).then(answer => {
        text.push(`::begin:${agent.key}:${answer.id}`);
        text.push(answer.a.text);
        text.push(`::end:${agent.key}:${this.lib.hash(answer.a.text)}`);
        data.chat = answer.a.data.chat;  
  
        // memory event
        this.talk('data:memory', {
          id: answer.a.data.chat.id,
          client,
          agent,
          q: packet.q.text,
          a: answer.a.data.chat.text,
          created: Date.now(),
        });
  
        this.state('set', 'chat:history');
        this.vars.ask.history.push({
          role: 'user',
          content: this.lib.trimWords(answer.q.text, 100),
        });
  
        this.vars.ask.history.push({
          role: answer.a.data.chat.role,
          content: this.lib.trimWords(answer.a.data.chat.text, 100),
        });
  
        this.state('parse', 'ask:chat');
        return this.question(`${this.askChr}feecting parse ${text.join('\n')}`);
      }).then(feecting => {
        data.feecting = feecting.a.data;
        this.state('resolve', 'chat');
        return resolve({
          text: data.chat.text,
          html: feecting.a.html,
          data,
        });
      }).catch(err => {
        console.log('CHAT ERROR', err);
        this.state('reject', 'chat');
        return this.error(packet, err, reject);
      });
    });
  },
};
