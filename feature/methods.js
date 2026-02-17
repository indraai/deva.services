"use strict";
// Copyright ©2025 Quinn A Michaels; All rights reserved. 
// Legal Signature Required For Lawful Use.
// Distributed under VLA:59232188337076320338 LICENSE.md

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
      
      let doc = false;
      try {
        const doc_file = this.lib.fs.readFileSync(docPath, 'utf8');  
        doc = doc_file.split(`::BEGIN:${part}`)[1].split(`::END:${part}`)[0];
      } catch (err) {
        return this.err(err, packet, reject);
      }
            
      this.question(`${this.askChr}feecting parse ${doc}`, {vars:this.vars}).then(feecting => {
        this.state('resolve', `view:${packet.q.text}`);
        return resolve({
          text: feecting.a.text,
          html: feecting.a.html,
          data: feecting.a.data,
        });
      }).catch(err => {
        this.state('reject', `file:${packet.q.text}`);
        return this.err(err, packet, reject);
      })
    });
  },    
};
