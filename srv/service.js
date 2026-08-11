'use strict';
const cds = require('@sap/cds');

// All data is read directly from RUNMYFRANCHISE_MF via HANA synonyms.
// No write handlers, no simulations — pure read-through.
module.exports = class FranqueadoraService extends cds.ApplicationService {};
