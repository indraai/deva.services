// Copyright (c)2023 Quinn Michaels
// Services Deva
// The Services Deva manages various @SERVICES requests in deva.world.
const Deva = require('@indra.ai/deva');
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
const {agent,vars} = require('./data.json').DATA;
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
  func: {},
  methods: {},
  onError(err) {
    console.log('ERR', err);
  }
});
module.exports = SERVICES
