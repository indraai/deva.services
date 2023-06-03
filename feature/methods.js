module.exports = {
  /**************
  method: service
  params: packet
  describe: The global service feature that installs with every agent
  ***************/
  services(packet) {
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
  /**************
  method: uid
  params: packet
  describe: Return a system id to the user from the Log Buddy.
  ***************/
  uid(packet) {
    this.context('uid');
    return Promise.resolve(this.uid());
  },
};
