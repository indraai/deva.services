module.exports = {
  /**************
  method: uid
  params: packet
  describe: Return a system id to the user from the Log Buddy.
  ***************/
  uid(packet) {
    this.context('uid');
    return Promise.resolve(this.uid());
  },
  /**************
  method: status
  params: packet
  describe: Return the current status of the Log Buddy.
  ***************/
  status(packet) {
    this.context('status');
    return Promise.resolve(this.status());
  },
  /**************
  method: info
  params: packet
  describe: Return the current info for the deva.
  ***************/
  info(packet) {
    return Promise.resolve(this.info);
  },
  /**************
  method: issue
  params: packet
  describe: create a new issue for the main deva.world through github agent.
  ***************/
  issue(packet) {
    return new Promise((resolve, reject) => {
      this.question(`#github create_issue:${packet.q.agent.key} ${packet.q.text}`).then(issue => {
        return resolve({
          text: issue.a.text,
          html: issue.a.html,
          data: issue.a.data,
        })
      }).catch(err => {
        return this.error(err, packet, reject);
      });
    });
  },
  /**************
  method: help
  params: packet
  describe: The Help method returns the information on how to use the Log Buddy.
  ***************/
  help(packet) {
    this.context('help');
    const {dir} = this.info();
    return new Promise((resolve, reject) => {
      this.help(packet.q.text, dir).then(help => {
        return this.question(`#feecting parse ${help}`);
      }).then(parsed => {
        return resolve({
          text: parsed.a.text,
          html: parsed.a.html,
          data: parsed.a.data,
        });
      }).catch(reject);
    });
  }
};
