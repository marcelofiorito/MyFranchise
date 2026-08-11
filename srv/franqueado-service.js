'use strict';
const cds = require('@sap/cds');

// FranqueadoService — read-through from RUNMYFRANCHISE_MF via synonyms.
// Store filtering is handled by the frontend via $filter=STORE_ID eq '...'
module.exports = class FranqueadoService extends cds.ApplicationService {};
