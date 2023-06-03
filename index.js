// Copyright (c)2023 Quinn Michaels
// Services Deva
// The Services Deva manages various @SERVICES requests in deva.world.
const Deva = require('@indra.ai/deva');
const fs = require('fs');
const path = require('path');
const package = require('./package.json');
const info = {
  id: package.id,
  name: package.name,
  describe: package.description,
  version: package.version,
  dir: __dirname,
  url: package.homepage,
  git: package.repository.url,
  bugs: package.bugs.url,
  author: package.author,
  license: package.license,
  copyright: package.copyright,
};
const data_path = path.join(__dirname, 'data.json');
const {agent,vars} = require(data_path).DATA;

const SERVICES = new Deva({
  info,
  agent,
  vars,
  utils: {
    translate(input) {return input.trim();},
    parse(input) {return input.trim();},
    proecess(input) {return input.trim();}
  },
  listeners: {},
  modules: {},
  deva: {},
  func: {
    ser_question(packet) {return;},
    ser_answer(packet) {return;},
  },
  methods: {},
  onDone(data) {
    this.listen('devacore:question', this.func.ser_question);
    this.listen('devacore:answer', packet => this.func.ser_answer);
    return Promise.resolve(data);
  },
});
module.exports = SERVICES
