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
        global.push(`::begin:${item.key}:${item.id}`);
        for (let x in item) {
          global.push(`${x}: ${item[x]}`);
        }
        const thehash = this.lib.hash(item);
        global.push(`hash: ${thehash}`);
        global.push(`::end:${item.key}:${thehash}`);
      });
      const concerns = [];
      services.concerns.forEach((item, index) => {
        concerns.push(`${index + 1}. ${item}`);
      })
      
      const info = [
        '::BEGIN:SERVICES',
        `::begin:client`,
        '## Client',
        `id: ${services.client_id}`,
        `client: ${services.client_name}`,
        `::end:client}`,
        concerns.length ? `::begin:concerns` : '',
        concerns.length ? '## Concerns' : '',
        concerns.length ? concerns.join('\n') : '',
        concerns.length ? `::end:concerns` : '',
        '::begin:global',
        '## Global',
        global.join('\n'),
        '::end:global',
        '::END:SERVICES',
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
  method: file
  params: packet
  describe: The view method replays the request to the view function to return
  a document from the text parameter.
  ***************/
  file(packet) {      
    const agent = this.agent();
    this.zone('services');
    this.feature('services', `file:${packet.q.text}`);
    this.action('method', `file:${packet.q.text}`);
    this.context('file', packet.q.text);
    return new Promise((resolve, reject) => {
      this.state('get', packet.q.text);  
      const {text, meta} = packet.q;
      
      const splitText = text.split(':');
      const area = meta.params[1] ? meta.params[1] : 'public';
      const part = splitText[1] ? splitText[1].toUpperCase() : 'MAIN';
      const docName = splitText[0].length ? splitText[0] + '.feecting' : 'main.feecting';
      const docPath = this.lib.path.join(this.config.dir, area, agent.key, docName);         
      
      let doc;     
      try {
        doc = this.lib.fs.readFileSync(docPath, 'utf8');  
        doc = doc.split(`::BEGIN:${part}`)[1].split(`::END:${part}`)[0];
      } catch (err) {
        console.log(err);
      }
            
      this.question(`${this.askChr}feecting parse ${doc}`).then(feecting => {
        this.state('resolve', `view:${packet.q.text}`);
        return resolve({
          text: feecting.a.text,
          html: feecting.a.html,
          data: feecting.a.data,
        });
      }).catch(err => {
        this.state('reject', `file:${packet.q.text}`);
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
    this.zone('services', packet.id);
    this.feature('services', packet.id);
    this.context('ask', `${packet.q.agent.name}:${packet.id}`);
    this.action('services', `ask:${packet.id}`);
    const data = {};
    const agent = this.agent();
    const client = this.client();
    const info = this.info();

    this.state('get', `corpus:${packet.id}`);
    const help = await this.help('corpus', info.dir);

    return new Promise((resolve, reject) => {
      if (!this.vars.ask) return resolve('Ask not configured.');

        // get the agent main help file for teir corpus.
      this.question(`${this.askChr}feecting parse ${help}`).then(corpus => {
        data.corpus = corpus.a.text;
        this.state('get', 'ask:chat');
        return this.question(`${this.askChr}chat relay ${decodeURIComponent(packet.q.text)}`, {
          client: buildProfile(client, 'client'),
          agent: buildProfile(agent, 'agent'),
          corpus: corpus.a.text,
          max_tokens: this.vars.ask.max_tokens,
          history: this.vars.ask.history.slice(-10),
          memory: agent.key,
        });
      }).then(answer => {
        data.chat = answer.a.data.chat;  
        const text = [
          `::begin:${agent.key}:${answer.id}`,
          answer.a.text,
          `date: ${this.lib.formatDate(Date.now(), 'long', true)}`,
          `::end:${agent.key}:${this.lib.hash(answer)}`,
        ];
        this.state('set', `history:${packet.id}`);
        this.vars.ask.history.push({
          role: 'user',
          content: this.lib.trimWords(answer.q.text, 150),
        });
  
        this.vars.ask.history.push({
          role: answer.a.data.chat.role,
          content: this.lib.trimWords(answer.a.data.chat.text, 150),
        });
  
        this.state('parse', `ask:${packet.id}`);
        return this.question(`${this.askChr}feecting parse ${text.join('\n')}`);
      }).then(feecting => {
        data.feecting = feecting.a.data;
        this.state('resolve', `ask:${packet.id}`);
        return resolve({
          text: feecting.a.text,
          html: feecting.a.html,
          data,
        });
      }).catch(err => {
        this.state('reject', 'chat');
        return this.error(packet, err, reject);
      });
    });
  },
};
