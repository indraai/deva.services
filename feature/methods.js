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
        return resolve({
          text: feecting.a.text,
          html: feecting.a.html,
          data: services
        });
      }).catch(err => {
        return this.error(err, packet, reject);
      })
    });
  },
  live(packet) {
    return new Promise((resolve, reject) => {

      if (!this.vars.live) return resolve('NO LIVE');
      const agent = this.agent();
      const profile = [];
      profile.push(`::begin:profile`);
      for (let x in agent.profile) {
        profile.push(`${x}: ${agent.profile[x]}`);
      }
      profile.push(`::end:profile\n`);

      this.question(`${this.askChr}docs view devas/${this.vars.live.profile}:corpus`).then(corpus => {
        const msg = [
          `question: ${packet.q.text}`,
          'respond: 20 words or less.',
        ].join('\n');

        return this.question(`${this.askChr}open relay ${msg}`, {
          profile: profile.join('\n'),
          corpus: corpus.a.text,
          history: this.vars.live.history.slice(-10),
        });
      }).then(chat => {
        this.vars.live.history.push({
          role: chat.a.data.role,
          content: chat.a.data.text,
        });
        return this.question(`${this.askChr}youtube chat:${this.vars.live.profile} ${chat.a.text.substr(0, 199)}`);
      }).then(answer => {
        return resolve({
          text: answer.a.text,
          html: answer.a.html,
          data: answer.a.data,
        });
      }).catch(err => {
        console.log('THERE WAS AN ERROR', err);
        return this.error(packet, err, reject);
      });
    });
  },
  say(packet) {
    return new Promise((resolve, reject) => {
      if (!this.vars.say) return resolve('NO SAY');

      const agent = this.agent();
      const profile = [];
      profile.push(`::begin:profile`);
      for (let x in agent.profile) {
        profile.push(`${x}: ${agent.profile[x]}`);
      }
      profile.push(`::end:profile\n`);

      this.question(`${this.askChr}docs view devas/${this.vars.say.profile}:corpus`).then(doc => {
        const msg = [
          `question: ${packet.q.text}`,
          'respond: 200 words or less',
        ].join('\n');
        return this.question(`${this.askChr}open chat ${packet.q.text}`, {
          model: agent.model || false,
          profile: profile.join('\n'),
          corpus: doc.a.text,
          history: this.vars.say.history.slice(-5),
        });
      }).then(chat => {
        this.vars.say.history.push({
          role: chat.a.data.chat.role,
          content: chat.a.data.chat.text,
        });
        return resolve({
          text: chat.a.text,
          html: chat.a.html,
          data: chat.a.data,
        });
      }).catch(err => {
        console.log('THERE WAS AN ERROR', err);
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
      if (!this.vars.say) return resolve('NO SAY');

      const agent = this.agent();
      const profile = [];

      profile.push(`::begin:profile`);
      for (let x in agent.profile) {
        profile.push(`${x}: ${agent.profile[x]}`);
      }
      profile.push(`::end:profile`);

      const msg = [
        `question: ${packet.q.text}`,
        'respond: 200 words or less',
      ].join('\n');


      this.question(`${this.askChr}docs view devas/${this.vars.say.profile}:corpus`).then(doc => {
        const data = {
          header: packet.q.data.header || false,
          profile: profile.join('\n'),
          corpus: doc.a.text,
          history: this.vars.say.history.slice(-5),
        };
        return this.question(`${this.askChr}open relay ${msg}`, data);
      }).then(chat => {
        this.vars.say.history.push({
          role: chat.a.data.role,
          content: chat.a.data.text,
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
