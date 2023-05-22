// Copyright (c)2023 Quinn Michaels
// Services Deva test file

const {expect} = require('chai')
const ServicesDeva = require('./index.js');

describe(ServicesDeva.me.name, () => {
  beforeEach(() => {
    return ServicesDeva.init()
  });
  it('Check the DEVA Object', () => {
    expect(ServicesDeva).to.be.an('object');
    expect(ServicesDeva).to.have.property('agent');
    expect(ServicesDeva).to.have.property('vars');
    expect(ServicesDeva).to.have.property('listeners');
    expect(ServicesDeva).to.have.property('methods');
    expect(ServicesDeva).to.have.property('modules');
  });
})
